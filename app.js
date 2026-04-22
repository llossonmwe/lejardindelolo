// 🌱 Gestionnaire de jardin - logique principale
(() => {
  'use strict';

  const STORAGE_KEY = 'garden-manager-v1';
  const TYPE_EMOJI = {
    legume: '🥕', fruit: '🍓', fleur: '🌸', aromate: '🌿', arbre: '🌳', autre: '🌱'
  };
  const TYPE_LABEL = {
    legume: 'Légume', fruit: 'Fruit', fleur: 'Fleur',
    aromate: 'Aromate', arbre: 'Arbre', autre: 'Autre'
  };

  // --- État ---
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { plants: [], journal: [] };
      const parsed = JSON.parse(raw);
      return {
        plants: Array.isArray(parsed.plants) ? parsed.plants : [],
        journal: Array.isArray(parsed.journal) ? parsed.journal : []
      };
    } catch {
      return { plants: [], journal: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // --- Utilitaires ---
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const parseDate = (s) => { if (!s) return null; const d = new Date(s); d.setHours(0,0,0,0); return isNaN(d) ? null : d; };
  const formatDate = (d) => d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const toISO = (d) => d.toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);

  function nextWatering(plant) {
    const last = parseDate(plant.lastWater);
    if (!last) return today();
    const next = new Date(last);
    next.setDate(next.getDate() + Number(plant.interval || 3));
    return next;
  }

  function waterStatus(plant) {
    const next = nextWatering(plant);
    const diff = daysBetween(today(), next);
    if (diff < 0) return { key: 'overdue', label: `En retard de ${-diff}j`, days: diff };
    if (diff === 0) return { key: 'today', label: 'À arroser aujourd\'hui', days: 0 };
    return { key: 'ok', label: `Dans ${diff}j`, days: diff };
  }

  // --- Sécurité: échappement HTML ---
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  // --- Toast ---
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2500);
  }

  // --- Onglets ---
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      renderAll();
    });
  });

  // --- Rendu plantes ---
  const plantsGrid = document.getElementById('plants-grid');
  const emptyPlants = document.getElementById('empty-plants');
  const searchInput = document.getElementById('search');
  const filterType = document.getElementById('filter-type');

  function renderPlants() {
    const q = searchInput.value.trim().toLowerCase();
    const type = filterType.value;
    const filtered = state.plants.filter(p => {
      const matchQ = !q || p.name.toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q);
      const matchT = !type || p.type === type;
      return matchQ && matchT;
    });

    emptyPlants.classList.toggle('hidden', filtered.length > 0);
    plantsGrid.innerHTML = filtered.map(plant => {
      const status = waterStatus(plant);
      const next = nextWatering(plant);
      const cardClass = status.key === 'overdue' ? 'overdue' : status.key === 'today' ? 'today' : '';
      return `
        <article class="plant-card ${cardClass}" data-id="${plant.id}">
          <div class="emoji">${TYPE_EMOJI[plant.type] || '🌱'}</div>
          <h3>${esc(plant.name)}</h3>
          <div class="meta">${esc(TYPE_LABEL[plant.type] || 'Autre')}${plant.location ? ' · ' + esc(plant.location) : ''}</div>
          <div class="meta">Plantée le ${formatDate(parseDate(plant.planted))}</div>
          <span class="water-status ${status.key}">💧 ${esc(status.label)}</span>
          <div class="meta">Prochain: ${formatDate(next)}</div>
          ${plant.notes ? `<div class="meta" style="font-style:italic">${esc(plant.notes)}</div>` : ''}
          <div class="card-actions">
            <button class="btn primary" data-action="water">💧 Arrosé</button>
            <button class="btn" data-action="edit">✏️ Modifier</button>
            <button class="btn danger" data-action="delete">🗑️</button>
          </div>
        </article>
      `;
    }).join('');
  }

  plantsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const card = btn.closest('.plant-card');
    const id = card.dataset.id;
    const plant = state.plants.find(p => p.id === id);
    if (!plant) return;

    if (btn.dataset.action === 'water') {
      plant.lastWater = toISO(today());
      saveState();
      toast(`${plant.name} arrosée 💧`);
      renderAll();
    } else if (btn.dataset.action === 'edit') {
      openDialog(plant);
    } else if (btn.dataset.action === 'delete') {
      if (confirm(`Supprimer "${plant.name}" ?`)) {
        state.plants = state.plants.filter(p => p.id !== id);
        saveState();
        toast('Plante supprimée');
        renderAll();
      }
    }
  });

  searchInput.addEventListener('input', renderPlants);
  filterType.addEventListener('change', renderPlants);

  // --- Dialogue ---
  const dialog = document.getElementById('plant-dialog');
  const form = document.getElementById('plant-form');
  const dialogTitle = document.getElementById('dialog-title');

  function openDialog(plant) {
    form.reset();
    if (plant) {
      dialogTitle.textContent = 'Modifier la plante';
      form.querySelector('#plant-id').value = plant.id;
      form.querySelector('#plant-name').value = plant.name;
      form.querySelector('#plant-type').value = plant.type;
      form.querySelector('#plant-location').value = plant.location || '';
      form.querySelector('#plant-planted').value = plant.planted || '';
      form.querySelector('#plant-interval').value = plant.interval || 3;
      form.querySelector('#plant-lastwater').value = plant.lastWater || '';
      form.querySelector('#plant-notes').value = plant.notes || '';
    } else {
      dialogTitle.textContent = 'Nouvelle plante';
      form.querySelector('#plant-id').value = '';
      form.querySelector('#plant-interval').value = 3;
      form.querySelector('#plant-planted').value = toISO(today());
    }
    dialog.showModal();
  }

  document.getElementById('add-plant-btn').addEventListener('click', () => openDialog(null));
  document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = form.querySelector('#plant-id').value;
    const data = {
      id: id || uid(),
      name: form.querySelector('#plant-name').value.trim(),
      type: form.querySelector('#plant-type').value,
      location: form.querySelector('#plant-location').value.trim(),
      planted: form.querySelector('#plant-planted').value,
      interval: Math.max(1, Math.min(60, parseInt(form.querySelector('#plant-interval').value, 10) || 3)),
      lastWater: form.querySelector('#plant-lastwater').value,
      notes: form.querySelector('#plant-notes').value.trim()
    };
    if (!data.name) return;

    if (id) {
      const idx = state.plants.findIndex(p => p.id === id);
      if (idx >= 0) state.plants[idx] = data;
      toast('Plante modifiée');
    } else {
      state.plants.push(data);
      toast('Plante ajoutée 🌱');
    }
    saveState();
    dialog.close();
    renderAll();
  });

  // --- Tâches ---
  function renderTasks() {
    const list = document.getElementById('tasks-list');
    const empty = document.getElementById('empty-tasks');
    const tasks = state.plants.map(p => ({ plant: p, status: waterStatus(p), next: nextWatering(p) }))
      .sort((a, b) => a.next - b.next);

    empty.classList.toggle('hidden', tasks.length > 0);
    list.innerHTML = tasks.map(t => {
      const cls = t.status.key === 'overdue' ? 'overdue' : t.status.key === 'today' ? 'today' : 'future';
      return `
        <li class="task-item ${cls}" data-id="${t.plant.id}">
          <div>
            <strong>${TYPE_EMOJI[t.plant.type]} ${esc(t.plant.name)}</strong>
            <div class="task-when">${esc(t.status.label)} · ${formatDate(t.next)}</div>
          </div>
          <button class="btn primary" data-water="${t.plant.id}">💧 Arrosé</button>
        </li>
      `;
    }).join('');
  }

  document.getElementById('tasks-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-water]');
    if (!btn) return;
    const plant = state.plants.find(p => p.id === btn.dataset.water);
    if (plant) {
      plant.lastWater = toISO(today());
      saveState();
      toast(`${plant.name} arrosée 💧`);
      renderAll();
    }
  });

  // --- Journal ---
  const journalForm = document.getElementById('journal-form');
  const journalList = document.getElementById('journal-list');

  journalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = document.getElementById('journal-text').value.trim();
    if (!txt) return;
    state.journal.unshift({ id: uid(), text: txt, date: new Date().toISOString() });
    saveState();
    document.getElementById('journal-text').value = '';
    toast('Entrée ajoutée 📓');
    renderJournal();
    renderStats();
  });

  function renderJournal() {
    journalList.innerHTML = state.journal.map(e => `
      <li class="journal-entry" data-id="${e.id}">
        <button class="delete-entry" data-del="${e.id}" title="Supprimer">✖</button>
        <time>${new Date(e.date).toLocaleString('fr-FR')}</time>
        <p>${esc(e.text)}</p>
      </li>
    `).join('');
  }

  journalList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-del]');
    if (!btn) return;
    state.journal = state.journal.filter(x => x.id !== btn.dataset.del);
    saveState();
    renderJournal();
    renderStats();
  });

  // --- Stats ---
  function renderStats() {
    document.getElementById('stat-total').textContent = state.plants.length;
    document.getElementById('stat-journal').textContent = state.journal.length;

    let watering = 0, overdue = 0;
    state.plants.forEach(p => {
      const s = waterStatus(p);
      if (s.key === 'today') watering++;
      if (s.key === 'overdue') overdue++;
    });
    document.getElementById('stat-watering').textContent = watering;
    document.getElementById('stat-overdue').textContent = overdue;

    // Répartition par type
    const counts = {};
    state.plants.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    const chart = document.getElementById('type-chart');
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    chart.innerHTML = entries.length === 0
      ? '<p class="empty">Pas encore de données</p>'
      : entries.map(([type, n]) => `
        <div class="bar-row">
          <span class="label">${TYPE_EMOJI[type]} ${TYPE_LABEL[type]}</span>
          <div class="bar"><div class="fill" style="width:${(n / max) * 100}%">${n}</div></div>
        </div>
      `).join('');
  }

  // --- Export / Import / Reset ---
  document.getElementById('export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jardin-${toISO(today())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export téléchargé');
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.plants) || !Array.isArray(data.journal)) throw new Error('bad format');
        if (!confirm('Remplacer les données actuelles par celles du fichier ?')) return;
        state = { plants: data.plants, journal: data.journal };
        saveState();
        toast('Import réussi ✅');
        renderAll();
      } catch {
        alert('Fichier invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Effacer TOUTES les données (plantes + journal) ? Cette action est irréversible.')) {
      state = { plants: [], journal: [] };
      saveState();
      toast('Données effacées');
      renderAll();
    }
  });

  // --- Démarrage : données d'exemple au premier lancement ---
  if (state.plants.length === 0 && state.journal.length === 0 && !localStorage.getItem(STORAGE_KEY + '-seeded')) {
    state.plants = [
      { id: uid(), name: 'Tomate cerise', type: 'legume', location: 'Potager', planted: toISO(today()), interval: 2, lastWater: toISO(today()), notes: 'Variété Sungold' },
      { id: uid(), name: 'Basilic', type: 'aromate', location: 'Balcon', planted: toISO(today()), interval: 2, lastWater: '', notes: '' },
      { id: uid(), name: 'Rosier', type: 'fleur', location: 'Jardin', planted: toISO(today()), interval: 4, lastWater: toISO(today()), notes: '' }
    ];
    saveState();
    localStorage.setItem(STORAGE_KEY + '-seeded', '1');
  }

  function renderAll() {
    renderPlants();
    renderTasks();
    renderJournal();
    renderStats();
  }

  renderAll();
})();
