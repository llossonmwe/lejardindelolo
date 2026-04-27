// 👥 Module Communauté — Profils, amis, fil, messagerie, forum
(() => {
  'use strict';

  let profile = null;
  let friends = [];
  let pendingRequests = [];
  let feedPosts = [];
  let forumPosts = [];
  let conversations = [];
  let activeConversation = null; // userId
  let activeSubTab = 'feed';
  let profilesCache = {}; // userId -> profile

  function init() {
    wireEvents();
  }

  function wireEvents() {
    // Profile creation
    document.getElementById('social-create-profile').addEventListener('click', createProfile);

    // Sub-tabs
    document.querySelectorAll('.social-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSubTab = btn.dataset.subtab;
        document.querySelectorAll('.social-subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.social-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('social-' + activeSubTab).classList.add('active');
        loadSubTab();
      });
    });

    // Profile edit
    document.getElementById('social-profile-btn').addEventListener('click', showProfileEdit);
    document.getElementById('social-save-profile').addEventListener('click', saveProfile);
    document.getElementById('social-cancel-profile').addEventListener('click', () => {
      document.getElementById('social-profile-edit').classList.add('hidden');
    });

    // Feed post
    document.getElementById('social-post-submit').addEventListener('click', submitFeedPost);

    // Feed interactions (delegation)
    document.getElementById('social-feed-list').addEventListener('click', handlePostInteraction);

    // Friends search
    document.getElementById('social-search-btn').addEventListener('click', searchUsers);
    document.getElementById('social-search-user').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); searchUsers(); }
    });

    // Friends interactions (delegation)
    document.getElementById('social-search-results').addEventListener('click', handleFriendAction);
    document.getElementById('social-pending-requests').addEventListener('click', handleFriendAction);
    document.getElementById('social-friends-list').addEventListener('click', handleFriendAction);

    // Messages
    document.getElementById('social-chat-back').addEventListener('click', () => {
      activeConversation = null;
      renderMessages();
    });
    document.getElementById('social-chat-send').addEventListener('click', sendMessage);
    document.getElementById('social-chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('social-conversations').addEventListener('click', (e) => {
      const item = e.target.closest('[data-conv-user]');
      if (!item) return;
      activeConversation = item.dataset.convUser;
      renderChat();
    });

    // Forum
    document.getElementById('social-forum-submit').addEventListener('click', submitForumPost);
    document.getElementById('social-forum-list').addEventListener('click', handlePostInteraction);
  }

  // ─── Profile ───
  async function fetchProfile() {
    try {
      const { data, error } = await APP.sb.from('profiles').select('*').eq('id', APP.currentUser.id).single();
      if (error) { profile = null; return; }
      profile = data;
    } catch (_) { profile = null; }
  }

  async function createProfile() {
    const username = document.getElementById('social-username').value.trim();
    const bio = document.getElementById('social-bio').value.trim();
    if (!username) { APP.toast('Le pseudo est obligatoire'); return; }
    try {
      const { data, error } = await APP.sb.from('profiles').insert({
        id: APP.currentUser.id, username, bio
      }).select().single();
      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          APP.toast('Ce pseudo est déjà pris');
        } else { throw error; }
        return;
      }
      profile = data;
      APP.toast('Profil créé !');
      renderSocialTab();
    } catch (err) { APP.toast('Erreur : ' + err.message); }
  }

  function showProfileEdit() {
    if (!profile) return;
    document.getElementById('social-edit-username').value = profile.username;
    document.getElementById('social-edit-bio').value = profile.bio || '';
    document.getElementById('social-profile-edit').classList.remove('hidden');
  }

  async function saveProfile() {
    const username = document.getElementById('social-edit-username').value.trim();
    const bio = document.getElementById('social-edit-bio').value.trim();
    if (!username) { APP.toast('Le pseudo est obligatoire'); return; }
    try {
      const { error } = await APP.sb.from('profiles').update({ username, bio }).eq('id', APP.currentUser.id);
      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          APP.toast('Ce pseudo est déjà pris');
        } else { throw error; }
        return;
      }
      profile.username = username;
      profile.bio = bio;
      document.getElementById('social-profile-edit').classList.add('hidden');
      APP.toast('Profil mis à jour');
    } catch (err) { APP.toast('Erreur : ' + err.message); }
  }

  async function getProfile(userId) {
    if (profilesCache[userId]) return profilesCache[userId];
    try {
      const { data } = await APP.sb.from('profiles').select('*').eq('id', userId).single();
      if (data) profilesCache[userId] = data;
      return data;
    } catch (_) { return null; }
  }

  // ─── Friends ───
  async function fetchFriends() {
    try {
      const uid = APP.currentUser.id;
      const { data, error } = await APP.sb.from('friendships').select('*').eq('status', 'accepted');
      if (error) { friends = []; return; }
      friends = data || [];
    } catch (_) { friends = []; }
  }

  async function fetchPendingRequests() {
    try {
      const { data, error } = await APP.sb.from('friendships').select('*')
        .eq('addressee_id', APP.currentUser.id).eq('status', 'pending');
      if (error) { pendingRequests = []; return; }
      pendingRequests = data || [];
    } catch (_) { pendingRequests = []; }
  }

  function getFriendIds() {
    const uid = APP.currentUser.id;
    return friends.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);
  }

  async function searchUsers() {
    const q = document.getElementById('social-search-user').value.trim();
    if (!q) return;
    try {
      const { data, error } = await APP.sb.from('profiles').select('*')
        .ilike('username', `%${q}%`).limit(10);
      if (error) throw error;
      const results = (data || []).filter(p => p.id !== APP.currentUser.id);
      renderSearchResults(results);
    } catch (err) { APP.toast('Erreur recherche : ' + err.message); }
  }

  async function handleFriendAction(e) {
    const btn = e.target.closest('button[data-friend-action]');
    if (!btn) return;
    const action = btn.dataset.friendAction;
    const userId = btn.dataset.userId;
    const friendshipId = btn.dataset.friendshipId;

    try {
      if (action === 'add') {
        const { error } = await APP.sb.from('friendships').insert({
          requester_id: APP.currentUser.id, addressee_id: userId
        });
        if (error) {
          if (error.message.includes('unique') || error.message.includes('duplicate')) {
            APP.toast('Demande déjà envoyée');
          } else { throw error; }
          return;
        }
        APP.toast('Demande envoyée !');
      } else if (action === 'accept') {
        const { error } = await APP.sb.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
        if (error) throw error;
        APP.toast('Ami accepté !');
      } else if (action === 'decline') {
        const { error } = await APP.sb.from('friendships').delete().eq('id', friendshipId);
        if (error) throw error;
        APP.toast('Demande refusée');
      } else if (action === 'remove') {
        const { error } = await APP.sb.from('friendships').delete().eq('id', friendshipId);
        if (error) throw error;
        APP.toast('Ami retiré');
      } else if (action === 'message') {
        activeSubTab = 'messages';
        activeConversation = userId;
        document.querySelectorAll('.social-subtab').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-subtab="messages"]').classList.add('active');
        document.querySelectorAll('.social-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('social-messages').classList.add('active');
        await loadMessages();
        renderChat();
        return;
      }
      await loadFriends();
    } catch (err) { APP.toast('Erreur : ' + err.message); }
  }

  // ─── Posts ───
  async function fetchFeedPosts() {
    try {
      const friendIds = getFriendIds();
      const allIds = [APP.currentUser.id, ...friendIds];
      const { data, error } = await APP.sb.from('posts').select('*')
        .in('user_id', allIds).order('created_at', { ascending: false }).limit(50);
      if (error) { feedPosts = []; return; }
      feedPosts = data || [];
    } catch (_) { feedPosts = []; }
  }

  async function fetchForumPosts() {
    try {
      const { data, error } = await APP.sb.from('posts').select('*')
        .in('post_type', ['tip', 'question']).order('created_at', { ascending: false }).limit(50);
      if (error) { forumPosts = []; return; }
      forumPosts = data || [];
    } catch (_) { forumPosts = []; }
  }

  async function submitFeedPost() {
    const text = document.getElementById('social-post-text').value.trim();
    const type = document.getElementById('social-post-type').value;
    if (!text) { APP.toast('Écrivez quelque chose'); return; }
    try {
      const { error } = await APP.sb.from('posts').insert({
        user_id: APP.currentUser.id, content: text, post_type: type
      });
      if (error) throw error;
      document.getElementById('social-post-text').value = '';
      APP.toast('Publié !');
      await loadFeed();
    } catch (err) { APP.toast('Erreur : ' + err.message); }
  }

  async function submitForumPost() {
    const text = document.getElementById('social-forum-text').value.trim();
    const type = document.getElementById('social-forum-type').value;
    if (!text) { APP.toast('Écrivez quelque chose'); return; }
    try {
      const { error } = await APP.sb.from('posts').insert({
        user_id: APP.currentUser.id, content: text, post_type: type
      });
      if (error) throw error;
      document.getElementById('social-forum-text').value = '';
      APP.toast('Publié !');
      await loadForum();
    } catch (err) { APP.toast('Erreur : ' + err.message); }
  }

  async function handlePostInteraction(e) {
    const btn = e.target.closest('button[data-post-action]');
    if (!btn) return;
    const action = btn.dataset.postAction;
    const postId = btn.dataset.postId;

    try {
      if (action === 'like') {
        // Check if already liked
        const { data: existing } = await APP.sb.from('post_likes').select('id')
          .eq('post_id', postId).eq('user_id', APP.currentUser.id).single();
        if (existing) {
          await APP.sb.from('post_likes').delete().eq('id', existing.id);
        } else {
          await APP.sb.from('post_likes').insert({ post_id: postId, user_id: APP.currentUser.id });
        }
        if (activeSubTab === 'feed') await loadFeed();
        else await loadForum();
      } else if (action === 'comment') {
        const input = btn.parentElement.querySelector('.social-comment-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const { error } = await APP.sb.from('post_comments').insert({
          post_id: postId, user_id: APP.currentUser.id, content: text
        });
        if (error) throw error;
        input.value = '';
        if (activeSubTab === 'feed') await loadFeed();
        else await loadForum();
      } else if (action === 'delete') {
        const { error } = await APP.sb.from('posts').delete().eq('id', postId);
        if (error) throw error;
        APP.toast('Post supprimé');
        if (activeSubTab === 'feed') await loadFeed();
        else await loadForum();
      }
    } catch (err) { APP.toast('Erreur : ' + err.message); }
  }

  // ─── Messages ───
  async function fetchConversations() {
    try {
      const uid = APP.currentUser.id;
      const { data, error } = await APP.sb.from('messages').select('*')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false });
      if (error) { conversations = []; return; }

      // Group by other user
      const convMap = {};
      (data || []).forEach(m => {
        const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id;
        if (!convMap[otherId]) {
          convMap[otherId] = { userId: otherId, lastMessage: m, unread: 0, messages: [] };
        }
        if (!m.read && m.receiver_id === uid) convMap[otherId].unread++;
      });
      conversations = Object.values(convMap).sort((a, b) =>
        new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
      );
    } catch (_) { conversations = []; }
  }

  async function fetchChatMessages(userId) {
    try {
      const uid = APP.currentUser.id;
      const { data, error } = await APP.sb.from('messages').select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true });
      if (error) return [];
      // Mark as read
      await APP.sb.from('messages').update({ read: true })
        .eq('sender_id', userId).eq('receiver_id', uid).eq('read', false);
      return data || [];
    } catch (_) { return []; }
  }

  async function sendMessage() {
    if (!activeConversation) return;
    const input = document.getElementById('social-chat-input');
    const text = input.value.trim();
    if (!text) return;
    try {
      const { error } = await APP.sb.from('messages').insert({
        sender_id: APP.currentUser.id, receiver_id: activeConversation, content: text
      });
      if (error) throw error;
      input.value = '';
      await renderChat();
    } catch (err) { APP.toast('Erreur : ' + err.message); }
  }

  // ─── Data loaders ───
  async function loadFeed() {
    await fetchFeedPosts();
    await renderPostList(feedPosts, 'social-feed-list');
  }

  async function loadForum() {
    await fetchForumPosts();
    await renderPostList(forumPosts, 'social-forum-list');
  }

  async function loadFriends() {
    await fetchFriends();
    await fetchPendingRequests();
    await renderFriendsList();
    await renderPendingRequests();
  }

  async function loadMessages() {
    await fetchConversations();
    renderConversationsList();
    updateUnreadBadge();
  }

  async function loadSubTab() {
    if (activeSubTab === 'feed') await loadFeed();
    else if (activeSubTab === 'friends') await loadFriends();
    else if (activeSubTab === 'messages') await loadMessages();
    else if (activeSubTab === 'forum') await loadForum();
  }

  // ─── Rendering ───
  async function renderSocialTab() {
    await fetchProfile();

    if (!profile) {
      document.getElementById('social-profile-setup').classList.remove('hidden');
      document.getElementById('social-main').classList.add('hidden');
      return;
    }

    document.getElementById('social-profile-setup').classList.add('hidden');
    document.getElementById('social-main').classList.remove('hidden');

    await fetchFriends();
    await loadSubTab();
    updateUnreadBadge();
  }

  async function renderPostList(posts, containerId) {
    const el = document.getElementById(containerId);
    if (posts.length === 0) {
      el.innerHTML = '<p class="empty">Aucune publication pour le moment.</p>';
      return;
    }

    // Fetch profiles, likes, comments for all posts
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const profiles = {};
    for (const uid of userIds) {
      profiles[uid] = await getProfile(uid);
    }

    // Fetch likes counts and user likes
    const postIds = posts.map(p => p.id);
    let allLikes = [];
    try {
      const { data } = await APP.sb.from('post_likes').select('*').in('post_id', postIds);
      allLikes = data || [];
    } catch (_) {}

    // Fetch comments
    let allComments = [];
    try {
      const { data } = await APP.sb.from('post_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true });
      allComments = data || [];
    } catch (_) {}

    // Fetch comment author profiles
    const commentUserIds = [...new Set(allComments.map(c => c.user_id))];
    for (const uid of commentUserIds) {
      if (!profiles[uid]) profiles[uid] = await getProfile(uid);
    }

    const TYPE_ICONS = { garden: '🌱', tip: '💡', question: '❓' };
    const TYPE_LABELS = { garden: 'Mon jardin', tip: 'Conseil', question: 'Question' };
    const uid = APP.currentUser.id;

    el.innerHTML = posts.map(post => {
      const p = profiles[post.user_id];
      const username = p ? p.username : 'Utilisateur';
      const likes = allLikes.filter(l => l.post_id === post.id);
      const userLiked = likes.some(l => l.user_id === uid);
      const comments = allComments.filter(c => c.post_id === post.id);
      const isOwn = post.user_id === uid;
      const date = new Date(post.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      return `
        <div class="social-post">
          <div class="social-post-header">
            <div class="social-post-author">
              <span class="social-avatar-small">👤</span>
              <div>
                <strong>${APP.esc(username)}</strong>
                <span class="social-post-meta">${TYPE_ICONS[post.post_type] || ''} ${TYPE_LABELS[post.post_type] || ''} · ${date}</span>
              </div>
            </div>
            ${isOwn ? `<button class="btn small danger" data-post-action="delete" data-post-id="${post.id}">🗑️</button>` : ''}
          </div>
          <div class="social-post-content">${APP.esc(post.content)}</div>
          <div class="social-post-actions">
            <button class="btn small ${userLiked ? 'primary' : ''}" data-post-action="like" data-post-id="${post.id}">
              ${userLiked ? '❤️' : '🤍'} ${likes.length}
            </button>
            <span class="social-comment-count">💬 ${comments.length}</span>
          </div>
          <div class="social-comments">
            ${comments.map(c => {
              const cp = profiles[c.user_id];
              const cname = cp ? cp.username : 'Utilisateur';
              return `<div class="social-comment"><strong>${APP.esc(cname)}</strong> ${APP.esc(c.content)}</div>`;
            }).join('')}
            <div class="social-comment-form">
              <input type="text" class="social-comment-input" placeholder="Commenter..." maxlength="300" />
              <button class="btn small" data-post-action="comment" data-post-id="${post.id}">Envoyer</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSearchResults(results) {
    const el = document.getElementById('social-search-results');
    if (results.length === 0) {
      el.innerHTML = '<p class="empty">Aucun utilisateur trouvé.</p>';
      return;
    }
    const friendIds = getFriendIds();
    const pendingIds = pendingRequests.map(r => r.requester_id);
    // Also check sent requests
    const uid = APP.currentUser.id;

    el.innerHTML = results.map(u => {
      const isFriend = friendIds.includes(u.id);
      const isPending = pendingIds.includes(u.id);
      let actionBtn = '';
      if (isFriend) {
        actionBtn = '<span class="social-badge-inline">✅ Ami</span>';
      } else if (isPending) {
        actionBtn = '<span class="social-badge-inline">⏳ En attente</span>';
      } else {
        actionBtn = `<button class="btn primary small" data-friend-action="add" data-user-id="${u.id}">+ Ajouter</button>`;
      }
      return `
        <div class="social-user-card">
          <div class="social-user-info">
            <span class="social-avatar-small">👤</span>
            <div>
              <strong>${APP.esc(u.username)}</strong>
              ${u.bio ? `<div class="social-user-bio">${APP.esc(u.bio)}</div>` : ''}
            </div>
          </div>
          ${actionBtn}
        </div>
      `;
    }).join('');
  }

  async function renderPendingRequests() {
    const el = document.getElementById('social-pending-requests');
    if (pendingRequests.length === 0) { el.innerHTML = ''; return; }

    let html = '<h3>Demandes reçues</h3>';
    for (const req of pendingRequests) {
      const p = await getProfile(req.requester_id);
      const name = p ? p.username : 'Utilisateur';
      html += `
        <div class="social-user-card">
          <div class="social-user-info">
            <span class="social-avatar-small">👤</span>
            <strong>${APP.esc(name)}</strong>
          </div>
          <div class="social-req-actions">
            <button class="btn primary small" data-friend-action="accept" data-friendship-id="${req.id}">✅ Accepter</button>
            <button class="btn small" data-friend-action="decline" data-friendship-id="${req.id}">✖ Refuser</button>
          </div>
        </div>
      `;
    }
    el.innerHTML = html;
  }

  async function renderFriendsList() {
    const el = document.getElementById('social-friends-list');
    const titleEl = document.getElementById('social-friends-title');
    const friendIds = getFriendIds();

    if (friendIds.length === 0) {
      titleEl.classList.add('hidden');
      el.innerHTML = '<p class="empty">Pas encore d\'amis. Recherchez des utilisateurs ci-dessus !</p>';
      return;
    }

    titleEl.classList.remove('hidden');
    let html = '';
    for (const fid of friendIds) {
      const p = await getProfile(fid);
      const name = p ? p.username : 'Utilisateur';
      const bio = p && p.bio ? p.bio : '';
      const friendship = friends.find(f =>
        (f.requester_id === fid || f.addressee_id === fid)
      );
      html += `
        <div class="social-user-card">
          <div class="social-user-info">
            <span class="social-avatar-small">👤</span>
            <div>
              <strong>${APP.esc(name)}</strong>
              ${bio ? `<div class="social-user-bio">${APP.esc(bio)}</div>` : ''}
            </div>
          </div>
          <div class="social-req-actions">
            <button class="btn small" data-friend-action="message" data-user-id="${fid}">💬</button>
            <button class="btn small danger" data-friend-action="remove" data-friendship-id="${friendship ? friendship.id : ''}">✖</button>
          </div>
        </div>
      `;
    }
    el.innerHTML = html;
  }

  async function renderConversationsList() {
    const el = document.getElementById('social-conversations');
    if (activeConversation) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    document.getElementById('social-chat').classList.add('hidden');

    if (conversations.length === 0) {
      el.innerHTML = '<p class="empty">Aucune conversation. Envoyez un message à un ami !</p>';
      return;
    }

    let html = '';
    for (const conv of conversations) {
      const p = await getProfile(conv.userId);
      const name = p ? p.username : 'Utilisateur';
      const lastMsg = conv.lastMessage;
      const preview = lastMsg.content.length > 50 ? lastMsg.content.slice(0, 50) + '...' : lastMsg.content;
      const date = new Date(lastMsg.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      html += `
        <div class="social-conv-item" data-conv-user="${conv.userId}">
          <div class="social-conv-info">
            <span class="social-avatar-small">👤</span>
            <div>
              <strong>${APP.esc(name)}</strong>
              <div class="social-conv-preview">${APP.esc(preview)}</div>
            </div>
          </div>
          <div class="social-conv-meta">
            <span class="social-conv-date">${date}</span>
            ${conv.unread > 0 ? `<span class="social-badge">${conv.unread}</span>` : ''}
          </div>
        </div>
      `;
    }
    el.innerHTML = html;
  }

  async function renderChat() {
    if (!activeConversation) return;
    document.getElementById('social-conversations').classList.add('hidden');
    const chatEl = document.getElementById('social-chat');
    chatEl.classList.remove('hidden');

    const p = await getProfile(activeConversation);
    document.getElementById('social-chat-name').textContent = p ? p.username : 'Utilisateur';

    const messages = await fetchChatMessages(activeConversation);
    const msgEl = document.getElementById('social-chat-messages');
    const uid = APP.currentUser.id;

    msgEl.innerHTML = messages.map(m => {
      const isOwn = m.sender_id === uid;
      const time = new Date(m.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="social-msg ${isOwn ? 'social-msg-own' : 'social-msg-other'}">
          <div class="social-msg-bubble">${APP.esc(m.content)}</div>
          <span class="social-msg-time">${time}</span>
        </div>
      `;
    }).join('');

    msgEl.scrollTop = msgEl.scrollHeight;
    updateUnreadBadge();
  }

  function renderMessages() {
    if (activeConversation) {
      renderChat();
    } else {
      renderConversationsList();
    }
  }

  function updateUnreadBadge() {
    const badge = document.getElementById('social-unread-badge');
    const total = conversations.reduce((sum, c) => sum + c.unread, 0);
    if (total > 0) {
      badge.textContent = total;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Wait for APP
  const waitForApp = setInterval(() => {
    if (window.APP) {
      clearInterval(waitForApp);
      init();
      window.APP._extraRenders.social = () => {
        if (document.getElementById('social').classList.contains('active')) {
          renderSocialTab();
        }
      };
    }
  }, 50);
})();
