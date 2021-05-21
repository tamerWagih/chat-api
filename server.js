const express = require('express');
const mongoose = require('mongoose');
const Messages = require('./dbMessages');
const Rooms = require('./dbRooms');
const Pusher = require('pusher');
const cors = require('cors');

require('dotenv').config();

//* App config
const app = express();
const port = process.env.PORT || 3001;

const pusher = new Pusher({
  appId: '1206584',
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: 'eu',
  useTLS: true,
});

//* Middlewares
app.use(express.json());
app.use(cors());

//* DB Config
const connectionUrl = process.env.DB_URL;

mongoose.connect(connectionUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const db = mongoose.connection;
db.once('open', () => {
  console.log('DB Connected');
  const mgsCollection = db.collection('messagecontents');
  const roomCollection = db.collection('rooms');
  const messageStream = mgsCollection.watch();
  const roomStream = roomCollection.watch();

  messageStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      pusher.trigger('messages', 'inserted', {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        roomName: messageDetails.roomName,
      });
    } else {
      console.log('Error trigerring Pusher');
    }
  });

  roomStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      const roomDetails = change.fullDocument;
      pusher.trigger('rooms', 'inserted', {
        id: roomDetails._id,
        name: roomDetails.name,
      });
    } else {
      console.log('Error trigerring Pusher');
    }
  });
});

// * routes
app.get('/', (req, res) => {
  res.status(200).send('Api Working');
});

app.get('/messages/sync', (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.get('/messages/:roomName', (req, res) => {
  const roomName = req.params.roomName;
  Messages.find({ roomName }, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post('/messages/new', (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(`new message created: \n ${data}`);
    }
  });
});

app.get('/rooms/sync', (req, res) => {
  Rooms.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.get('/rooms/:roomId', (req, res) => {
  Rooms.findById({ _id: req.params.roomId }, (err, data) => {
    if (err) {
      res.status(404).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post('/rooms/new', (req, res) => {
  const newRoom = req.body;

  Rooms.create(newRoom, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(`New room created: \n ${data}`);
    }
  });
});

// * Listening
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
