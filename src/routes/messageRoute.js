const express = require('express')
const msgrouter = express.Router()
const messageController = require('../controllers/messageController')

// specific routes first
msgrouter.get('/contacts/:userId', messageController.get_contacts)
msgrouter.get('/unread/:userId', messageController.get_unread_count)
msgrouter.put('/read/:userId/:otherId', messageController.mark_read)
msgrouter.post('/', messageController.send_message)

// dynamic route last
msgrouter.get('/:userId/:otherId', messageController.get_messages)

module.exports = msgrouter