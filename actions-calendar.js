// 📅 Module Mes Actions — Calendrier mensuel façon Google Calendar
(() => {
  'use strict';

  let acYear, acMonth; // 0-indexed month
  let selectedDay = null;

  const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const EVENT_COLORS = {
    water:      '#4a90c2',
    sow_indoor: '#d19a4a',
    sow_outdoor:'#4caf6d',
    plant:      '#6b8cae',
    harvest:    '#c85a5a',
    prune:      '#9b59b6',
    cuttings:   '#2e8b8b',
    divide:     '#c98ac9',
    treat:      '#4a90c2',
    project:    '#e0a826'
  };

  const EVENT_LABELS = {
    water: '💧 Arrosage',
    sow_indoor: '🏠 Semis int.',
    sow_outdoor: '🌱 Semis ext.',
    plant: '🪴 Plantation',
    harvest: '🌾 Récolte',
    prune: '✂️ Taille',
    cuttings: '🌿 Bouturage',
    divide: '🔀 Division',
    treat: '💧 Traitement',
    project: '📋 Projet'
  };

  function init() {
    const now = new Date();
    acYear = now.getFullYear();
    acMonth = now.getMonth();

    document.getElementById('ac-prev').addEventListener('click', () => {
      acMonth--;
      if (acMonth < 0) { acMonth = 11; acYear--; }
      selectedDay = null;
      renderActionsCalendar();
    });
    document.getElementById('ac-next').addEventListener('click', () => {
      acMonth++;
      if (acMonth > 11) { acMonth = 0; acYear++; }
      selectedDay = null;
      renderActionsCalendar();
    });
    document.getElementById('ac-today-btn').addEventListener('click', () => {
      const now = new Date();
      acYear = now.getFullYear();
      acMonth = now.getMonth();
      selectedDay = null;
      renderActionsCalendar();
    });
    document.getElementById('ac-grid').addEventListener('click', (e) => {
      const cell = e.target.closest('.ac-cell[data-day]');
      if (!cell) return;
      const day = parseInt(cell.dataset.day);
      if (isNaN(day)) return;
      selectedDay = day;
      renderActionsCalendar();
    });
  }

  function getEventsForMonth(year, month) {
    const events = new Map(); // day -> Event[]
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    function addEvent(day, event) {
      if (day < 1 || day > daysInMonth) return;
      if (!events.has(day)) events.set(day, []);
      events.get(day).push(event);
    }

    const plants = (window.APP && APP.state.plants) || [];
    const projects = (window.APP && APP.state.projects) || [];
    const calendar = window.PLANT_CALENDAR || [];
    const displayMonth = month + 1; // 1-indexed

    // 1. WATERING EVENTS
    plants.forEach(p => {
      const interval = Number(p.interval_days || 3);
      const lastWater = APP.parseDate(p.last_water);
      const startDate = lastWater || APP.parseDate(p.planted) || APP.today();

      // Project watering dates forward from last known watering
      let d = new Date(startDate);
      // Make sure we're looking at dates going forward
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      // Jump forward to near the display month if needed
      if (d < monthStart) {
        const daysToMonth = Math.floor((monthStart - d) / 86400000);
        const intervals = Math.floor(daysToMonth / interval);
        d.setDate(d.getDate() + intervals * interval);
      }

      // Go back one interval to not miss edge cases
      d.setDate(d.getDate() - interval);

      const limit = 100; // safety
      for (let i = 0; i < limit; i++) {
        d.setDate(d.getDate() + interval);
        if (d > monthEnd) break;
        if (d >= monthStart && d <= monthEnd) {
          addEvent(d.getDate(), {
            type: 'water',
            plantName: p.name,
            label: `💧 ${p.name}`,
            emoji: APP.TYPE_EMOJI[p.type] || '🌱'
          });
        }
      }
    });

    // 2. SEASONAL EVENTS
    plants.forEach(p => {
      const entry = APP.findCalendarEntry(p);
      if (!entry) return;

      const actionTypes = ['sow_indoor', 'sow_outdoor', 'plant', 'harvest', 'prune', 'cuttings', 'divide', 'treat'];
      actionTypes.forEach(actionKey => {
        const months = entry[actionKey] || [];
        if (months.includes(displayMonth)) {
          // Place seasonal event on day 1 as a banner-style event
          addEvent(1, {
            type: actionKey,
            plantName: p.name,
            label: `${EVENT_LABELS[actionKey] || actionKey} — ${p.name}`,
            emoji: APP.TYPE_EMOJI[p.type] || '🌱',
            seasonal: true
          });
        }
      });
    });

    // 3. PROJECT EVENTS
    projects.forEach(p => {
      if (p.status === 'done' || p.status === 'cancelled') return;
      if (p.target_month === displayMonth) {
        addEvent(15, {
          type: 'project',
          plantName: p.plant_name,
          label: `📋 ${p.plant_name} (${EVENT_LABELS[p.target_action] || p.target_action})`,
          emoji: APP.TYPE_EMOJI[p.plant_type] || '🌱'
        });
      }
    });

    return events;
  }

  function buildGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday = 0, Sunday = 6
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const todayDate = now.getDate();

    const cells = [];
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    const prevDays = prevMonth.getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, isCurrentMonth: false, isToday: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, isToday: isCurrentMonth && d === todayDate });
    }
    // Next month padding
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, isCurrentMonth: false, isToday: false });
      }
    }
    return cells;
  }

  function renderActionsCalendar() {
    const titleEl = document.getElementById('ac-title');
    const gridEl = document.getElementById('ac-grid');
    const MONTHS_FR = APP.MONTHS_FR;

    titleEl.textContent = `${MONTHS_FR[acMonth]} ${acYear}`;

    const events = getEventsForMonth(acYear, acMonth);
    const cells = buildGrid(acYear, acMonth);

    // Day headers
    let html = DAY_HEADERS.map(d => `<div class="ac-day-header">${d}</div>`).join('');

    // Cells
    const MAX_VISIBLE = 3;
    cells.forEach(cell => {
      const cls = ['ac-cell'];
      if (!cell.isCurrentMonth) cls.push('ac-other');
      if (cell.isToday) cls.push('ac-today');
      if (cell.isCurrentMonth && cell.day === selectedDay) cls.push('ac-selected');

      const dayEvents = cell.isCurrentMonth ? (events.get(cell.day) || []) : [];
      // Deduplicate: for watering, group by type; show unique pills
      const pills = [];
      const seen = new Set();
      dayEvents.forEach(ev => {
        if (!ev.seasonal) {
          const key = ev.type + ':' + ev.plantName;
          if (!seen.has(key)) {
            seen.add(key);
            pills.push(ev);
          }
        }
      });
      // Seasonal events: just show one pill per action type
      const seasonalTypes = new Set();
      dayEvents.forEach(ev => {
        if (ev.seasonal && !seasonalTypes.has(ev.type)) {
          seasonalTypes.add(ev.type);
          pills.push(ev);
        }
      });

      const visible = pills.slice(0, MAX_VISIBLE);
      const overflow = pills.length - MAX_VISIBLE;

      const pillsHTML = visible.map(ev =>
        `<span class="ac-pill" style="background:${EVENT_COLORS[ev.type] || '#999'}" title="${APP.esc(ev.label)}"></span>`
      ).join('');
      const overflowHTML = overflow > 0 ? `<span class="ac-overflow">+${overflow}</span>` : '';

      html += `
        <div class="${cls.join(' ')}" ${cell.isCurrentMonth ? `data-day="${cell.day}"` : ''}>
          <span class="ac-day-num">${cell.day}</span>
          <div class="ac-pills">${pillsHTML}${overflowHTML}</div>
        </div>
      `;
    });

    gridEl.innerHTML = html;

    // Day detail panel
    renderDayDetail(events);
  }

  function renderDayDetail(events) {
    const detailEl = document.getElementById('ac-day-detail');
    const titleEl = document.getElementById('ac-detail-title');
    const contentEl = document.getElementById('ac-detail-content');

    if (selectedDay === null) {
      detailEl.classList.add('hidden');
      return;
    }

    const dayEvents = events.get(selectedDay) || [];
    const MONTHS_FR = APP.MONTHS_FR;
    titleEl.textContent = `${selectedDay} ${MONTHS_FR[acMonth]} ${acYear}`;

    if (dayEvents.length === 0) {
      contentEl.innerHTML = '<p class="empty">Aucune action ce jour.</p>';
    } else {
      // Group by type
      const grouped = {};
      dayEvents.forEach(ev => {
        const type = ev.type;
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(ev);
      });

      contentEl.innerHTML = Object.entries(grouped).map(([type, evts]) => {
        const label = EVENT_LABELS[type] || type;
        const color = EVENT_COLORS[type] || '#999';
        return `
          <div class="ac-detail-group">
            <div class="ac-detail-type" style="border-left: 3px solid ${color}; padding-left: 0.5rem;">
              <strong>${label}</strong> <span class="ac-detail-count">(${evts.length})</span>
            </div>
            <ul class="ac-detail-list">
              ${evts.map(ev => `<li>${ev.emoji} ${APP.esc(ev.plantName)}</li>`).join('')}
            </ul>
          </div>
        `;
      }).join('');
    }

    // Moon phase for selected day
    if (window.MOON) {
      const d = new Date(acYear, acMonth, selectedDay);
      const phase = MOON.getPhase(d);
      contentEl.innerHTML += `
        <div class="ac-moon-detail">
          ${MOON.getPhaseEmoji(phase)} ${MOON.getPhaseName(phase)} — ${MOON.getGardeningTip(phase)}
        </div>
      `;
    }

    detailEl.classList.remove('hidden');
  }

  // Wait for APP
  const waitForApp = setInterval(() => {
    if (window.APP) {
      clearInterval(waitForApp);
      init();
      window.APP._extraRenders['mes-actions'] = () => {
        if (document.getElementById('mes-actions').classList.contains('active')) {
          renderActionsCalendar();
        }
      };
    }
  }, 50);
})();
