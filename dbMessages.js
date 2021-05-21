const mongoose = require('mongoose');

const messageContentSchema = mongoose.Schema({
  message: String,
  name: String,
  timestamp: { type: Date, default: Date.now },
  roomName: String,
});

module.exports = mongoose.model('messageContent', messageContentSchema);
