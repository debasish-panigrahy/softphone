const CallLog = require('../models/CallLog');

// ✅ Create a new Call Log
exports.createCallLog = async (req, res) => {
    try {
        const { uuid, from, to, startTime, endTime, duration, status } = req.body;

        const callLog = new CallLog({
            _id: uuid, // UUID used as _id
            from,
            to,
            startTime,
            endTime,
            duration,
            status
        });

        await callLog.save();
        res.status(201).json(callLog);
    } catch (err) {
        console.error('❌ Error creating call log:', err);
        res.status(500).json({ error: err.message });
    }
};

// ✅ Get all Call Logs (sorted by latest)
exports.getAllCallLogs = async (req, res) => {
    try {
        const callLogs = await CallLog.find().sort({ createdAt: -1 });
        res.status(200).json(callLogs);
    } catch (err) {
        console.error('❌ Error fetching call logs:', err);
        res.status(500).json({ error: err.message });
    }
};
