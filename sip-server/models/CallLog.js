const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Accept FreeSWITCH UUID as string ID
  from: { type: String, required: true },
  to: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number }, // in seconds
  status: {
    type: String,
    enum: ['completed', 'missed', 'failed'],
    default: 'completed'
  }
}, { timestamps: true });

module.exports = mongoose.model('CallLog', CallLogSchema);
