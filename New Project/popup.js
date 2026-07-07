let allTabs = [];
let protectedUrls = [];

const lockClosedSVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 10V8a6 6 0 1112 0v2" stroke="#ffd27a" stroke-width="2" stroke-linecap="round"/><rect x="4" y="10" width="16" height="11" rx="2" fill="#ffd27a"/></svg>';
const lockOpenSVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 10V8a6 6 0 0111.5-2.3" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/><rect x="4" y="10" width="16" height="11" rx="2" fill="rgba(255,255,255,0.25)"/></svg>';

chrome.storage.local.get(['protectedUrls'], (result) => {
  protectedUrls = result.protectedUrls || [];
  loadTabs();
});

function loadTabs() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    allTabs = tabs;
    renderTabs();
  });
}

function isProtected(tab) {
  return protectedUrls.includes(tab.url);
}

function saveProtected() {
  chrome.storage.local.set({ protectedUrls });
}

function renderTabs() {
  const list = document.getElementById('tab-list');
  list.innerHTML = '';

  allTabs.forEach((tab) => {
    const protectedTab = isProtected(tab);

    const item = document.createElement('div');
    item.className = 'tab-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.tabId = tab.id;
    checkbox.className = 'mark-checkbox';

    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    const fallbackIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23555"/></svg>';
    favicon.src = (tab.favIconUrl && tab.favIconUrl.startsWith('http')) ? tab.favIconUrl : fallbackIcon;
    favicon.onerror = () => { favicon.src = fallbackIcon; };

    const title = document.createElement('span');
    title.className = 'tab-title' + (protectedTab ? ' protected' : '');
    title.textContent = tab.title;
    title.title = tab.url;

    const lockBtn = document.createElement('button');
    lockBtn.className = 'icon-btn';
    lockBtn.innerHTML = protectedTab ? lockClosedSVG : lockOpenSVG;
    lockBtn.title = protectedTab ? 'Убрать защиту' : 'Защитить вкладку';
    lockBtn.onclick = () => {
      if (protectedTab) {
        protectedUrls = protectedUrls.filter((u) => u !== tab.url);
      } else {
        protectedUrls.push(tab.url);
      }
      saveProtected();
      renderTabs();
    };

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = 'Закрыть';
    closeBtn.onclick = () => {
      if (protectedTab) {
        const sure = confirm('Эта вкладка защищена. Всё равно закрыть?');
        if (!sure) return;
      }
      chrome.tabs.remove(tab.id);
      allTabs = allTabs.filter((t) => t.id !== tab.id);
      renderTabs();
    };

    item.appendChild(checkbox);
    item.appendChild(favicon);
    item.appendChild(title);
    item.appendChild(lockBtn);
    item.appendChild(closeBtn);
    list.appendChild(item);
  });

  updateCounter();
}

function updateCounter() {
  const marked = document.querySelectorAll('.mark-checkbox:checked').length;
  document.getElementById('counter').textContent =
    'Всего вкладок: ' + allTabs.length + ' · Отмечено: ' + marked;
}

document.getElementById('tab-list').addEventListener('change', updateCounter);

document.getElementById('close-marked').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.mark-checkbox:checked');
  const idsToClose = Array.from(checkboxes).map((cb) => parseInt(cb.dataset.tabId));

  const hasProtected = allTabs.some((t) => idsToClose.includes(t.id) && isProtected(t));
  if (hasProtected) {
    const sure = confirm('Среди отмеченных есть защищённые вкладки. Всё равно закрыть?');
    if (!sure) return;
  }

  idsToClose.forEach((id) => chrome.tabs.remove(id));
  allTabs = allTabs.filter((t) => !idsToClose.includes(t.id));
  renderTabs();
});

document.getElementById('keep-marked').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.mark-checkbox:checked');
  const idsToKeep = Array.from(checkboxes).map((cb) => parseInt(cb.dataset.tabId));

  const idsToClose = allTabs
    .filter((t) => !idsToKeep.includes(t.id) && !isProtected(t))
    .map((t) => t.id);

  if (idsToClose.length === 0) return;

  const sure = confirm('Закрыть ' + idsToClose.length + ' вкладок? Защищённые не тронем.');
  if (!sure) return;

  idsToClose.forEach((id) => chrome.tabs.remove(id));
  allTabs = allTabs.filter((t) => !idsToClose.includes(t.id));
  renderTabs();
});