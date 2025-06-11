const express = require('express');
const router = express.Router();
const callLogController = require('../controllers/callLogController');

router.post('/', callLogController.createCallLog);
router.get('/', callLogController.getAllCallLogs);

module.exports = router;