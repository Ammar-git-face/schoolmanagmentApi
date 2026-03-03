const express = require('express');
const ptarouter = express.Router();

const ptaController = require('../controllers/ptaControleers');

ptarouter.post('/', ptaController.pta_post);
ptarouter.get('/get', ptaController.pta_get);
ptarouter.get('/stats' ,ptaController.pta_stats)

module.exports = ptarouter ;