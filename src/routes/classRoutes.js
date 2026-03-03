const express = require('express');
const classroute = express.Router();
const classControllers = require('../controllers/classControllers');

classroute.post('/', classControllers.class_post);
classroute.get('/', classControllers.class_get);
classroute.delete('/:id' ,classControllers.class_delete )
classroute.put('/:id' , classControllers.class_update )

//classroute.get('/getAll', classControllers.class_getAll);

module.exports = classroute;