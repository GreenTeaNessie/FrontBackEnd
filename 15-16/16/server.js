const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const vapidKeys = {
  publicKey: 'BEGsNyM3KrnEvThLTkxxnoCM8HDttilprHuMvSVa0B37cPpX-i2aQvkcsatEa08RmsYq0NL3QTF1JmVgxrYkiz8',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'Gps_3XOcN5X997L0R4IqpZgW99wz2pWqYHAqj46Rrx4'
};

webpush.setVapidDetails(
  'mailto:student@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let subscriptions = [];

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

function addSubscription(subscription) {
  subscriptions = subscriptions.filter(item => item.endpoint !== subscription.endpoint);
  subscriptions.push(subscription);
}

function removeSubscription(endpoint) {
  subscriptions = subscriptions.filter(item => item.endpoint !== endpoint);
}

function sendPush(payload) {
  subscriptions.forEach(subscription => {
    webpush.sendNotification(subscription, JSON.stringify(payload)).catch(error => {
      if (error.statusCode === 404 || error.statusCode === 410) {
        removeSubscription(subscription.endpoint);
      } else {
        console.error('Push error:', error.message);
      }
    });
  });
}

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  socket.on('newTask', task => {
    const normalizedTask = {
      text: String(task.text || '').slice(0, 240),
      timestamp: task.timestamp || Date.now()
    };

    io.emit('taskAdded', normalizedTask);
    sendPush({
      title: 'Новая заметка',
      body: normalizedTask.text
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.post('/subscribe', (req, res) => {
  addSubscription(req.body);
  res.status(201).json({ message: 'Subscription saved' });
});

app.post('/unsubscribe', (req, res) => {
  removeSubscription(req.body.endpoint);
  res.status(200).json({ message: 'Subscription removed' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Practice 16 server: http://localhost:${PORT}`);
});
