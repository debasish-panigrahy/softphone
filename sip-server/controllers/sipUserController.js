const SIPUser = require('../models/SIPUser');

exports.createSIPUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await SIPUser.findOne({ username });
        if (existing) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = new SIPUser({ username, password });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSIPUser = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await SIPUser.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.directoryXML = async (req, res) => {
    try {
        const userParam = req.query.user;
        const domainParam = req.query.domain;

        const user = await SIPUser.findOne({ username: userParam });
        if (!user) {
            return res.status(404).send("User not found");
        }

        const xml = `
<document type="freeswitch/xml">
  <section name="directory">
    <domain name="${domainParam}">
      <user id="${user.username}">
        <params>
          <param name="password" value="${user.password}"/>
          <param name="vm-password" value="${user.password}"/>
        </params>
        <variables>
          <variable name="accountcode" value="${user.username}"/>
          <variable name="user_context" value="default"/>
        </variables>
      </user>
    </domain>
  </section>
</document>`;
        res.type('application/xml').send(xml);
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};