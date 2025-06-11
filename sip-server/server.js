const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const esl = require('modesl');
const dbConfig = require('./config/db');
const callLogRoutes = require('./routes/callLogRoutes');
const sipUserRoutes = require('./routes/sipUserRoutes');
const CallLog = require('./models/CallLog');

const app = express();
const port = 5000;

// Middleware
app.use(bodyParser.json());
app.use('/api/call-logs', callLogRoutes);
app.use('/api/sip-users', sipUserRoutes);

// MongoDB Connection
mongoose.connect(dbConfig.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ MongoDB connected.");
}).catch(err => {
  console.error("❌ MongoDB connection error:", err);
});

// ESL (FreeSWITCH Event Socket)
const fsConnection = new esl.Connection('127.0.0.1', 8021, 'ClueCon', () => {
  console.log('📡 ESL connected to FreeSWITCH');

  // Proper subscription to all plain events
  fsConnection.events('plain', 'ALL');

  const activeCalls = new Map();

  // Log every event name
  fsConnection.on('esl::event::*', (evt) => {
    console.log('📥 Event:', evt.getHeader('Event-Name'));
  });

  fsConnection.on('esl::event::CHANNEL_ANSWER::*', (evt) => {
    const uuid = evt.getHeader('Unique-ID');
    const from = evt.getHeader('Caller-Caller-ID-Number');
    const to = evt.getHeader('Caller-Destination-Number');
    const startTime = new Date();

    activeCalls.set(uuid, { from, to, startTime });
    console.log(`📞 Call answered: ${from} ➡️ ${to}`);
  });

  fsConnection.on('esl::event::CHANNEL_HANGUP::*', async (evt) => {
    try {
      const uuid = evt.getHeader('Unique-ID');
      const hangupCause = evt.getHeader('Hangup-Cause');
      const endTime = new Date();

      const call = activeCalls.get(uuid);
      if (!call) return;

      const { from, to, startTime } = call;
      const duration = Math.floor((endTime - startTime) / 1000);

      let status = 'completed';
      if (hangupCause === 'NO_ANSWER' || hangupCause === 'ORIGINATOR_CANCEL') {
        status = 'missed';
      } else if (hangupCause !== 'NORMAL_CLEARING') {
        status = 'failed';
      }

      console.log({ uuid, from, to, startTime, endTime, duration, status });

      await new CallLog({
        _id: uuid,
        from,
        to,
        startTime,
        endTime,
        duration,
        status
      }).save();

      console.log(`📴 Call ended (${status}): ${from} ➡️ ${to} | Duration: ${duration}s`);
      activeCalls.delete(uuid);
    } catch (err) {
      console.error('❌ Error saving call log:', err.message);
    }
  });
});


                                        

// Start server
app.listen(port, () => {
  console.log(`🚀 FreeSWITCH Node.js server running at http://localhost:${port}`);
});
