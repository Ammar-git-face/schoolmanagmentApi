const mongoose = require('mongoose')
const Message  = require('../models/Message')
const Admin    = require('../models/admin')
const Teacher  = require('../models/Teachers')
const Parent   = require('../models/parent')
const Student  = require('../models/student')

const getConversationId = (id1, id2) => [String(id1), String(id2)].sort().join('_')

// Helper: map DB doc → clean contact object
// Handles both 'fullname' and 'name' fields across old + new records
const toContact = (doc, role) => ({
    _id:   doc._id,
    name:  doc.fullname || doc.name || `${role} user`,
    email: doc.email || '',
    role,
})

// GET /messages/contacts/:userId
exports.get_contacts = async (req, res) => {
    try {
        const { userId } = req.params
        const sc = req.schoolCode

        if (!sc) return res.status(400).json({ error: 'No school code on request' })

        // Determine who is asking
        let currentUser = null, role = null
        currentUser = await Admin.findById(userId).lean()
        if (currentUser) role = 'admin'
        if (!currentUser) { currentUser = await Teacher.findById(userId).lean(); if (currentUser) role = 'teacher' }
        if (!currentUser) { currentUser = await Parent.findById(userId).lean();  if (currentUser) role = 'parent' }
        if (!currentUser) return res.status(404).json({ error: 'User not found' })

        let contacts = []

        if (role === 'admin') {
            const teachers = await Teacher.find({ schoolCode: sc }, 'fullname name email').lean()
            const parents  = await Parent.find({  schoolCode: sc }, 'fullname name email').lean()
            contacts = [
                ...teachers.map(t => toContact(t, 'teacher')),
                ...parents.map(p  => toContact(p, 'parent')),
            ]
        }
        else if (role === 'teacher') {
            const admins       = await Admin.find({ schoolCode: sc }, 'fullname name email').lean()
            const teacherData  = await Teacher.findById(userId, 'assignedClasses').lean()
            const classNames   = (teacherData?.assignedClasses || []).map(c => c.className).filter(Boolean)

            let parentContacts = []
            if (classNames.length > 0) {
                const students  = await Student.find({ studentClass: { $in: classNames }, schoolCode: sc }, 'parentId').lean()
                const parentIds = [...new Set(students.map(s => s.parentId?.toString()).filter(Boolean))]
                if (parentIds.length > 0) {
                    const parents = await Parent.find({ _id: { $in: parentIds }, schoolCode: sc }, 'fullname name email').lean()
                    parentContacts = parents.map(p => toContact(p, 'parent'))
                }
            }
            contacts = [...admins.map(a => toContact(a, 'admin')), ...parentContacts]
        }
        else if (role === 'parent') {
            const admins       = await Admin.find({ schoolCode: sc }, 'fullname name email').lean()
            const children     = await Student.find({ parentId: userId, schoolCode: sc }, 'studentClass').lean()
            const childClasses = [...new Set(children.map(c => c.studentClass).filter(Boolean))]

            let teacherContacts = []
            if (childClasses.length > 0) {
                const teachers = await Teacher.find({ 'assignedClasses.className': { $in: childClasses }, schoolCode: sc }, 'fullname name email').lean()
                teacherContacts = teachers.map(t => toContact(t, 'teacher'))
            }
            contacts = [...admins.map(a => toContact(a, 'admin')), ...teacherContacts]
        }

        // Attach last message + unread count per contact
        const contactsWithMeta = await Promise.all(contacts.map(async (contact) => {
            const conversationId = getConversationId(userId, contact._id)
            const lastMsg = await Message.findOne({ conversationId }, null, { sort: { createdAt: -1 } }).lean()
            const unread  = await Message.countDocuments({ conversationId, receiverId: String(userId), read: false })
            return { ...contact, lastMessage: lastMsg?.message || '', lastMessageTime: lastMsg?.createdAt || null, unreadCount: unread }
        }))

        // Sort: unread first, then by last message time
        contactsWithMeta.sort((a, b) => {
            if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount
            if (!a.lastMessageTime) return 1
            if (!b.lastMessageTime) return -1
            return new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        })

        res.json(contactsWithMeta)
    } catch (err) {
        console.error('get_contacts error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// GET /messages/:userId/:otherId
exports.get_messages = async (req, res) => {
    try {
        const { userId, otherId } = req.params
        const messages = await Message.find({ conversationId: getConversationId(userId, otherId) }).sort({ createdAt: 1 }).lean()
        res.json(messages)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /messages/
exports.send_message = async (req, res) => {
    try {
        const { senderId, senderName, senderRole, receiverId, receiverName, receiverRole, message } = req.body
        if (!senderId || !receiverId || !message?.trim()) return res.status(400).json({ error: 'senderId, receiverId and message are required' })
        if (!senderName) return res.status(400).json({ error: 'senderName is required' })
        const newMessage = await Message.create({
            conversationId: getConversationId(senderId, receiverId),
            senderId, senderName, senderRole,
            receiverId, receiverName, receiverRole,
            message: message.trim(),
            schoolCode: req.schoolCode,
        })
        res.status(201).json(newMessage)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /messages/read/:userId/:otherId
exports.mark_read = async (req, res) => {
    try {
        const { userId, otherId } = req.params
        await Message.updateMany(
            { conversationId: getConversationId(userId, otherId), receiverId: String(userId), read: false },
            { read: true }
        )
        res.json({ message: 'Marked as read' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /messages/unread/:userId
exports.get_unread_count = async (req, res) => {
    try {
        const count = await Message.countDocuments({ receiverId: String(req.params.userId), read: false })
        res.json({ unreadCount: count })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}