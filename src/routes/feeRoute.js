const express = require('express')
const feeRouter = express.Router()
const feeController = require('../controllers/feeController')

feeRouter.post('/create', feeController.create_fee)
// feeRouter.post('/student', feeController.)
feeRouter.post('/initialize', feeController.initialize_payment)
feeRouter.post('/verify', feeController.verify_payment)
feeRouter.get('/parent/:parentId', feeController.get_fees_by_parent)
feeRouter.get('/all', feeController.get_all_fees)
feeRouter.post('/pay-salary', feeController.pay_teacher_salary)
feeRouter.get('/banks', feeController.get_banks)

// newly added
feeRouter.post('/save-bank-details', feeController.save_bank_details)
feeRouter.get('/bank-details',       feeController.get_bank_details)
feeRouter.post('/resolve-account', feeController.resolve_account)

module.exports = feeRouter