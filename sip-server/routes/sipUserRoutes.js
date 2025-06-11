const express = require('express');
const router = express.Router();
const sipUserController = require('../controllers/sipUserController');

router.post('/', sipUserController.createSIPUser);
router.get('/:username', sipUserController.getSIPUser);
router.get('/directory/xml', sipUserController.directoryXML);

module.exports = router;