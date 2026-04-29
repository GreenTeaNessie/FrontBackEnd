const form = document.getElementById('note-form');
const input = document.getElementById('note-input');
const list = document.getElementById('notes-list');
const emptyState = document.getElementById('empty-state');
const clearButton = document.getElementById('clear-notes');
const swStatus = document.getElementById('sw-status');

const STORAGE_KEY = 'practice-13-notes';

function getNotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

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

function addNote(text) {
  const notes = getNotes();
  notes.unshift({
    id: Date.now(),
    text,
    createdAt: new Date().toISOString()
  });
  saveNotes(notes);
  renderNotes();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addNote(text);
  input.value = '';
  input.focus();
});

clearButton.addEventListener('click', () => {
  saveNotes([]);
  renderNotes();
});

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

renderNotes();
