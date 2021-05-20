const express = require('express');
const mongoose = require('mongoose');
const Messages = require('./dbMessages');
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
  const changeStream = mgsCollection.watch();

  changeStream.on('change', (change) => {
    console.log(change);
    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      pusher.trigger('messages', 'inserted', {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
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

// * Listening
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
