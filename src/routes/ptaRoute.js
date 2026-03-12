// const express = require('express')
// const ptarouter = express.Router()
// const pta = require('../controllers/ptaController')

// ptarouter.post('/', pta.create_meeting)
// ptarouter.get('/get', pta.get_meetings)
// ptarouter.get('/stats', pta.get_stats)
// ptarouter.put('/complete/:id', pta.complete_meeting)
// ptarouter.delete('/:id', pta.delete_meeting)

// module.exports = ptarouter

const express    = require('express')
const ptarouter  = express.Router()
const {
    create_meeting,
    get_meetings,
    get_stats,
    complete_meeting,
    delete_meeting
} = require('../controllers/ptaController')

ptarouter.post('/',              create_meeting)
ptarouter.get('/get',            get_meetings)
ptarouter.get('/stats',          get_stats)
ptarouter.put('/complete/:id',   complete_meeting)
ptarouter.delete('/:id',         delete_meeting)

module.exports = ptarouter