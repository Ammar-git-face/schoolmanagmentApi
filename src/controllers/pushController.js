// src/controllers/pushController.js
const webpush   = require("web-push")
const PushSub   = require("../models/PushSubscription")

// ── VAPID keys — generate ONCE and put in .env ────────────────────────────
// Run this in terminal to generate:
//   node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k)"
// Then add to .env:
//   VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   VAPID_EMAIL=mailto:your@email.com

// ✅ Lazy init — only set VAPID details when keys are actually present
// This prevents the crash on startup when keys aren't in .env yet
const initVapid = () => {
    const pub  = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    const mail = process.env.VAPID_EMAIL || "mailto:admin@edumanage.ng"
    if (pub && priv) {
        webpush.setVapidDetails(mail, pub, priv)
        return true
    }
    return false
}

// ── GET /push/vapid-public-key ────────────────────────────────────────────
exports.getVapidKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY
    if (!key) return res.status(500).json({
        error: "VAPID keys not configured. Run: npx web-push generate-vapid-keys in your backend folder, then add them to .env"
    })
    res.json({ publicKey: key })
}

// ── POST /push/subscribe ──────────────────────────────────────────────────
exports.subscribe = async (req, res) => {
    try {
        const { subscription, role, schoolCode, userId } = req.body
        if (!subscription?.endpoint) return res.status(400).json({ error: "Invalid subscription" })

        await PushSub.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            { subscription, role, schoolCode, userId, updatedAt: new Date() },
            { upsert: true, new: true }
        )
        res.json({ message: "Subscribed to push notifications" })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── POST /push/unsubscribe ────────────────────────────────────────────────
exports.unsubscribe = async (req, res) => {
    try {
        await PushSub.deleteOne({ endpoint: req.body.endpoint })
        res.json({ message: "Unsubscribed" })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── UTILITY: Send push to everyone in a school ────────────────────────────
// Call this from any controller to trigger push to a role
// e.g. sendPushToSchool({ schoolCode, role:"parent", title:"New Result", body:"Term 1 results are ready", url:"/component/parent/result" })
exports.sendPushToSchool = async ({ schoolCode, role, title, body, url, icon, requireInteraction = false }) => {
    try {
        if (!initVapid()) {
            console.warn("Push skipped: VAPID keys not set in .env")
            return { sent: 0, failed: 0 }
        }
        const query = { schoolCode }
        if (role) query.role = role

        const subs = await PushSub.find(query).lean()
        if (!subs.length) return { sent: 0, failed: 0 }

        const payload = JSON.stringify({ title, body, url: url || "/", icon, requireInteraction })

        let sent = 0, failed = 0
        await Promise.allSettled(
            subs.map(async (s) => {
                try {
                    await webpush.sendNotification(s.subscription, payload)
                    sent++
                } catch (err) {
                    failed++
                    // Remove stale subscriptions (410 = Gone, 404 = Not Found)
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await PushSub.deleteOne({ endpoint: s.endpoint })
                    }
                }
            })
        )
        console.log(`Push sent to ${schoolCode}/${role}: ${sent} ok, ${failed} failed`)
        return { sent, failed }
    } catch (err) {
        console.error("sendPushToSchool error:", err.message)
        return { sent: 0, failed: 0 }
    }
}

// ── UTILITY: Send push to specific user ──────────────────────────────────
exports.sendPushToUser = async ({ userId, title, body, url }) => {
    try {
        const subs = await PushSub.find({ userId: String(userId) }).lean()
        const payload = JSON.stringify({ title, body, url: url || "/" })
        await Promise.allSettled(
            subs.map(s => webpush.sendNotification(s.subscription, payload).catch(() =>
                PushSub.deleteOne({ endpoint: s.endpoint })
            ))
        )
    } catch (err) {
        console.error("sendPushToUser error:", err.message)
    }
}