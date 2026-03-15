const express = require('express')
const routes  = express.Router()
const authController = require('../controllers/authControllers')
const { attachSchool } = require('../middlewares/schoolMiddleware.js')

// ── Admin ──────────────────────────────────────────────────────────────────
routes.post('/admin/register',                          authController.admin_register)
routes.post('/admin/login',                             authController.admin_login)
routes.put('/admin/change-password', attachSchool,      authController.adminChangePassword)

// ── Teacher ────────────────────────────────────────────────────────────────
routes.post('/teacher/create-account',                  authController.teacher_create_account)
routes.post('/teacher/login',                           authController.teacher_Login)

// ── Parent ─────────────────────────────────────────────────────────────────
routes.post('/parent/generate-code',                    authController.parent_generate_code)
routes.post('/parent/register',                         authController.parent_register)  // ✅ single route — removed duplicate
routes.post('/parent/login',                            authController.parent_Login)

// ── Profile updates ────────────────────────────────────────────────────────
routes.put('/teacher/update/:id',                       authController.teacher_update)
routes.put('/parent/update/:id',                        authController.parent_update)

// ── Shared ─────────────────────────────────────────────────────────────────
routes.get('/me',                                       authController.get_me)
routes.post('/logout',                                  authController.logout)

module.exports = routes