// 🌱 Module Projets Plante — parcourir, planifier, phases lunaires
(() => {
  'use strict';

  const ACTIONS_LIST = [
    { key: 'sow_indoor',  label: 'Semis intérieur',  icon: '🏠' },
    { key: 'sow_outdoor', label: 'Semis extérieur',  icon: '🌱' },
    { key: 'plant',       label: 'Plantation',       icon: '🪴' },
    { key: 'harvest',     label: 'Récolte',          icon: '🌾' },
    { key: 'prune',       label: 'Taille',           icon: '✂️' },
    { key: 'cuttings',    label: 'Bouturage',        icon: '🌿' },
    { key: 'divide',      label: 'Division',         icon: '🔀' },
    { key: 'treat',       label: 'Traitement',       icon: '💧' }
  ];

  const STATUS_LABELS = {
    planned: '📋 Planifié',
    started: '🌱 En cours',
    done: '✅ Terminé',
    cancelled: '❌ Annulé'
  };

  function init() {
    wireEvents();
  }

  function wireEvents() {
    document.getElementById('projets-search').addEventListener('input', renderBrowse);
    document.getElementById('projets-filter-type').addEventListener('change', renderBrowse);

    document.getElementById('projets-browse').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-add-project]');
      if (!btn) return;
      const name = btn.dataset.addProject;
      const type = btn.dataset.plantType;
      const card = btn.closest('.projet-card');
      const actionSelect = card.querySelector('.projet-action-select');
      const monthSelect = card.querySelector('.projet-month-select');
      const action = actionSelect ? actionSelect.value : 'plant';
      const month = monthSelect ? parseInt(monthSelect.value) : (new Date().getMonth() + 1);

      try {
        const { error } = await APP.sb.from('plant_projects').insert({
          user_id: APP.currentUser.id,
          plant_name: name,
          plant_type: type,
          target_action: action,
          target_month: month
        });
        if (error) throw error;
        APP.toast(`${name} ajouté aux projets !`);
        await APP.reloadAll();
      } catch (err) {
        APP.toast('Erreur : ' + err.message);
      }
    });

    document.getElementById('projets-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-project-action]');
      if (!btn) return;
      const id = btn.dataset.projectId;
      const action = btn.dataset.projectAction;

      try {
        if (action === 'delete') {
          const { error } = await APP.sb.from('plant_projects').delete().eq('id', id);
          if (error) throw error;
          APP.toast('Projet supprimé');
        } else if (action === 'next-status') {
          const project = APP.state.projects.find(p => p.id === id);
          if (!project) return;
          const statusFlow = { planned: 'started', started: 'done', done: 'planned', cancelled: 'planned' };
          const newStatus = statusFlow[project.status] || 'planned';
          const { error } = await APP.sb.from('plant_projects').update({ status: newStatus }).eq('id', id);
          if (error) throw error;
        }
        await APP.reloadAll();
      } catch (err) {
        APP.toast('Erreur : ' + err.message);
      }
    });
  }

  function renderProjetsTab() {
    renderMoonInfo();
    renderBrowse();
    renderProjects();
  }

  function renderMoonInfo() {
    const el = document.getElementById('projets-moon');
    if (!window.MOON) { el.innerHTML = ''; return; }
    const now = new Date();
    const phase = MOON.getPhase(now);
    const emoji = MOON.getPhaseEmoji(phase);
    const name = MOON.getPhaseName(phase);
    const tip = MOON.getGardeningTip(phase);

    // Find key dates for current month
    const keyDates = MOON.getKeyDates(now.getFullYear(), now.getMonth());
    const MONTHS_FR = APP.MONTHS_FR;
    const keyDatesHTML = keyDates.length > 0 ? keyDates.map(k =>
      `<span class="moon-key-date">${MOON.getPhaseEmoji(k.phase)} ${k.day} ${MONTHS_FR[now.getMonth()]} — ${k.event}</span>`
    ).join('') : '';

    el.innerHTML = `
      <div class="moon-card">
        <div class="moon-phase-big">${emoji}</div>
        <div class="moon-info">
          <div class="moon-name">${APP.esc(name)}</div>
          <div class="moon-tip">${APP.esc(tip)}</div>
          ${keyDatesHTML ? `<div class="moon-keys">${keyDatesHTML}</div>` : ''}
        </div>
      </div>
    `;
  }

  function renderBrowse() {
    const el = document.getElementById('projets-browse');
    const calendar = window.PLANT_CALENDAR || [];
    const q = (document.getElementById('projets-search').value || '').trim().toLowerCase();
    const typeFilter = document.getElementById('projets-filter-type').value;

    const filtered = calendar.filter(p => {
      const matchQ = !q || p.name.toLowerCase().includes(q);
      const matchT = !typeFilter || p.type === typeFilter;
      return matchQ && matchT;
    });

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const MONTHS_FR = APP.MONTHS_FR;

    el.innerHTML = filtered.map(plant => {
      const emoji = APP.TYPE_EMOJI[plant.type] || '🌱';

      // Build month timeline
      const timelineHTML = buildTimeline(plant, curMonth);

      // Available actions for current/next months
      const availableActions = ACTIONS_LIST.filter(a => {
        const months = plant[a.key] || [];
        return months.length > 0;
      });

      // Moon advice for current month actions
      let moonAdvice = '';
      if (window.MOON) {
        const phase = MOON.getPhase(now);
        const waxing = MOON.isWaxing(phase);
        const relevantActions = availableActions.filter(a => (plant[a.key] || []).includes(curMonth));
        if (relevantActions.length > 0) {
          if (waxing) {
            moonAdvice = `<div class="moon-mini">🌒 Lune montante — favorable aux semis aériens</div>`;
          } else {
            moonAdvice = `<div class="moon-mini">🌖 Lune descendante — favorable aux plantations et tailles</div>`;
          }
        }
      }

      // Action + month selector for adding to project
      const defaultAction = availableActions.length > 0 ? availableActions[0].key : 'plant';
      const actionOptions = availableActions.map(a =>
        `<option value="${a.key}">${a.icon} ${a.label}</option>`
      ).join('');
      const monthOptions = Array.from({length: 12}, (_, i) => {
        const m = i + 1;
        return `<option value="${m}" ${m === curMonth ? 'selected' : ''}>${MONTHS_FR[i]}</option>`;
      }).join('');

      return `
        <div class="projet-card">
          <div class="projet-card-header">
            <span class="projet-emoji">${emoji}</span>
            <div>
              <div class="projet-name">${APP.esc(plant.name)}</div>
              <div class="projet-type">${APP.esc(APP.TYPE_LABEL[plant.type] || 'Autre')}</div>
            </div>
          </div>
          <div class="projet-timeline">${timelineHTML}</div>
          ${moonAdvice}
          <div class="projet-add-row">
            <select class="projet-action-select">${actionOptions || '<option value="plant">🪴 Plantation</option>'}</select>
            <select class="projet-month-select">${monthOptions}</select>
            <button class="btn primary small" data-add-project="${APP.esc(plant.name)}" data-plant-type="${plant.type}">+ Projet</button>
          </div>
        </div>
      `;
    }).join('');

    if (filtered.length === 0) {
      el.innerHTML = '<p class="empty">Aucune plante trouvée.</p>';
    }
  }

  function buildTimeline(plant, curMonth) {
    const MONTHS_SHORT = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    const ACTION_COLORS = {
      sow_indoor: '#d19a4a',
      sow_outdoor: '#4caf6d',
      plant: '#6b8cae',
      harvest: '#c85a5a',
      prune: '#9b59b6',
      cuttings: '#2e8b8b',
      divide: '#c98ac9',
      treat: '#4a90c2'
    };

    return `<div class="timeline-row">${MONTHS_SHORT.map((label, i) => {
      const m = i + 1;
      const activeActions = ACTIONS_LIST.filter(a => (plant[a.key] || []).includes(m));
      const isCurrent = m === curMonth;
      const dots = activeActions.map(a =>
        `<span class="tl-dot" style="background:${ACTION_COLORS[a.key]}" title="${a.label}"></span>`
      ).join('');
      return `<div class="tl-month${isCurrent ? ' tl-current' : ''}" title="${APP.MONTHS_FR[i]}">
        <span class="tl-label">${label}</span>
        <div class="tl-dots">${dots}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderProjects() {
    const projects = APP.state.projects || [];
    const titleEl = document.getElementById('mes-projets-title');
    const listEl = document.getElementById('projets-list');

    if (projects.length === 0) {
      titleEl.classList.add('hidden');
      listEl.innerHTML = '';
      return;
    }

    titleEl.classList.remove('hidden');
    const MONTHS_FR = APP.MONTHS_FR;

    listEl.innerHTML = projects.map(p => {
      const emoji = APP.TYPE_EMOJI[p.plant_type] || '🌱';
      const actionInfo = ACTIONS_LIST.find(a => a.key === p.target_action);
      const actionLabel = actionInfo ? `${actionInfo.icon} ${actionInfo.label}` : p.target_action;
      const monthLabel = p.target_month ? MONTHS_FR[p.target_month - 1] : '—';
      const statusLabel = STATUS_LABELS[p.status] || p.status;

      return `
        <div class="projet-item status-${p.status}">
          <div class="projet-item-info">
            <span>${emoji}</span>
            <div>
              <strong>${APP.esc(p.plant_name)}</strong>
              <div class="projet-item-meta">${actionLabel} · ${monthLabel} · ${statusLabel}</div>
            </div>
          </div>
          <div class="projet-item-actions">
            <button class="btn small" data-project-action="next-status" data-project-id="${p.id}" title="Changer le statut">⏭️</button>
            <button class="btn small danger" data-project-action="delete" data-project-id="${p.id}" title="Supprimer">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Wait for APP
  const waitForApp = setInterval(() => {
    if (window.APP) {
      clearInterval(waitForApp);
      init();
      window.APP._extraRenders.projets = () => {
        if (document.getElementById('projets').classList.contains('active')) {
          renderProjetsTab();
        }
      };
    }
  }, 50);
})();
