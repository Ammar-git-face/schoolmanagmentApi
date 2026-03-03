const express = require('express')
const resultRouter = express.Router()
const resultController = require('../controllers/resultsControllers')

resultRouter.post('/' , resultController.result_post);
resultRouter.get('/' , resultController.result_get);
resultRouter.put('/:id', resultController.result_put)
resultRouter.delete('/:id', resultController.result_delete)

module.exports = resultRouter