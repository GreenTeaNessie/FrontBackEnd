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
const reminders = new Map();

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

function scheduleReminder({ id, text, reminderTime }) {
  const reminderId = Number(id);
  const delay = Number(reminderTime) - Date.now();
  if (!reminderId || !text || delay <= 0) return false;

  if (reminders.has(reminderId)) {
    clearTimeout(reminders.get(reminderId).timeoutId);
  }

  const timeoutId = setTimeout(() => {
    sendPush({
      title: 'Напоминание',
      body: text,
      reminderId
    });
    io.emit('reminderDue', { id: reminderId, text, reminderTime: Date.now() });
  }, delay);

  reminders.set(reminderId, { timeoutId, text, reminderTime: Number(reminderTime) });
  return true;
}

function snoozeReminder(reminderId) {
  const reminder = reminders.get(reminderId);
  if (!reminder) return false;

  clearTimeout(reminder.timeoutId);
  const newReminderTime = Date.now() + 5 * 60 * 1000;
  return scheduleReminder({
    id: reminderId,
    text: reminder.text,
    reminderTime: newReminderTime
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

  socket.on('newReminder', reminder => {
    const created = scheduleReminder(reminder);
    if (created) {
      io.emit('reminderScheduled', reminder);
    }
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

app.post('/snooze', (req, res) => {
  const reminderId = Number(req.query.reminderId);
  if (!reminderId || !snoozeReminder(reminderId)) {
    return res.status(404).json({ error: 'Reminder not found' });
  }
  return res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Practice 17 server: http://localhost:${PORT}`);
});
