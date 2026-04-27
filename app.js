// 🌱 Le jardin de Lolo — version Supabase (sync multi-appareils)
(() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // Supabase client
  // ═══════════════════════════════════════════════════════════════
  if (!window.SUPABASE_CONFIG || !window.supabase) {
    alert('Configuration Supabase manquante. Vérifiez supabase-config.js.');
    return;
  }
  const sb = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );

  const TYPE_EMOJI = {
    legume: '🥕', fruit: '🍓', fleur: '🌸', aromate: '🌿', arbre: '🌳', autre: '🌱'
  };
  const TYPE_LABEL = {
    legume: 'Légume', fruit: 'Fruit', fleur: 'Fleur',
    aromate: 'Aromate', arbre: 'Arbre', autre: 'Autre'
  };
  const PHOTO_BUCKET = 'plant-photos';
  const PHOTO_MAX_SIDE = 1600;

  // ─── DOM refs ───
  const authScreen = document.getElementById('auth-screen');
  const appEl = document.getElementById('app');
  const authForm = document.getElementById('auth-form');
  const authChoice = document.getElementById('auth-choice');
  const authUser = document.getElementById('auth-username');
  const authPass = document.getElementById('auth-password');
  const authError = document.getElementById('auth-error');
  const authInfo = document.getElementById('auth-info');
  const authSubmit = document.getElementById('auth-submit');
  const authBack = document.getElementById('auth-back');
  const authSubtitle = document.getElementById('auth-subtitle');
  const userGreeting = document.getElementById('user-greeting');
  const logoutBtn = document.getElementById('logout-btn');

  let authMode = null; // null = écran de choix, 'login' ou 'signup' = formulaire
  let state = { plants: [], journal: [], projects: [], garden_plots: [] };
  let currentUser = null;
  let appStarted = false;
  let calMonth = new Date().getMonth() + 1; // 1..12
  const photoState = { file: null, previewUrl: '' };

  // ─── Helpers ───
  const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const parseDate = (s) => { if (!s) return null; const d = new Date(s); d.setHours(0,0,0,0); return isNaN(d) ? null : d; };
  const formatDate = (d) => d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const toISO = (d) => d.toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function getPhotoUrl(path) {
    if (!path) return '';
    return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl || '';
  }

  async function deletePhotoByPath(path) {
    if (!path) return;
    const { error } = await sb.storage.from(PHOTO_BUCKET).remove([path]);
    if (error) throw error;
  }

  async function fileToOptimizedBlob(file) {
    if (!file || !file.type.startsWith('image/')) throw new Error('Le fichier doit être une image.');

    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
      el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image invalide.')); };
      el.src = url;
    });

    const ratio = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Impossible de traiter la photo.'));
        else resolve(blob);
      }, 'image/jpeg', 0.82);
    });
  }

  async function uploadPlantPhoto(file) {
    const blob = await fileToOptimizedBlob(file);
    const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false
    });
    if (error) throw error;
    return path;
  }

  function nextWatering(plant) {
    const last = parseDate(plant.last_water);
    if (!last) return today();
    const next = new Date(last);
    next.setDate(next.getDate() + Number(plant.interval_days || 3));
    return next;
  }
  function waterStatus(plant) {
    const next = nextWatering(plant);
    const diff = daysBetween(today(), next);
    if (diff < 0) return { key: 'overdue', label: `En retard de ${-diff}j`, days: diff };
    if (diff === 0) return { key: 'today', label: 'À arroser aujourd\'hui', days: 0 };
    return { key: 'ok', label: `Dans ${diff}j`, days: diff };
  }

  // ─── Actions calendaires (taille, bouturage, division, traitement) ───
  const ACTION_META = {
    prune:    { label: 'Tailler',  short: 'Taille',     icon: '✂️', column: 'last_prune' },
    cuttings: { label: 'Bouturer', short: 'Bouturage',  icon: '🌿', column: 'last_cuttings' },
    divide:   { label: 'Diviser',  short: 'Division',   icon: '🔀', column: 'last_divide' },
    treat:    { label: 'Traiter',  short: 'Traitement', icon: '💧', column: 'last_treat' }
  };
  const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

  // Trouve la fiche calendrier correspondant à la plante (match insensible à la casse)
  function findCalendarEntry(plant) {
    const list = window.PLANT_CALENDAR || [];
    const n = (plant.name || '').toLowerCase().trim();
    if (!n) return null;
    return list.find(p => p.name.toLowerCase() === n)
        || list.find(p => n.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(n))
        || null;
  }

  // Prochain mois (1..12) où l'action est prévue, à partir d'aujourd'hui.
  // Si on est déjà dans un mois prévu et que l'action n'a pas été faite ce mois, retourne ce mois (= "à faire ce mois").
  function nextActionMonth(months, lastDoneISO) {
    if (!Array.isArray(months) || months.length === 0) return null;
    const now = today();
    const curMonth = now.getMonth() + 1;
    const last = parseDate(lastDoneISO);
    const doneThisMonth = last && last.getMonth() + 1 === curMonth && last.getFullYear() === now.getFullYear();

    if (months.includes(curMonth) && !doneThisMonth) {
      return { month: curMonth, year: now.getFullYear(), thisMonth: true };
    }
    // Cherche le prochain mois (cycle sur 12)
    for (let i = 1; i <= 12; i++) {
      const m = ((curMonth - 1 + i) % 12) + 1;
      if (months.includes(m)) {
        const year = now.getFullYear() + (m <= curMonth ? 1 : 0);
        return { month: m, year, thisMonth: false };
      }
    }
    return null;
  }

  // Liste des actions disponibles pour cette plante (avec calendrier + dernière date + prochaine date)
  function plantActions(plant) {
    const entry = findCalendarEntry(plant);
    if (!entry) return [];
    return Object.entries(ACTION_META)
      .filter(([key]) => Array.isArray(entry[key]) && entry[key].length > 0)
      .map(([key, meta]) => {
        const last = plant[meta.column];
        const next = nextActionMonth(entry[key], last);
        return { key, meta, last, next };
      });
  }

  // ─── Toast ───
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2500);
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════
  function showChoice() {
    authMode = null;
    authForm.classList.add('hidden');
    authChoice.classList.remove('hidden');
    authSubtitle.textContent = 'Bienvenue ! Que souhaitez-vous faire ?';
    authForm.reset();
    authError.classList.add('hidden');
    authInfo.classList.add('hidden');
  }

  function showForm(mode) {
    authMode = mode;
    authChoice.classList.add('hidden');
    authForm.classList.remove('hidden');
    authError.classList.add('hidden');
    authInfo.classList.add('hidden');
    const forgotBtn = document.getElementById('auth-forgot');
    if (mode === 'signup') {
      authSubtitle.textContent = 'Créez votre compte pour commencer';
      authSubmit.textContent = 'Créer mon compte';
      authPass.autocomplete = 'new-password';
      forgotBtn.classList.add('hidden');
    } else {
      authSubtitle.textContent = 'Connectez-vous pour accéder à votre jardin';
      authSubmit.textContent = 'Se connecter';
      authPass.autocomplete = 'current-password';
      forgotBtn.classList.remove('hidden');
    }
    setTimeout(() => authUser.focus(), 50);
  }

  showChoice();

  authChoice.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-choice]');
    if (!btn) return;
    showForm(btn.dataset.choice);
  });

  authBack.addEventListener('click', showChoice);

  document.getElementById('auth-forgot').addEventListener('click', async () => {
    const email = authUser.value.trim();
    if (!email) {
      showErr('Entrez votre email ci-dessus, puis cliquez sur "Mot de passe oublié".');
      return;
    }
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://llossonmwe.github.io/lejardindelolo/'
      });
      if (error) throw error;
      showInfo('Un email de réinitialisation a été envoyé à ' + email + '. Vérifiez votre boîte de réception.');
    } catch (err) {
      showErr('Erreur : ' + (err.message || err));
    }
  });

  const showErr = (msg) => { authError.textContent = msg; authError.classList.remove('hidden'); authInfo.classList.add('hidden'); };
  const showInfo = (msg) => { authInfo.textContent = msg; authInfo.classList.remove('hidden'); authError.classList.add('hidden'); };

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    authInfo.classList.add('hidden');
    const email = authUser.value.trim();
    const password = authPass.value;
    if (!email || !password) return;
    authSubmit.disabled = true;
    try {
      if (authMode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          showInfo('Compte créé ! Vérifiez vos emails pour confirmer, puis connectez-vous.');
          authForm.reset();
          setTimeout(() => showForm('login'), 50);
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      showErr(translateAuthError(err));
    } finally {
      authSubmit.disabled = false;
    }
  });

  function translateAuthError(err) {
    const m = err?.message || String(err);
    if (/invalid login credentials/i.test(m)) return 'Email ou mot de passe incorrect.';
    if (/user already registered/i.test(m)) return 'Un compte existe déjà avec cet email.';
    if (/email.*confirm/i.test(m)) return 'Confirmez votre email avant de vous connecter.';
    if (/password/i.test(m) && /short|least/i.test(m)) return 'Mot de passe trop court (6 caractères min).';
    if (/rate/i.test(m)) return 'Trop de tentatives, réessayez plus tard.';
    return m;
  }

  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    location.reload();
  });

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      // User clicked a password reset link
      const newPassword = prompt('Entrez votre nouveau mot de passe (6 caractères min) :');
      if (newPassword && newPassword.length >= 6) {
        sb.auth.updateUser({ password: newPassword }).then(({ error }) => {
          if (error) {
            alert('Erreur : ' + error.message);
          } else {
            alert('Mot de passe mis à jour avec succès ! Vous êtes maintenant connecté.');
            // Clean URL hash
            history.replaceState(null, '', location.pathname);
          }
        });
      } else if (newPassword !== null) {
        alert('Le mot de passe doit faire au moins 6 caractères.');
      }
      return;
    }
    if (session?.user) {
      if (!appStarted) startApp(session.user);
    } else if (appStarted) {
      location.reload();
    }
  });

  sb.auth.getSession().then(({ data }) => {
    if (data.session?.user && !appStarted) startApp(data.session.user);
  });

  function startApp(user) {
    appStarted = true;
    currentUser = user;
    authScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    userGreeting.textContent = '— ' + (user.email || '');
    wireAppUI();
    reloadAll();
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA (Supabase)
  // ═══════════════════════════════════════════════════════════════
  async function fetchPlants() {
    const { data, error } = await sb.from('plants').select('*').order('created_at', { ascending: true });
    if (error) { console.error(error); toast('Erreur chargement plantes'); return []; }
    return data || [];
  }
  async function fetchJournal() {
    const { data, error } = await sb.from('journal').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); toast('Erreur chargement journal'); return []; }
    return data || [];
  }
  async function fetchProjects() {
    try {
      const { data, error } = await sb.from('plant_projects').select('*').order('created_at', { ascending: true });
      if (error) { console.warn('plant_projects:', error.message); return []; }
      return data || [];
    } catch (_) { return []; }
  }
  async function fetchPlots() {
    try {
      const { data, error } = await sb.from('garden_plots').select('*').order('created_at', { ascending: true });
      if (error) { console.warn('garden_plots:', error.message); return []; }
      return data || [];
    } catch (_) { return []; }
  }
  async function reloadAll() {
    state.plants = await fetchPlants();
    state.journal = await fetchJournal();
    state.projects = await fetchProjects();
    state.garden_plots = await fetchPlots();
    renderAll();
  }

  async function upsertPlant(plant) {
    const payload = {
      user_id: currentUser.id,
      name: plant.name,
      type: plant.type,
      location: plant.location || '',
      planted: plant.planted || null,
      interval_days: plant.interval_days,
      last_water: plant.last_water || null,
      last_prune: plant.last_prune || null,
      last_cuttings: plant.last_cuttings || null,
      last_divide: plant.last_divide || null,
      last_treat: plant.last_treat || null,
      photo_path: plant.photo_path || null,
      notes: plant.notes || ''
    };
    if (plant.id) {
      const { error } = await sb.from('plants').update(payload).eq('id', plant.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('plants').insert(payload);
      if (error) throw error;
    }
  }
  async function deletePlantById(id, photoPath) {
    const { error } = await sb.from('plants').delete().eq('id', id);
    if (error) throw error;
    if (photoPath) {
      try { await deletePhotoByPath(photoPath); } catch (_) { /* ignore orphan cleanup failures */ }
    }
  }
  async function markWatered(id) {
    const { error } = await sb.from('plants').update({ last_water: toISO(today()) }).eq('id', id);
    if (error) throw error;
  }
  async function markActionDone(id, actionKey) {
    const meta = ACTION_META[actionKey];
    if (!meta) throw new Error('action inconnue');
    const { error } = await sb.from('plants').update({ [meta.column]: toISO(today()) }).eq('id', id);
    if (error) throw error;
  }
  async function addJournalEntry(text) {
    const { error } = await sb.from('journal').insert({ user_id: currentUser.id, text });
    if (error) throw error;
  }
  async function deleteJournalEntry(id) {
    const { error } = await sb.from('journal').delete().eq('id', id);
    if (error) throw error;
  }

  // ═══════════════════════════════════════════════════════════════
  // UI wiring
  // ═══════════════════════════════════════════════════════════════
  let uiWired = false;
  function wireAppUI() {
    if (uiWired) return;
    uiWired = true;

    document.querySelectorAll('.tab[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        renderAll();
      });
    });

    document.getElementById('plants-grid').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const card = btn.closest('.plant-card');
      const id = card.dataset.id;
      const plant = state.plants.find(p => p.id === id);
      if (!plant) return;

      if (btn.dataset.action === 'water') {
        try { await markWatered(id); toast(`${plant.name} arrosée 💧`); await reloadAll(); }
        catch (err) { toast('Erreur: ' + err.message); }
      } else if (btn.dataset.action === 'edit') {
        openDialog(plant);
      } else if (btn.dataset.action === 'delete') {
        if (confirm(`Supprimer "${plant.name}" ?`)) {
          try { await deletePlantById(id, plant.photo_path); toast('Plante supprimée'); await reloadAll(); }
          catch (err) { toast('Erreur: ' + err.message); }
        }
      } else if (ACTION_META[btn.dataset.action]) {
        const key = btn.dataset.action;
        try {
          await markActionDone(id, key);
          toast(`${plant.name} : ${ACTION_META[key].short.toLowerCase()} enregistré ${ACTION_META[key].icon}`);
          await reloadAll();
        } catch (err) { toast('Erreur: ' + err.message); }
      }
    });

    document.getElementById('search').addEventListener('input', renderPlants);
    document.getElementById('filter-type').addEventListener('change', renderPlants);

    const photoCamera = document.getElementById('plant-photo-camera');
    const photoGallery = document.getElementById('plant-photo-gallery');
    const photoPreview = document.getElementById('plant-photo-preview');
    const photoRemoveWrap = document.getElementById('plant-photo-remove-wrap');
    const photoRemove = document.getElementById('plant-photo-remove');
    const photoPathInput = document.getElementById('plant-photo-path');

    const closePlantDialog = () => {
      if (photoState.previewUrl) {
        URL.revokeObjectURL(photoState.previewUrl);
        photoState.previewUrl = '';
      }
      photoState.file = null;
      document.getElementById('plant-dialog').close();
    };

    function handlePhotoFile(file) {
      if (!file) return;
      photoState.file = file;
      if (photoState.previewUrl) URL.revokeObjectURL(photoState.previewUrl);
      photoState.previewUrl = URL.createObjectURL(file);
      photoPreview.src = photoState.previewUrl;
      photoPreview.classList.remove('hidden');
      photoRemove.checked = false;
    }

    document.getElementById('plant-photo-camera-btn').addEventListener('click', () => { photoCamera.value = ''; photoCamera.click(); });
    document.getElementById('plant-photo-gallery-btn').addEventListener('click', () => { photoGallery.value = ''; photoGallery.click(); });
    photoCamera.addEventListener('change', () => handlePhotoFile(photoCamera.files && photoCamera.files[0]));
    photoGallery.addEventListener('change', () => handlePhotoFile(photoGallery.files && photoGallery.files[0]));

    document.getElementById('add-plant-btn').addEventListener('click', () => openDialog(null));
    document.getElementById('cancel-btn').addEventListener('click', closePlantDialog);

    document.getElementById('plant-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const file = photoState.file;
      const removeCurrentPhoto = photoRemove.checked;
      const previousPhotoPath = photoPathInput.value || '';
      const data = {
        id: f.querySelector('#plant-id').value || null,
        name: f.querySelector('#plant-name').value.trim(),
        type: f.querySelector('#plant-type').value,
        location: f.querySelector('#plant-location').value.trim(),
        planted: f.querySelector('#plant-planted').value,
        interval_days: Math.max(1, Math.min(60, parseInt(f.querySelector('#plant-interval').value, 10) || 3)),
        last_water: f.querySelector('#plant-lastwater').value,
        last_prune: f.querySelector('#plant-lastprune').value,
        last_cuttings: f.querySelector('#plant-lastcuttings').value,
        last_divide: f.querySelector('#plant-lastdivide').value,
        last_treat: f.querySelector('#plant-lasttreat').value,
        photo_path: previousPhotoPath,
        notes: f.querySelector('#plant-notes').value.trim()
      };
      if (!data.name) return;
      try {
        if (removeCurrentPhoto) {
          if (previousPhotoPath) {
            try { await deletePhotoByPath(previousPhotoPath); } catch (_) { /* ignore */ }
          }
          data.photo_path = null;
        }
        if (file) {
          const uploadedPath = await uploadPlantPhoto(file);
          data.photo_path = uploadedPath;
          if (previousPhotoPath && previousPhotoPath !== uploadedPath) {
            try { await deletePhotoByPath(previousPhotoPath); } catch (_) { /* ignore */ }
          }
        }
        await upsertPlant(data);
        toast(data.id ? 'Plante modifiée' : 'Plante ajoutée 🌱');
        closePlantDialog();
        await reloadAll();
      } catch (err) {
        toast('Erreur: ' + err.message);
      }
    });

    document.getElementById('tasks-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-task-action]');
      if (!btn) return;
      const plant = state.plants.find(p => p.id === btn.dataset.plant);
      if (!plant) return;
      const key = btn.dataset.taskAction;
      try {
        if (key === 'water') {
          await markWatered(plant.id);
          toast(`${plant.name} arrosée 💧`);
        } else if (ACTION_META[key]) {
          await markActionDone(plant.id, key);
          toast(`${plant.name} : ${ACTION_META[key].short.toLowerCase()} ${ACTION_META[key].icon}`);
        }
        await reloadAll();
      } catch (err) { toast('Erreur: ' + err.message); }
    });

    document.getElementById('journal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const txt = document.getElementById('journal-text').value.trim();
      if (!txt) return;
      try {
        await addJournalEntry(txt);
        document.getElementById('journal-text').value = '';
        toast('Entrée ajoutée 📓');
        await reloadAll();
      } catch (err) { toast('Erreur: ' + err.message); }
    });

    document.getElementById('journal-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-del]');
      if (!btn) return;
      try { await deleteJournalEntry(btn.dataset.del); await reloadAll(); }
      catch (err) { toast('Erreur: ' + err.message); }
    });

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

    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.plants) || !Array.isArray(data.journal)) throw new Error('bad format');
        if (!confirm('Ajouter les données du fichier à votre compte ?')) return;
        const plantRows = data.plants.map(p => ({
          user_id: currentUser.id,
          name: p.name || 'Sans nom',
          type: ['legume','fruit','fleur','aromate','arbre','autre'].includes(p.type) ? p.type : 'autre',
          location: p.location || '',
          planted: p.planted || null,
          interval_days: p.interval_days || p.interval || 3,
          last_water: p.last_water || p.lastWater || null,
          photo_path: p.photo_path || null,
          notes: p.notes || ''
        }));
        const journalRows = data.journal.map(j => ({
          user_id: currentUser.id,
          text: j.text || '',
          created_at: j.date || j.created_at || new Date().toISOString()
        })).filter(j => j.text);
        if (plantRows.length) {
          const { error } = await sb.from('plants').insert(plantRows);
          if (error) throw error;
        }
        if (journalRows.length) {
          const { error } = await sb.from('journal').insert(journalRows);
          if (error) throw error;
        }
        // Import projects if present
        if (Array.isArray(data.projects) && data.projects.length) {
          const projectRows = data.projects.map(p => ({
            user_id: currentUser.id,
            plant_name: p.plant_name || '',
            plant_type: p.plant_type || 'autre',
            target_action: p.target_action || 'plant',
            target_month: p.target_month || 1,
            notes: p.notes || '',
            status: p.status || 'planned'
          })).filter(p => p.plant_name);
          if (projectRows.length) {
            const { error } = await sb.from('plant_projects').insert(projectRows);
            if (error) throw error;
          }
        }
        toast('Import réussi ✅');
        await reloadAll();
      } catch (err) {
        alert('Import impossible : ' + err.message);
      }
      e.target.value = '';
    });

    document.getElementById('reset-btn').addEventListener('click', async () => {
      if (!confirm('Effacer TOUTES vos données (plantes + journal) ? Irréversible.')) return;
      try {
        const { error: e1 } = await sb.from('plants').delete().eq('user_id', currentUser.id);
        const { error: e2 } = await sb.from('journal').delete().eq('user_id', currentUser.id);
        const { error: e3 } = await sb.from('plant_projects').delete().eq('user_id', currentUser.id);
        const { error: e4 } = await sb.from('garden_plots').delete().eq('user_id', currentUser.id);
        if (e1 || e2 || e3 || e4) throw (e1 || e2 || e3 || e4);
        toast('Données effacées');
        await reloadAll();
      } catch (err) { toast('Erreur: ' + err.message); }
    });

    // Calendrier : navigation
    document.getElementById('cal-prev').addEventListener('click', () => { calMonth = (calMonth + 10) % 12 + 1; renderCalendar(); });
    document.getElementById('cal-next').addEventListener('click', () => { calMonth = calMonth % 12 + 1; renderCalendar(); });
    document.getElementById('cal-search').addEventListener('input', renderCalendar);
    document.getElementById('cal-filter').addEventListener('change', renderCalendar);
  }

  // ═══════════════════════════════════════════════════════════════
  // Rendus
  // ═══════════════════════════════════════════════════════════════
  const plantsGrid = document.getElementById('plants-grid');
  const emptyPlants = document.getElementById('empty-plants');
  const searchInput = document.getElementById('search');
  const filterType = document.getElementById('filter-type');

  function renderPlants() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const type = filterType.value;
    const filtered = state.plants.filter(p => {
      const matchQ = !q || (p.name || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q);
      const matchT = !type || p.type === type;
      return matchQ && matchT;
    });

    emptyPlants.classList.toggle('hidden', filtered.length > 0);
    plantsGrid.innerHTML = filtered.map(plant => {
      const status = waterStatus(plant);
      const next = nextWatering(plant);
      const cardClass = status.key === 'overdue' ? 'overdue' : status.key === 'today' ? 'today' : '';
      const actions = plantActions(plant);
      const photoUrl = getPhotoUrl(plant.photo_path);
      const actionsHTML = actions.length === 0 ? '' : `
        <div class="plant-actions">
          ${actions.map(a => {
            const lastTxt = a.last ? formatDate(parseDate(a.last)) : 'jamais';
            const nextTxt = a.next
              ? (a.next.thisMonth ? `<strong style="color:var(--warn)">ce mois-ci</strong>` : `${MONTHS_FR[a.next.month - 1]} ${a.next.year}`)
              : '—';
            return `
              <div class="plant-action-row">
                <div class="plant-action-info">
                  <span class="pa-icon">${a.meta.icon}</span>
                  <div>
                    <div class="pa-name">${esc(a.meta.short)}</div>
                    <div class="pa-meta">Dernière : ${lastTxt} · Prochaine : ${nextTxt}</div>
                  </div>
                </div>
                <button class="btn small" data-action="${a.key}" title="Marquer comme fait aujourd'hui">✓ Fait</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      return `
        <article class="plant-card ${cardClass}" data-id="${plant.id}">
          ${photoUrl
            ? `<img class="plant-photo" src="${esc(photoUrl)}" alt="Photo de ${esc(plant.name)}" loading="lazy" />`
            : `<div class="emoji">${TYPE_EMOJI[plant.type] || '🌱'}</div>`}
          <h3>${esc(plant.name)}</h3>
          <div class="meta">${esc(TYPE_LABEL[plant.type] || 'Autre')}${plant.location ? ' · ' + esc(plant.location) : ''}</div>
          <div class="meta">Plantée le ${formatDate(parseDate(plant.planted))}</div>
          <span class="water-status ${status.key}">💧 ${esc(status.label)}</span>
          <div class="meta">Prochain arrosage : ${formatDate(next)}</div>
          ${actionsHTML}
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

  function renderTasks() {
    const list = document.getElementById('tasks-list');
    const empty = document.getElementById('empty-tasks');

    // Tâches d'arrosage (toutes les plantes)
    const waterTasks = state.plants.map(p => ({
      kind: 'water',
      plant: p,
      label: waterStatus(p).label,
      sortKey: nextWatering(p).getTime(),
      cls: waterStatus(p).key === 'overdue' ? 'overdue' : waterStatus(p).key === 'today' ? 'today' : 'future',
      icon: '💧',
      btnLabel: '💧 Arrosé',
      actionKey: 'water'
    }));

    // Tâches calendaires "ce mois-ci" (taille, bouturage, division, traitement)
    const monthTasks = [];
    state.plants.forEach(p => {
      plantActions(p).forEach(a => {
        if (a.next && a.next.thisMonth) {
          monthTasks.push({
            kind: a.key,
            plant: p,
            label: `${a.meta.short} ce mois-ci`,
            sortKey: 0, // priorité haute (ce mois)
            cls: 'today',
            icon: a.meta.icon,
            btnLabel: `${a.meta.icon} Fait`,
            actionKey: a.key
          });
        }
      });
    });

    const tasks = [...monthTasks, ...waterTasks].sort((a, b) => a.sortKey - b.sortKey);
    empty.classList.toggle('hidden', tasks.length > 0);
    list.innerHTML = tasks.map(t => `
      <li class="task-item ${t.cls}" data-id="${t.plant.id}">
        <div>
          <strong>${TYPE_EMOJI[t.plant.type]} ${esc(t.plant.name)}</strong>
          <div class="task-when">${t.icon} ${esc(t.label)}</div>
        </div>
        <button class="btn primary" data-task-action="${t.actionKey}" data-plant="${t.plant.id}">${t.btnLabel}</button>
      </li>
    `).join('');
  }

  function renderJournal() {
    const journalList = document.getElementById('journal-list');
    journalList.innerHTML = state.journal.map(e => `
      <li class="journal-entry" data-id="${e.id}">
        <button class="delete-entry" data-del="${e.id}" title="Supprimer">✖</button>
        <time>${new Date(e.created_at).toLocaleString('fr-FR')}</time>
        <p>${esc(e.text)}</p>
      </li>
    `).join('');
  }

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

  function renderCalendar() {
    const data = window.PLANT_CALENDAR || [];
    const titleEl = document.getElementById('cal-title');
    const contentEl = document.getElementById('calendar-content');
    if (!titleEl || !contentEl) return;

    const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    titleEl.textContent = MONTHS[calMonth - 1];

    const q = (document.getElementById('cal-search').value || '').trim().toLowerCase();
    const filter = document.getElementById('cal-filter').value;

    const ACTIONS = [
      { key: 'sow_indoor',  label: 'Semis intérieur',  icon: '🏠' },
      { key: 'sow_outdoor', label: 'Semis extérieur',  icon: '🌱' },
      { key: 'plant',       label: 'Plantation',       icon: '🪴' },
      { key: 'harvest',     label: 'Récolte',          icon: '🌾' },
      { key: 'prune',       label: 'Taille / pincement', icon: '✂️' },
      { key: 'cuttings',    label: 'Bouturage',        icon: '🌿' },
      { key: 'divide',      label: 'Division / repiquage', icon: '🔀' },
      { key: 'treat',       label: 'Traitement',       icon: '💧' }
    ];

    const matchSearch = (p) => !q || p.name.toLowerCase().includes(q);

    const sections = ACTIONS
      .filter(a => !filter || filter === a.key)
      .map(a => {
        const plants = data
          .filter(p => (p[a.key] || []).includes(calMonth) && matchSearch(p))
          .sort((x, y) => x.name.localeCompare(y.name, 'fr'));
        return { action: a, plants };
      });

    contentEl.innerHTML = sections.map(({ action, plants }) => `
      <div class="cal-section ${action.key}">
        <h3>${action.icon} ${action.label} <span style="color:var(--muted);font-weight:400;font-size:0.85rem;">(${plants.length})</span></h3>
        ${plants.length === 0
          ? `<p class="empty-action">Rien à faire ce mois-ci.</p>`
          : `<div class="cal-tags">${plants.map(p => `
              <span class="cal-tag" title="${esc(TYPE_LABEL[p.type] || '')}">
                <span class="type-emoji">${TYPE_EMOJI[p.type] || '🌱'}</span>${esc(p.name)}
              </span>`).join('')}</div>`
        }
      </div>
    `).join('');
  }

  function openDialog(plant) {
    const dialog = document.getElementById('plant-dialog');
    const form = document.getElementById('plant-form');
    const dialogTitle = document.getElementById('dialog-title');
    const photoPreview = form.querySelector('#plant-photo-preview');
    const photoPathInput = form.querySelector('#plant-photo-path');
    const photoRemoveWrap = form.querySelector('#plant-photo-remove-wrap');
    const photoRemove = form.querySelector('#plant-photo-remove');
    form.reset();
    // reset preview state
    if (photoState.previewUrl) {
      URL.revokeObjectURL(photoState.previewUrl);
      photoState.previewUrl = '';
    }
    photoState.file = null;
    // reset hidden file inputs
    const camIn = document.getElementById('plant-photo-camera');
    const galIn = document.getElementById('plant-photo-gallery');
    if (camIn) camIn.value = '';
    if (galIn) galIn.value = '';
    photoPathInput.value = '';
    photoRemove.checked = false;
    photoPreview.src = '';
    photoPreview.classList.add('hidden');
    photoRemoveWrap.classList.add('hidden');
    if (plant) {
      dialogTitle.textContent = 'Modifier la plante';
      form.querySelector('#plant-id').value = plant.id;
      form.querySelector('#plant-name').value = plant.name || '';
      form.querySelector('#plant-type').value = plant.type || 'autre';
      form.querySelector('#plant-location').value = plant.location || '';
      form.querySelector('#plant-planted').value = plant.planted || '';
      form.querySelector('#plant-interval').value = plant.interval_days || 3;
      form.querySelector('#plant-lastwater').value = plant.last_water || '';
      form.querySelector('#plant-lastprune').value = plant.last_prune || '';
      form.querySelector('#plant-lastcuttings').value = plant.last_cuttings || '';
      form.querySelector('#plant-lastdivide').value = plant.last_divide || '';
      form.querySelector('#plant-lasttreat').value = plant.last_treat || '';
      photoPathInput.value = plant.photo_path || '';
      if (plant.photo_path) {
        photoPreview.src = getPhotoUrl(plant.photo_path);
        photoPreview.classList.remove('hidden');
        photoRemoveWrap.classList.remove('hidden');
      }
      form.querySelector('#plant-notes').value = plant.notes || '';
    } else {
      dialogTitle.textContent = 'Nouvelle plante';
      form.querySelector('#plant-id').value = '';
      form.querySelector('#plant-interval').value = 3;
      form.querySelector('#plant-planted').value = toISO(today());
    }
    dialog.showModal();
  }

  function renderAll() {
    renderPlants();
    renderTasks();
    renderCalendar();
    renderJournal();
    renderStats();
    Object.values(window.APP._extraRenders).forEach(fn => { try { fn(); } catch(e) { console.error(e); } });
  }

  // ─── Expose API for external modules ───
  window.APP = {
    get state() { return state; },
    get sb() { return sb; },
    get currentUser() { return currentUser; },
    toast, today, parseDate, formatDate, toISO, daysBetween, esc,
    TYPE_EMOJI, TYPE_LABEL, MONTHS_FR, ACTION_META,
    findCalendarEntry, plantActions, nextWatering, waterStatus, nextActionMonth,
    getPhotoUrl, reloadAll,
    _extraRenders: {}
  };
})();
