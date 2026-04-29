const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const swStatus = document.getElementById('sw-status');
const connectionStatus = document.getElementById('connection-status');

const STORAGE_KEY = 'practice-15-notes';

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
    contentDiv.innerHTML = '<p class="error">Не удалось загрузить раздел. Откройте главную страницу или проверьте сеть.</p>';
    console.error(error);
  }
}

function getNotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function initNotes() {
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  const list = document.getElementById('notes-list');
  const emptyState = document.getElementById('empty-state');
  const clearButton = document.getElementById('clear-notes');

  function renderNotes() {
    const notes = getNotes();
    list.innerHTML = notes.map(note => `
      <li>
        <span>${note.text}</span>
        <span class="note-date">${new Date(note.createdAt).toLocaleString('ru-RU')}</span>
      </li>
    `).join('');
    emptyState.hidden = notes.length > 0;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    saveNotes([{ id: Date.now(), text, createdAt: new Date().toISOString() }, ...getNotes()]);
    input.value = '';
    input.focus();
    renderNotes();
  });

  clearButton.addEventListener('click', () => {
    saveNotes([]);
    renderNotes();
  });

  renderNotes();
}

function updateConnectionStatus() {
  connectionStatus.textContent = navigator.onLine ? 'Online' : 'Offline';
}

homeBtn.addEventListener('click', () => loadContent('home'));
aboutBtn.addEventListener('click', () => loadContent('about'));
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      swStatus.textContent = `Service Worker активен: ${registration.scope}`;
    } catch (error) {
      swStatus.textContent = 'Service Worker не зарегистрирован';
      console.error('Service Worker registration failed:', error);
    }
  });
} else {
  swStatus.textContent = 'Service Worker не поддерживается';
}

updateConnectionStatus();
loadContent('home');
