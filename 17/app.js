const VAPID_PUBLIC_KEY = 'BEGsNyM3KrnEvThLTkxxnoCM8HDttilprHuMvSVa0B37cPpX-i2aQvkcsatEa08RmsYq0NL3QTF1JmVgxrYkiz8';

const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const swStatus = document.getElementById('sw-status');
const connectionStatus = document.getElementById('connection-status');
const enablePushButton = document.getElementById('enable-push');
const disablePushButton = document.getElementById('disable-push');
const toastRegion = document.getElementById('toast-region');

const socket = io();
const STORAGE_KEY = 'practice-17-notes';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

function setActiveButton(page) {
  [homeBtn, aboutBtn].forEach(button => {
    button.classList.toggle('active', button.dataset.page === page);
  });
}

async function loadContent(page) {
  setActiveButton(page);
  try {
    const response = await fetch(`./content/${page}.html`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Page ${page} failed`);
    contentDiv.innerHTML = await response.text();
    if (page === 'home') initNotes();
  } catch (error) {
    contentDiv.innerHTML = '<p class="error">Не удалось загрузить раздел.</p>';
    console.error(error);
  }
}

function getNotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastRegion.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function formatReminder(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('ru-RU');
}

function initNotes() {
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  const reminderForm = document.getElementById('reminder-form');
  const reminderText = document.getElementById('reminder-text');
  const reminderTime = document.getElementById('reminder-time');
  const list = document.getElementById('notes-list');
  const emptyState = document.getElementById('empty-state');
  const clearButton = document.getElementById('clear-notes');

  function renderNotes() {
    const notes = getNotes();
    list.innerHTML = notes.map(note => `
      <li>
        <span>${note.text}</span>
        <span class="note-meta">Создано: ${new Date(note.createdAt).toLocaleString('ru-RU')}</span>
        ${note.reminder ? `<span class="reminder-meta">Напоминание: ${formatReminder(note.reminder)}</span>` : ''}
      </li>
    `).join('');
    emptyState.hidden = notes.length > 0;
  }

  function addNote(text, reminderTimestamp = null) {
    const note = {
      id: Date.now(),
      text,
      reminder: reminderTimestamp,
      createdAt: new Date().toISOString()
    };

    saveNotes([note, ...getNotes()]);
    renderNotes();

    if (reminderTimestamp) {
      socket.emit('newReminder', {
        id: note.id,
        text,
        reminderTime: reminderTimestamp
      });
    } else {
      socket.emit('newTask', { text, timestamp: Date.now() });
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addNote(text);
    input.value = '';
    input.focus();
  });

  reminderForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = reminderText.value.trim();
    const timestamp = new Date(reminderTime.value).getTime();

    if (!text || Number.isNaN(timestamp)) return;
    if (timestamp <= Date.now()) {
      alert('Выберите время в будущем.');
      return;
    }

    addNote(text, timestamp);
    reminderText.value = '';
    reminderTime.value = '';
    reminderText.focus();
  });

  clearButton.addEventListener('click', () => {
    saveNotes([]);
    renderNotes();
  });

  renderNotes();
}

async function updatePushButtons(registration) {
  const subscription = await registration.pushManager.getSubscription();
  enablePushButton.hidden = Boolean(subscription);
  disablePushButton.hidden = !subscription;
}

async function subscribeToPush(registration) {
  if (!('PushManager' in window)) return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  await fetch('./subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });

  await updatePushButtons(registration);
}

async function unsubscribeFromPush(registration) {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch('./unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint })
  });
  await subscription.unsubscribe();
  await updatePushButtons(registration);
}

socket.on('connect', () => {
  connectionStatus.textContent = `Socket.IO подключён: ${socket.id}`;
});

socket.on('disconnect', () => {
  connectionStatus.textContent = 'Socket.IO отключён';
});

socket.on('taskAdded', task => {
  showToast(`Новая заметка: ${task.text}`);
});

socket.on('reminderScheduled', reminder => {
  showToast(`Напоминание запланировано: ${new Date(reminder.reminderTime).toLocaleString('ru-RU')}`);
});

socket.on('reminderDue', reminder => {
  showToast(`Время напоминания: ${reminder.text}`);
});

homeBtn.addEventListener('click', () => loadContent('home'));
aboutBtn.addEventListener('click', () => loadContent('about'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      swStatus.textContent = `Service Worker активен: ${registration.scope}`;
      await updatePushButtons(registration);

      enablePushButton.addEventListener('click', async () => {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') {
          alert('Разрешите уведомления в настройках браузера.');
          return;
        }
        await subscribeToPush(registration);
      });

      disablePushButton.addEventListener('click', () => unsubscribeFromPush(registration));
    } catch (error) {
      swStatus.textContent = 'Service Worker не зарегистрирован';
      console.error('Service Worker registration failed:', error);
    }
  });
}

loadContent('home');
