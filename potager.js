// 🗺️ Module Mon Potager — Grille interactive pour dessiner son jardin
(() => {
  'use strict';

  let currentPlotId = null;
  let selectedCell = null; // { row, col }
  let saveTimer = null;

  const TYPE_COLORS = {
    legume: '#e8f5e9',
    fruit:  '#fff3e0',
    fleur:  '#fce4ec',
    aromate:'#e0f2f1',
    arbre:  '#efebe9',
    autre:  '#f3e5f5'
  };

  function init() {
    wireEvents();
  }

  function wireEvents() {
    document.getElementById('pot-new').addEventListener('click', async () => {
      const name = prompt('Nom du plan :', 'Mon potager');
      if (!name) return;
      try {
        const { data, error } = await APP.sb.from('garden_plots').insert({
          user_id: APP.currentUser.id,
          name: name.trim(),
          grid_cols: 8,
          grid_rows: 6,
          cells: []
        }).select().single();
        if (error) throw error;
        APP.toast('Plan créé !');
        await APP.reloadAll();
        currentPlotId = data.id;
        renderPotagerTab();
      } catch (err) {
        APP.toast('Erreur : ' + err.message);
      }
    });

    document.getElementById('pot-delete').addEventListener('click', async () => {
      if (!currentPlotId) return;
      const plot = getPlots().find(p => p.id === currentPlotId);
      if (!plot) return;
      if (!confirm(`Supprimer le plan "${plot.name}" ?`)) return;
      try {
        const { error } = await APP.sb.from('garden_plots').delete().eq('id', currentPlotId);
        if (error) throw error;
        currentPlotId = null;
        APP.toast('Plan supprimé');
        await APP.reloadAll();
      } catch (err) {
        APP.toast('Erreur : ' + err.message);
      }
    });

    document.getElementById('pot-select').addEventListener('change', (e) => {
      currentPlotId = e.target.value || null;
      selectedCell = null;
      renderPotagerTab();
    });

    document.getElementById('pot-resize').addEventListener('click', async () => {
      const plot = getCurrentPlot();
      if (!plot) return;
      const cols = Math.max(2, Math.min(20, parseInt(document.getElementById('pot-cols').value) || 8));
      const rows = Math.max(2, Math.min(20, parseInt(document.getElementById('pot-rows').value) || 6));
      // Keep cells that still fit in the new dimensions
      const cells = (plot.cells || []).filter(c => c.row < rows && c.col < cols);
      try {
        const { error } = await APP.sb.from('garden_plots').update({
          grid_cols: cols, grid_rows: rows, cells
        }).eq('id', plot.id);
        if (error) throw error;
        plot.grid_cols = cols;
        plot.grid_rows = rows;
        plot.cells = cells;
        APP.toast('Grille redimensionnée');
        renderPotagerTab();
      } catch (err) {
        APP.toast('Erreur : ' + err.message);
      }
    });

    document.getElementById('pot-grid').addEventListener('click', (e) => {
      const cell = e.target.closest('.pot-cell');
      if (!cell) return;
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      const plot = getCurrentPlot();
      if (!plot) return;

      const cellData = (plot.cells || []).find(c => c.row === row && c.col === col);
      if (cellData) {
        // Show info for occupied cell
        selectedCell = { row, col };
        showCellInfo(cellData);
      } else {
        // Open plant picker for empty cell
        selectedCell = { row, col };
        showPicker();
      }
      renderGrid();
    });

    document.getElementById('pot-picker-close').addEventListener('click', hidePicker);
    document.getElementById('pot-picker-search').addEventListener('input', renderPickerList);

    document.getElementById('pot-picker-list').addEventListener('click', (e) => {
      const btn = e.target.closest('.pot-pick-item');
      if (!btn || !selectedCell) return;
      const plantName = btn.dataset.name;
      const plantType = btn.dataset.type;
      placeInCell(selectedCell.row, selectedCell.col, plantName, plantType);
      hidePicker();
    });

    document.getElementById('pot-cell-remove').addEventListener('click', () => {
      if (!selectedCell) return;
      removeFromCell(selectedCell.row, selectedCell.col);
      hideCellInfo();
    });

    document.getElementById('pot-cell-info-close').addEventListener('click', hideCellInfo);
  }

  function getPlots() {
    return APP.state.garden_plots || [];
  }

  function getCurrentPlot() {
    if (!currentPlotId) return null;
    return getPlots().find(p => p.id === currentPlotId) || null;
  }

  function placeInCell(row, col, plantName, plantType) {
    const plot = getCurrentPlot();
    if (!plot) return;
    const cells = [...(plot.cells || [])];
    const idx = cells.findIndex(c => c.row === row && c.col === col);
    const entry = { row, col, plantName, plantType };
    if (idx >= 0) cells[idx] = entry;
    else cells.push(entry);
    plot.cells = cells;
    selectedCell = null;
    debounceSave(plot);
    renderGrid();
  }

  function removeFromCell(row, col) {
    const plot = getCurrentPlot();
    if (!plot) return;
    plot.cells = (plot.cells || []).filter(c => !(c.row === row && c.col === col));
    selectedCell = null;
    debounceSave(plot);
    renderGrid();
  }

  function debounceSave(plot) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const { error } = await APP.sb.from('garden_plots').update({ cells: plot.cells }).eq('id', plot.id);
        if (error) throw error;
        APP.toast('Plan sauvegardé');
      } catch (err) {
        APP.toast('Erreur sauvegarde : ' + err.message);
      }
    }, 1000);
  }

  function showPicker() {
    document.getElementById('pot-picker').classList.remove('hidden');
    document.getElementById('pot-cell-info').classList.add('hidden');
    document.getElementById('pot-picker-search').value = '';
    renderPickerList();
    document.getElementById('pot-picker-search').focus();
  }

  function hidePicker() {
    document.getElementById('pot-picker').classList.add('hidden');
    selectedCell = null;
    renderGrid();
  }

  function showCellInfo(cellData) {
    const el = document.getElementById('pot-cell-info');
    const content = document.getElementById('pot-cell-info-content');
    const emoji = APP.TYPE_EMOJI[cellData.plantType] || '🌱';
    const typeLabel = APP.TYPE_LABEL[cellData.plantType] || 'Autre';
    content.innerHTML = `
      <div class="pot-info-plant">
        <span class="pot-info-emoji">${emoji}</span>
        <div>
          <strong>${APP.esc(cellData.plantName)}</strong>
          <div class="pot-info-type">${APP.esc(typeLabel)}</div>
        </div>
      </div>
    `;
    el.classList.remove('hidden');
    document.getElementById('pot-picker').classList.add('hidden');
  }

  function hideCellInfo() {
    document.getElementById('pot-cell-info').classList.add('hidden');
    selectedCell = null;
    renderGrid();
  }

  function renderPickerList() {
    const listEl = document.getElementById('pot-picker-list');
    const q = (document.getElementById('pot-picker-search').value || '').trim().toLowerCase();
    const plants = APP.state.plants || [];
    const catalog = window.PLANT_CALENDAR || [];

    // User plants
    const userPlants = plants.filter(p => !q || p.name.toLowerCase().includes(q));
    // Catalog plants (exclude duplicates with user plants)
    const userNames = new Set(plants.map(p => p.name.toLowerCase()));
    const catPlants = catalog.filter(p =>
      (!q || p.name.toLowerCase().includes(q)) && !userNames.has(p.name.toLowerCase())
    );

    let html = '';

    if (userPlants.length > 0) {
      html += '<div class="pot-pick-section">Mes plantes</div>';
      html += userPlants.map(p => `
        <button class="pot-pick-item" data-name="${APP.esc(p.name)}" data-type="${p.type}">
          <span>${APP.TYPE_EMOJI[p.type] || '🌱'}</span>
          <span>${APP.esc(p.name)}</span>
        </button>
      `).join('');
    }

    if (catPlants.length > 0) {
      html += '<div class="pot-pick-section">Catalogue</div>';
      html += catPlants.map(p => `
        <button class="pot-pick-item" data-name="${APP.esc(p.name)}" data-type="${p.type}">
          <span>${APP.TYPE_EMOJI[p.type] || '🌱'}</span>
          <span>${APP.esc(p.name)}</span>
        </button>
      `).join('');
    }

    if (!html) {
      html = '<p class="empty">Aucune plante trouvée.</p>';
    }

    listEl.innerHTML = html;
  }

  // ─── Rendering ───

  function renderPotagerTab() {
    const plots = getPlots();
    const selectEl = document.getElementById('pot-select');
    const emptyEl = document.getElementById('pot-empty');
    const settingsEl = document.getElementById('pot-settings');
    const gridWrap = document.getElementById('pot-grid-wrap');
    const deleteBtn = document.getElementById('pot-delete');

    // Populate selector
    selectEl.innerHTML = plots.length === 0
      ? '<option value="">Aucun plan</option>'
      : plots.map(p => `<option value="${p.id}" ${p.id === currentPlotId ? 'selected' : ''}>${APP.esc(p.name)}</option>`).join('');

    // Auto-select first plot if none selected
    if (!currentPlotId && plots.length > 0) {
      currentPlotId = plots[0].id;
      selectEl.value = currentPlotId;
    }

    const plot = getCurrentPlot();

    if (!plot) {
      emptyEl.classList.remove('hidden');
      settingsEl.classList.add('hidden');
      gridWrap.classList.add('hidden');
      deleteBtn.classList.add('hidden');
      document.getElementById('pot-picker').classList.add('hidden');
      document.getElementById('pot-cell-info').classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    settingsEl.classList.remove('hidden');
    gridWrap.classList.remove('hidden');
    deleteBtn.classList.remove('hidden');

    document.getElementById('pot-cols').value = plot.grid_cols;
    document.getElementById('pot-rows').value = plot.grid_rows;

    renderGrid();
  }

  function renderGrid() {
    const plot = getCurrentPlot();
    if (!plot) return;
    const gridEl = document.getElementById('pot-grid');
    const cols = plot.grid_cols;
    const rows = plot.grid_rows;
    const cells = plot.cells || [];

    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    let html = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellData = cells.find(cell => cell.row === r && cell.col === c);
        const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
        const cls = ['pot-cell'];
        if (isSelected) cls.push('pot-cell-selected');

        if (cellData) {
          const emoji = APP.TYPE_EMOJI[cellData.plantType] || '🌱';
          const bgColor = TYPE_COLORS[cellData.plantType] || '#f5f5f5';
          cls.push('pot-cell-filled');
          html += `<div class="${cls.join(' ')}" data-row="${r}" data-col="${c}" style="background:${bgColor}" title="${APP.esc(cellData.plantName)}">
            <span class="pot-cell-emoji">${emoji}</span>
            <span class="pot-cell-name">${APP.esc(cellData.plantName)}</span>
          </div>`;
        } else {
          html += `<div class="${cls.join(' ')}" data-row="${r}" data-col="${c}">
            <span class="pot-cell-plus">+</span>
          </div>`;
        }
      }
    }
    gridEl.innerHTML = html;
  }

  // Wait for APP
  const waitForApp = setInterval(() => {
    if (window.APP) {
      clearInterval(waitForApp);
      init();
      window.APP._extraRenders.potager = () => {
        if (document.getElementById('potager').classList.contains('active')) {
          renderPotagerTab();
        }
      };
    }
  }, 50);
})();
