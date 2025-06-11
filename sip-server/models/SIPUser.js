const mongoose = require('mongoose');

const SIPUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    domain: { type: String, default: 'yourdomain.com' }, // Change to your actual domain
}, { timestamps: true });

module.exports = mongoose.model('SIPUser', SIPUserSchema);