// SFGC Web Admin & Live Lyrics Projection SPA Controller
const BIBLE_BOOKS_66 = [
  { eng: 'Genesis', tel: 'ఆదికాండము', chapters: 50 },
  { eng: 'Exodus', tel: 'నిర్గమకాండము', chapters: 40 },
  { eng: 'Leviticus', tel: 'లేవీయకాండము', chapters: 27 },
  { eng: 'Numbers', tel: 'సంఖ్యాకాండము', chapters: 36 },
  { eng: 'Deuteronomy', tel: 'ద్వితీయోపదేశకాండము', chapters: 34 },
  { eng: 'Joshua', tel: 'యెహోషువ', chapters: 24 },
  { eng: 'Judges', tel: 'న్యాయాధిపతులు', chapters: 21 },
  { eng: 'Ruth', tel: 'రూతు', chapters: 4 },
  { eng: '1 Samuel', tel: '1 సమూయేలు', chapters: 31 },
  { eng: '2 Samuel', tel: '2 సమూయేలు', chapters: 24 },
  { eng: '1 Kings', tel: '1 రాజులు', chapters: 22 },
  { eng: '2 Kings', tel: '2 రాజులు', chapters: 25 },
  { eng: '1 Chronicles', tel: '1 దినవృత్తాంతములు', chapters: 29 },
  { eng: '2 Chronicles', tel: '2 దినవృత్తాంతములు', chapters: 36 },
  { eng: 'Ezra', tel: 'ఎజ్రా', chapters: 10 },
  { eng: 'Nehemiah', tel: 'నెహెమ్యా', chapters: 13 },
  { eng: 'Esther', tel: 'ఎస్తేరు', chapters: 10 },
  { eng: 'Job', tel: 'యోబు', chapters: 42 },
  { eng: 'Psalms', tel: 'కీర్తనలు', chapters: 150 },
  { eng: 'Proverbs', tel: 'సామెతలు', chapters: 31 },
  { eng: 'Ecclesiastes', tel: 'ప్రసంగి', chapters: 12 },
  { eng: 'Song of Solomon', tel: 'పరమగీతము', chapters: 8 },
  { eng: 'Isaiah', tel: 'యెషయా', chapters: 66 },
  { eng: 'Jeremiah', tel: 'యిర్మీయా', chapters: 52 },
  { eng: 'Lamentations', tel: 'విలాపవాక్యములు', chapters: 5 },
  { eng: 'Ezekiel', tel: 'యెహెజ్కేలు', chapters: 48 },
  { eng: 'Daniel', tel: 'దానియేలు', chapters: 12 },
  { eng: 'Hosea', tel: 'హోషేయ', chapters: 14 },
  { eng: 'Joel', tel: 'యోవేలు', chapters: 3 },
  { eng: 'Amos', tel: 'ఆమోసు', chapters: 9 },
  { eng: 'Obadiah', tel: 'ఓబద్యా', chapters: 1 },
  { eng: 'Jonah', tel: 'యోనా', chapters: 4 },
  { eng: 'Micah', tel: 'మీకా', chapters: 7 },
  { eng: 'Nahum', tel: 'నహూము', chapters: 3 },
  { eng: 'Habakkuk', tel: 'హబక్కూకు', chapters: 3 },
  { eng: 'Zephaniah', tel: 'జెఫన్యా', chapters: 3 },
  { eng: 'Haggai', tel: 'హగ్గయి', chapters: 2 },
  { eng: 'Zechariah', tel: 'జెకర్యా', chapters: 14 },
  { eng: 'Malachi', tel: 'మలాకీ', chapters: 4 },
  { eng: 'Matthew', tel: 'మత్తయి సువార్త', chapters: 28 },
  { eng: 'Mark', tel: 'మార్కు సువార్త', chapters: 16 },
  { eng: 'Luke', tel: 'లూకా సువార్త', chapters: 24 },
  { eng: 'John', tel: 'యోహాను సువార్త', chapters: 21 },
  { eng: 'Acts', tel: 'అపొస్తలుల కార్యములు', chapters: 28 },
  { eng: 'Romans', tel: 'రోమీయులకు', chapters: 16 },
  { eng: '1 Corinthians', tel: '1 కొరింథీయులకు', chapters: 16 },
  { eng: '2 Corinthians', tel: '2 కొరింథీయులకు', chapters: 13 },
  { eng: 'Galatians', tel: 'గలతీయులకు', chapters: 6 },
  { eng: 'Ephesians', tel: 'ఎఫెసీయులకు', chapters: 6 },
  { eng: 'Philippians', tel: 'ఫిలిప్పీయులకు', chapters: 4 },
  { eng: 'Colossians', tel: 'కొలస్సీయులకు', chapters: 4 },
  { eng: '1 Thessalonians', tel: '1 దెస్సలొనీకయులకు', chapters: 5 },
  { eng: '2 Thessalonians', tel: '2 దెస్సలొనీకయులకు', chapters: 3 },
  { eng: '1 Timothy', tel: '1 తిమోతికి', chapters: 6 },
  { eng: '2 Timothy', tel: '2 తిమోతికి', chapters: 4 },
  { eng: 'Titus', tel: 'తీతుకు', chapters: 3 },
  { eng: 'Philemon', tel: 'ఫిలేమోనుకు', chapters: 1 },
  { eng: 'Hebrews', tel: 'హెబ్రీయులకు', chapters: 13 },
  { eng: 'James', tel: 'యాకోబు', chapters: 5 },
  { eng: '1 Peter', tel: '1 పేతురు', chapters: 5 },
  { eng: '2 Peter', tel: '2 పేతురు', chapters: 3 },
  { eng: '1 John', tel: '1 యోహాను', chapters: 5 },
  { eng: '2 John', tel: '2 యోహాను', chapters: 1 },
  { eng: '3 John', tel: '3 యోహాను', chapters: 1 },
  { eng: 'Jude', tel: 'యూదా', chapters: 1 },
  { eng: 'Revelation', tel: 'ప్రకటన గ్రంథము', chapters: 22 }
];

class ChurchApp {
  constructor() {
    this.socket = null;
    this.songs = [];
    this.members = [];
    this.events = [];
    this.notices = [];
    this.notifications = [];
    this.builderPortions = [];
    this.activeSong = null;
    this.activeSlideIndex = 0;
    this.activeLineIndex = -1;
    this.blackScreen = false;
    this.blankScreen = false;
    this.init();
  }

  async init() {
    this.initSocket();
    this.initNavigation();
    this.initKeyboardShortcuts();
    this.initPlanBuilder();

    const isAuthenticated = await this.initAuth();
    if (isAuthenticated) {
      await this.refreshAll();
    }
  }

  // Token & Admin Auth Helpers
  getToken() {
    return localStorage.getItem('churchAdminToken') || '';
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('churchAdminToken', token);
    } else {
      localStorage.removeItem('churchAdminToken');
    }
  }

  async initAuth() {
    const token = this.getToken();
    const savedUser = localStorage.getItem('churchAdminUser');
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUser = user;
        this.showMainLayout(user);
        return true;
      } catch (e) {
        console.warn('Saved user parse error:', e);
      }
    }

    if (token) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          localStorage.setItem('churchAdminUser', JSON.stringify(data.user));
          this.currentUser = data.user;
          this.showMainLayout(data.user);
          return true;
        }
      } catch (err) {
        console.warn('Auth verify error:', err);
      }
    }

    this.showLoginScreen();
    return false;
  }

  showMainLayout(user) {
    const loginScreen = document.getElementById('adminLoginScreen');
    const appLayout = document.getElementById('adminAppLayout');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';

    const nameEl = document.getElementById('adminUserName');
    const roleEl = document.getElementById('adminUserRole');
    if (nameEl) nameEl.innerText = user?.name || 'Church Administrator';
    if (roleEl) roleEl.innerText = user?.role || 'Administrator';
  }

  showLoginScreen() {
    const loginScreen = document.getElementById('adminLoginScreen');
    const appLayout = document.getElementById('adminAppLayout');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';
  }

  async handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errEl = document.getElementById('loginErrorMsg');
    const btnSubmit = document.getElementById('btnLoginSubmit');

    if (!email || !password) {
      if (errEl) { errEl.innerText = 'Please enter both email and password.'; errEl.style.display = 'block'; }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...'; }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
        localStorage.setItem('churchAdminUser', JSON.stringify(data.user));
        this.currentUser = data.user;
        this.showMainLayout(data.user);
        await this.refreshAll();
      } else {
        if (errEl) { errEl.innerText = data.message || 'Invalid email or password.'; errEl.style.display = 'block'; }
      }
    } catch (err) {
      if (errEl) { errEl.innerText = 'Server connection error: ' + err.message; errEl.style.display = 'block'; }
    } finally {
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = '<span>Sign In to Admin Panel</span> <i class="fa-solid fa-arrow-right"></i>'; }
    }
  }

  async performModalLogin() {
    const email = document.getElementById('modalLoginEmail')?.value.trim();
    const password = document.getElementById('modalLoginPassword')?.value.trim();

    if (!email || !password) {
      this.showToast('Please enter both email and password.', 'error');
      return;
    }

    this.setButtonLoading('btnModalLoginSubmit', true, 'Authenticating...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
        localStorage.setItem('churchAdminUser', JSON.stringify(data.user));
        this.currentUser = data.user;
        this.showMainLayout(data.user);
        this.closeModal('loginModal');
        this.showToast('🎉 Logged in as Admin successfully!', 'success');
        await this.refreshAll();
      } else {
        this.showToast(data.message || 'Invalid email or password.', 'error');
      }
    } catch (err) {
      this.showToast('Server connection error: ' + err.message, 'error');
    } finally {
      this.setButtonLoading('btnModalLoginSubmit', false, '', 'Sign In as Admin');
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  toggleNotifDropdown() {
    const panel = document.getElementById('notifDropdownPanel');
    if (panel) {
      panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
    }
  }

  clearNotifs() {
    this.notifications = [];
    const list = document.getElementById('adminNotifList');
    const badge = document.getElementById('notifBadgeCount');
    if (list) list.innerHTML = '<div class="notif-empty-state">No new member notifications yet.</div>';
    if (badge) badge.style.display = 'none';
    this.showToast('Notifications cleared', 'info');
  }

  async testApi(endpoint) {
    const output = document.getElementById('apiOutput');
    if (!output) return;
    output.innerText = `Executing request: GET ${endpoint}...`;
    try {
      const res = await this.authFetch(endpoint);
      const data = await res.json();
      output.innerText = JSON.stringify(data, null, 2);
      this.showToast(`Fetched ${endpoint} successfully!`, 'success');
    } catch (err) {
      output.innerText = `API Request Error (${endpoint}):\n${err.message}`;
      this.showToast(`API call failed: ${err.message}`, 'error');
    }
  }

  quickFillLogin(email, password) {
    const emailEl = document.getElementById('loginEmail') || document.getElementById('modalLoginEmail');
    const passEl = document.getElementById('loginPassword') || document.getElementById('modalLoginPassword');
    if (emailEl) emailEl.value = email;
    if (passEl) passEl.value = password;
  }

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      if (icon) icon.className = 'fa-solid fa-eye';
    }
  }

  logout() {
    this.setToken('');
    localStorage.removeItem('churchAdminUser');
    this.currentUser = null;
    this.showLoginScreen();
    this.showToast('Logged out of Admin Portal.', 'info');
  }

  setButtonLoading(btnOrId, isLoading, loadingText, defaultHtml) {
    const btn = typeof btnOrId === 'string' ? document.getElementById(btnOrId) : btnOrId;
    if (!btn) return;

    if (isLoading) {
      if (!btn.dataset.originalHtml) {
        btn.dataset.originalHtml = btn.innerHTML;
      }
      btn.disabled = true;
      btn.style.opacity = '0.85';
      btn.style.cursor = 'not-allowed';
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText || 'Saving...'}`;
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.innerHTML = defaultHtml || btn.dataset.originalHtml || 'Save';
    }
  }

  async authFetch(url, options = {}) {
    let token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    options.headers = headers;

    const res = await fetch(url, options);
    if (res.status === 401) {
      this.logout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }

  // Socket.IO Real-time Connection
  initSocket() {
    try {
      this.socket = io();

      this.socket.on('connect', () => {
        console.log('✅ Connected to SFGC Live Socket Engine');
        const pingEl = document.getElementById('serverPing');
        if (pingEl) pingEl.innerText = 'Connected | Socket Active';
      });

      this.socket.on('sessionState', (state) => {
        if (state && state.song) {
          this.activeSong = state.song;
          this.activeSlideIndex = state.currentSlideIndex || 0;
          this.activeLineIndex = state.highlightedLineIndex ?? -1;
          this.blackScreen = Boolean(state.blackScreen);
          this.blankScreen = Boolean(state.blankScreen);
          this.renderStageScreen();
          this.renderSlideTriggers();
        }
      });

      this.socket.on('slideChanged', ({ currentSlideIndex, highlightedLineIndex }) => {
        this.activeSlideIndex = currentSlideIndex;
        this.activeLineIndex = highlightedLineIndex !== undefined ? highlightedLineIndex : -1;
        this.renderStageScreen();
        this.highlightActiveTrigger();
      });

      this.socket.on('screenStateChanged', ({ blackScreen, blankScreen }) => {
        this.blackScreen = blackScreen;
        this.blankScreen = blankScreen;
        this.renderStageScreen();
        this.updateOverrideButtons();
      });

      this.socket.on('lineHighlighted', ({ lineIndex }) => {
        this.activeLineIndex = lineIndex;
        this.renderStageScreen();
      });

      this.socket.on('sessionEnded', () => {
        this.activeSong = null;
        this.renderStageScreen();
        this.renderSlideTriggers();
      });
    } catch (e) {
      console.warn('Socket init warning:', e);
    }
  }

  // Tab Navigation
  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));

    // Auto-close mobile sidebar if open
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay') || document.querySelector('.sidebar-overlay');
    if (sidebar && sidebar.classList.contains('mobile-active')) {
      sidebar.classList.remove('mobile-active');
      if (overlay) overlay.classList.remove('active');
    }

    const targetNav = document.querySelector(`[data-tab="${tabId}"]`);
    const targetPane = document.getElementById(`tab-${tabId}`);

    if (targetNav) targetNav.classList.add('active');
    if (targetPane) targetPane.classList.add('active');

    const titles = {
      overview: { title: 'Overview & Insights', sub: 'Real-time church metrics, administration, and live service control.' },
      projection: { title: 'Sanctuary Live Lyrics Projection Console', sub: 'Real-time multi-screen projector and mobile synchronized slide operator.' },
      members: { title: 'Members & Families Directory', sub: 'Member management, family units, and duty assignment rosters.' },
      songs: { title: 'Hymns & Worship Songs Catalog', sub: 'Multi-slide Telugu & English lyrics library with guitar chords support.' },
      events: { title: 'Services & Church Gatherings', sub: 'Schedule worship gatherings, communion services, and monitor RSVPs.' },
      notices: { title: 'Church Notices & Bulletin Broadcast', sub: 'Publish announcements directly to member mobile devices.' },
      stream: { title: 'Sanctuary Live Stream Broadcast', sub: 'Synchronize active YouTube live service broadcast.' },
      bibleplans: { title: 'Bible Study Plans & Member Reading Analytics', sub: 'Monitor member reading streaks, AI quiz completions, and upload customized reading plan templates.' },
      api: { title: 'API Interactive Explorer', sub: 'Execute backend API requests and inspect real-time responses.' },
    };

    if (tabId === 'overview') {
      this.loadOverviewPromise();
    } else if (tabId === 'bibleplans') {
      this.loadBiblePlanStats();
    } else if (tabId === 'stream') {
      this.loadYouTubeMediaList();
    }

    if (titles[tabId]) {
      document.getElementById('tabTitle').innerText = titles[tabId].title;
      document.getElementById('tabSubtitle').innerText = titles[tabId].sub;
    }
  }

  // Comprehensive Keyboard Shortcuts for Live Projection Console
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Allow searching when typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        const searchInput = document.getElementById('projSongSearch');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.prevSlide();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.firstSlide();
      } else if (e.key === 'End') {
        e.preventDefault();
        this.lastSlide();
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.toggleBlackout();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.toggleBlank();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.toggleLogo();
      } else if (/^[1-9]$/.test(e.key)) {
        const slideIndex = parseInt(e.key, 10) - 1;
        if (this.activeSong && this.activeSong.lyrics?.[slideIndex]) {
          e.preventDefault();
          this.selectSlide(slideIndex);
        }
      }
    });
  }

  // Fetch all data from backend
  async refreshAll() {
    try {
      const [songsRes, membersRes, eventsRes, noticesRes, streamRes] = await Promise.all([
        fetch('/api/songs').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/events').then(r => r.json()),
        fetch('/api/notices').then(r => r.json()),
        fetch('/api/stream').then(r => r.json()),
      ]);

      if (songsRes.success) this.songs = songsRes.songs;
      if (membersRes.success) this.members = membersRes.members;
      if (eventsRes.success) this.events = eventsRes.events;
      if (noticesRes.success) this.notices = noticesRes.notices;

      if (streamRes.success && streamRes.state) {
        const streamInput = document.getElementById('streamUrlInput');
        if (streamInput) streamInput.value = streamRes.state.activeYoutubeLink || '';
      }

      this.updateStats();
      this.loadAppVersionConfig();
      this.renderOverview();
      this.renderSongsTable();
      this.renderProjectionSongsList();
      this.renderMembersTable();
      this.renderEventsTable();
      this.renderNoticesTable();
      await this.loadDailyPromisesTable();
      await this.loadBiblePlanStats();
      await this.loadUserProgress();
      await this.loadOverviewPromise();
    } catch (err) {
      console.error('Error refreshing backend data:', err);
    }
  }

  updateStats() {
    document.getElementById('statMembersCount').innerText = this.members.length;
    document.getElementById('statSongsCount').innerText = this.songs.length;
    document.getElementById('statEventsCount').innerText = this.events.length;
  }

  renderOverview() {
    // Recent Notices
    const noticesList = document.getElementById('overviewNoticesList');
    if (noticesList) {
      if (this.notices.length === 0) {
        noticesList.innerHTML = '<p class="text-muted">No notices posted yet.</p>';
      } else {
        noticesList.innerHTML = this.notices.slice(0, 3).map(n => `
          <div class="compact-item">
            <div>
              <h4>${n.title}</h4>
              <p>${n.description.substring(0, 80)}...</p>
            </div>
            <span class="badge badge-primary">${n.time || 'Notice'}</span>
          </div>
        `).join('');
      }
    }

    // Upcoming Events
    const eventsList = document.getElementById('overviewEventsList');
    if (eventsList) {
      if (this.events.length === 0) {
        eventsList.innerHTML = '<p class="text-muted">No services scheduled yet.</p>';
      } else {
        eventsList.innerHTML = this.events.slice(0, 3).map(e => `
          <div class="compact-item">
            <div>
              <h4>${e.title}</h4>
              <p>${e.venue} • ${e.speaker || 'Speaker TBA'}</p>
            </div>
            <span class="badge badge-success">${e.time || 'Scheduled'}</span>
          </div>
        `).join('');
      }
    }
  }

  // PROJECTION & LIVE LYRICS METHODS
  renderProjectionSongsList() {
    this.filterProjectionSongs();
  }

  clearProjSearch() {
    const input = document.getElementById('projSongSearch');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.filterProjectionSongs();
  }

  setSongFilterLang(lang) {
    this.selectedSongLangFilter = lang;
    const btns = document.querySelectorAll('.proj-filter-btn');
    btns.forEach(b => {
      if (b.dataset.lang === lang) {
        b.classList.add('active', 'btn-primary');
        b.classList.remove('btn-outline');
      } else {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      }
    });
    this.filterProjectionSongs();
  }

  filterProjectionSongs() {
    const list = document.getElementById('projSongsList');
    if (!list) return;

    const queryInput = document.getElementById('projSongSearch');
    const query = (queryInput?.value || '').toLowerCase().trim();
    const clearBtn = document.getElementById('projSearchClearBtn');
    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }

    const langFilter = this.selectedSongLangFilter || 'all';
    const catFilter = (document.getElementById('projCategoryFilter')?.value || '').toLowerCase().trim();

    let filtered = this.songs || [];

    // Language filter
    if (langFilter !== 'all') {
      filtered = filtered.filter(s => (s.language || '').toLowerCase() === langFilter.toLowerCase());
    }

    // Category filter
    if (catFilter) {
      filtered = filtered.filter(s => {
        const cat = (s.category || '').toLowerCase();
        const tags = Array.isArray(s.tags) ? s.tags.map(t => String(t).toLowerCase()) : [];
        if (catFilter === 'akk') {
          return cat.includes('akk') || cat.includes('hymn') || tags.includes('akk') || tags.includes('keerthanalu');
        }
        return cat.includes(catFilter) || tags.includes(catFilter);
      });
    }

    // Search query filter (matches title, category, tags, or lyrics)
    if (query) {
      filtered = filtered.filter(s => {
        const inTitle = (s.title || '').toLowerCase().includes(query);
        const inCat = (s.category || '').toLowerCase().includes(query);
        const inTags = Array.isArray(s.tags) && s.tags.some(t => String(t).toLowerCase().includes(query));
        const inLyrics = Array.isArray(s.lyrics) && s.lyrics.some(l => (l.text || '').toLowerCase().includes(query));
        return inTitle || inCat || inTags || inLyrics;
      });
    }

    // Update song count badge
    const countBadge = document.getElementById('projSongCountBadge');
    if (countBadge) {
      countBadge.innerText = filtered.length;
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="text-center py-5 text-muted" style="font-size:13px;">
          <i class="fa-solid fa-music-slash mb-2" style="font-size:28px; opacity:0.4;"></i><br>
          No songs found matching "<strong>${query || langFilter}</strong>"<br>
          <button class="btn btn-xs btn-outline mt-3" onclick="app.clearProjSearch(); app.setSongFilterLang('all');">Reset Filters</button>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(song => {
      const isActive = this.activeSong?._id === song._id;
      const hasChords = song.chords || (song.lyrics || []).some(l => l.chords || (l.text && l.text.includes('[')));
      const slideCount = song.lyrics?.length || 0;

      return `
        <div class="proj-song-card ${isActive ? 'active-proj-card' : ''}" onclick="app.loadSongToProjector('${song._id}')">
          <div class="proj-card-top">
            <h4 class="proj-card-title">${song.title}</h4>
            ${isActive ? '<span class="proj-badge-live"><span class="pulse-red-dot"></span> LIVE</span>' : ''}
          </div>
          <div class="proj-card-meta">
            <span class="badge ${song.language === 'Telugu' ? 'badge-telugu' : 'badge-english'}">${song.language || 'Telugu'}</span>
            <span class="badge badge-category">${song.category || 'Worship'}</span>
            <span class="badge badge-slides"><i class="fa-solid fa-layer-group"></i> ${slideCount} Slides</span>
            ${hasChords ? '<span class="badge badge-chords"><i class="fa-solid fa-guitar"></i> Chords</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  loadSongToProjector(songId) {
    const song = this.songs.find(s => s._id === songId);
    if (!song) return;

    this.activeSong = song;
    this.activeSlideIndex = 0;
    this.activeLineIndex = -1;
    this.blackScreen = false;
    this.blankScreen = false;
    this.logoScreen = false;

    if (this.socket) {
      this.socket.emit('startSession', { song, slideIndex: 0 });
    }

    // Update status bar
    const titleEl = document.getElementById('activeSongTitle');
    const metaEl = document.getElementById('activeSongMeta');
    const indicatorEl = document.getElementById('projLiveIndicator');
    const deckBadge = document.getElementById('deckSlideCountBadge');

    if (titleEl) titleEl.innerText = song.title;
    if (metaEl) metaEl.innerText = `${song.category || 'Worship'} • ${song.language || 'Telugu'} • ${song.lyrics?.length || 0} Slides`;
    if (indicatorEl) {
      indicatorEl.className = 'proj-status-dot active';
    }
    if (deckBadge) deckBadge.innerText = `${song.lyrics?.length || 0} Slides`;

    this.updateOverrideButtons();
    this.renderStageScreen();
    this.renderNextSlidePreview();
    this.renderSlideTriggers();
    this.renderProjectionSongsList();
  }

  selectSlide(index) {
    if (!this.activeSong || !this.activeSong.lyrics?.[index]) return;
    this.activeSlideIndex = index;
    this.activeLineIndex = -1;

    if (this.socket) {
      this.socket.emit('changeSlide', { currentSlideIndex: index, highlightedLineIndex: -1 });
    }

    this.renderStageScreen();
    this.renderNextSlidePreview();
    this.highlightActiveTrigger();
  }

  firstSlide() {
    if (!this.activeSong) return;
    this.selectSlide(0);
  }

  lastSlide() {
    if (!this.activeSong || !this.activeSong.lyrics) return;
    this.selectSlide(this.activeSong.lyrics.length - 1);
  }

  nextSlide() {
    if (!this.activeSong) return;
    if (this.activeSlideIndex < (this.activeSong.lyrics?.length || 0) - 1) {
      this.selectSlide(this.activeSlideIndex + 1);
    }
  }

  prevSlide() {
    if (!this.activeSong) return;
    if (this.activeSlideIndex > 0) {
      this.selectSlide(this.activeSlideIndex - 1);
    }
  }

  toggleBlackout() {
    this.blackScreen = !this.blackScreen;
    if (this.blackScreen) {
      this.blankScreen = false;
      this.logoScreen = false;
    }
    if (this.socket) {
      this.socket.emit('screenState', { blackScreen: this.blackScreen, blankScreen: this.blankScreen, logoScreen: this.logoScreen });
    }
    this.renderStageScreen();
    this.updateOverrideButtons();
  }

  toggleBlank() {
    this.blankScreen = !this.blankScreen;
    if (this.blankScreen) {
      this.blackScreen = false;
      this.logoScreen = false;
    }
    if (this.socket) {
      this.socket.emit('screenState', { blackScreen: this.blackScreen, blankScreen: this.blankScreen, logoScreen: this.logoScreen });
    }
    this.renderStageScreen();
    this.updateOverrideButtons();
  }

  toggleLogo() {
    this.logoScreen = !this.logoScreen;
    if (this.logoScreen) {
      this.blackScreen = false;
      this.blankScreen = false;
    }
    if (this.socket) {
      this.socket.emit('screenState', { blackScreen: this.blackScreen, blankScreen: this.blankScreen, logoScreen: this.logoScreen });
    }
    this.renderStageScreen();
    this.updateOverrideButtons();
  }

  updateOverrideButtons() {
    const btnB = document.getElementById('btnBlackout');
    const btnClr = document.getElementById('btnBlank');
    const btnLogo = document.getElementById('btnLogo');
    if (btnB) btnB.classList.toggle('active', !!this.blackScreen);
    if (btnClr) btnClr.classList.toggle('active', !!this.blankScreen);
    if (btnLogo) btnLogo.classList.toggle('active', !!this.logoScreen);
  }

  openProjectorWindow() {
    const w = 1280;
    const h = 720;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    window.open('/tv.html', 'SFGC_Sanctuary_Projector', `width=${w},height=${h},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes`);
  }

  endLiveSession() {
    if (this.socket) {
      this.socket.emit('endSession');
    }
    this.activeSong = null;
    this.blackScreen = false;
    this.blankScreen = false;
    this.logoScreen = false;

    const titleEl = document.getElementById('activeSongTitle');
    const metaEl = document.getElementById('activeSongMeta');
    const indicatorEl = document.getElementById('projLiveIndicator');
    const deckBadge = document.getElementById('deckSlideCountBadge');

    if (titleEl) titleEl.innerText = 'No Song Loaded on Projector';
    if (metaEl) metaEl.innerText = 'Select a song from the library to begin live projection';
    if (indicatorEl) indicatorEl.className = 'proj-status-dot standby';
    if (deckBadge) deckBadge.innerText = '0 Slides';

    this.updateOverrideButtons();
    this.renderStageScreen();
    this.renderNextSlidePreview();
    this.renderSlideTriggers();
    this.renderProjectionSongsList();
  }

  renderStageScreen() {
    const contentEl = document.getElementById('stageScreenContent');
    const slideIndicator = document.getElementById('stageSlideIndicator');

    if (!this.activeSong) {
      if (slideIndicator) slideIndicator.innerText = 'Slide 0 of 0';
      if (contentEl) contentEl.innerHTML = '<p class="stage-placeholder">Select a song to start live projection</p>';
      return;
    }

    const totalSlides = this.activeSong.lyrics?.length || 0;
    const slide = this.activeSong.lyrics?.[this.activeSlideIndex];
    const slideType = slide?.type || `Slide ${this.activeSlideIndex + 1}`;

    if (slideIndicator) {
      slideIndicator.innerText = `Slide ${this.activeSlideIndex + 1} of ${totalSlides} • [${slideType}]`;
    }

    if (this.blackScreen) {
      contentEl.innerHTML = '<p class="stage-placeholder" style="color: #64748b; font-weight:700;"><i class="fa-solid fa-moon mb-2" style="font-size:24px;"></i><br>[ SCREEN BLACKOUT ACTIVE ]</p>';
      return;
    }

    if (this.blankScreen) {
      contentEl.innerHTML = '<p class="stage-placeholder" style="color: #ef4444; font-weight:700;"><i class="fa-solid fa-eye-slash mb-2" style="font-size:24px;"></i><br>[ TEXT BLANKED BY OPERATOR ]</p>';
      return;
    }

    if (this.logoScreen) {
      contentEl.innerHTML = '<p class="stage-placeholder" style="color: #6366f1; font-weight:700;"><i class="fa-solid fa-church mb-2" style="font-size:28px;"></i><br>[ CHURCH LOGO DISPLAY ]</p>';
      return;
    }

    if (!slide) return;

    const lines = (slide.text || '').split('\n').filter(Boolean);
    contentEl.innerHTML = `
      <div class="stage-slide-type">${slideType}</div>
      ${lines.map((l, idx) => `
        <div class="stage-line ${this.activeLineIndex === idx ? 'highlighted' : ''}" 
             style="cursor: pointer; padding: 4px 10px; border-radius: 6px; margin-bottom: 3px;" 
             onclick="app.selectLine(${idx})" 
             title="Click to highlight this line live on sanctuary projector">${l}</div>
      `).join('')}
    `;
  }

  renderNextSlidePreview() {
    const nextContentEl = document.getElementById('nextSlideContent');
    const nextIndicator = document.getElementById('nextSlideIndicator');
    if (!nextContentEl) return;

    if (!this.activeSong || !this.activeSong.lyrics) {
      if (nextIndicator) nextIndicator.innerText = 'Next Slide Preview';
      nextContentEl.innerHTML = '<p class="stage-placeholder">No song loaded</p>';
      return;
    }

    const nextIndex = this.activeSlideIndex + 1;
    const totalSlides = this.activeSong.lyrics.length;

    if (nextIndex >= totalSlides) {
      if (nextIndicator) nextIndicator.innerText = 'End of Song';
      nextContentEl.innerHTML = '<p class="stage-placeholder" style="color:#64748b;">[ End of Song - No Upcoming Slide ]</p>';
      return;
    }

    const nextSlide = this.activeSong.lyrics[nextIndex];
    const nextType = nextSlide?.type || `Slide ${nextIndex + 1}`;
    if (nextIndicator) {
      nextIndicator.innerText = `Slide ${nextIndex + 1} of ${totalSlides} • [${nextType}]`;
    }

    const nextLines = (nextSlide.text || '').split('\n').filter(Boolean);
    nextContentEl.innerHTML = `
      <div class="stage-slide-type" style="background: rgba(168,85,247,0.15); color: #d8b4fe;">${nextType}</div>
      ${nextLines.map(l => `<div class="stage-line" style="font-size:14px; color:#94a3b8; line-height:1.4;">${l}</div>`).join('')}
    `;
  }

  selectLine(lineIndex) {
    if (this.activeLineIndex === lineIndex) {
      this.activeLineIndex = -1;
    } else {
      this.activeLineIndex = lineIndex;
    }
    if (this.socket) {
      this.socket.emit('highlightLine', { highlightedLineIndex: this.activeLineIndex });
    }
    this.renderStageScreen();
  }

  renderSlideTriggers() {
    const grid = document.getElementById('slidesGrid');
    if (!grid) return;

    if (!this.activeSong || !this.activeSong.lyrics || this.activeSong.lyrics.length === 0) {
      grid.innerHTML = '<p class="empty-hint">Load a song from the left library to display lyric slide triggers.</p>';
      return;
    }

    grid.innerHTML = this.activeSong.lyrics.map((slide, index) => {
      const type = (slide.type || `Slide ${index + 1}`).trim();
      let tagClass = 'tag-other';
      const lc = type.toLowerCase();
      if (lc.includes('chorus') || lc.includes('పల్లవి')) tagClass = 'tag-chorus';
      else if (lc.includes('verse') || lc.includes('చరణం')) tagClass = 'tag-verse';
      else if (lc.includes('bridge') || lc.includes('అనుపల్లవి')) tagClass = 'tag-bridge';

      const isActive = this.activeSlideIndex === index;

      return `
        <div class="slide-trigger-card ${isActive ? 'active' : ''}" onclick="app.selectSlide(${index})" id="slide-card-${index}">
          <div class="slide-card-header">
            <span class="slide-trigger-tag ${tagClass}">${type}</span>
            <span class="slide-num-badge">#${index + 1}</span>
          </div>
          <div class="slide-trigger-text">${slide.text}</div>
        </div>
      `;
    }).join('');
  }

  highlightActiveTrigger() {
    const cards = document.querySelectorAll('.slide-trigger-card');
    cards.forEach((c, idx) => {
      c.classList.toggle('active', idx === this.activeSlideIndex);
    });

    const activeCard = document.getElementById(`slide-card-${this.activeSlideIndex}`);
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // SONGS CATALOG METHODS
  renderSongsTable() {
    const tbody = document.getElementById('songsTableBody');
    if (!tbody) return;

    if (this.songs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No songs in catalog yet.</td></tr>';
      return;
    }

    tbody.innerHTML = this.songs.map(song => `
      <tr>
        <td><strong>${song.title}</strong></td>
        <td><span class="badge ${song.language === 'Telugu' ? 'badge-amber' : 'badge-primary'}">${song.language}</span></td>
        <td>${song.category}</td>
        <td>${song.lyrics?.length || 0} Slides</td>
        <td>${song.chords ? '<i class="fa-solid fa-check text-emerald"></i> Available' : '<span class="text-muted">-</span>'}</td>
        <td>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="btn btn-sm btn-outline" style="padding: 4px 8px;" onclick="app.loadSongToProjector('${song._id}'); app.switchTab('projection');" title="Project Live">
              <i class="fa-solid fa-desktop"></i> Project
            </button>
            <button class="btn btn-sm btn-outline" style="padding: 4px 8px;" onclick="app.openSongModal('${song._id}')" title="Edit Song">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger-action" style="padding: 4px 8px;" onclick="app.deleteSong('${song._id}')" title="Delete Song">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openSongModal(songId = null) {
    const hiddenId = document.getElementById('songIdInput');
    const title = document.getElementById('songModalTitle');
    const fullLyricsBox = document.getElementById('songFullLyricsInput');

    if (songId) {
      const song = this.songs.find(s => s._id === songId);
      if (!song) return;
      if (hiddenId) hiddenId.value = song._id;
      if (title) title.innerText = 'Edit Worship Song';
      document.getElementById('songTitleInput').value = song.title || '';
      document.getElementById('songLangInput').value = song.language || 'Telugu';
      document.getElementById('songCategoryInput').value = song.category || 'Worship Songs';
      document.getElementById('songYoutubeInput').value = song.youtubeLink || '';
      document.getElementById('songChordsInput').value = song.chords || '';

      const joinedLyrics = (song.lyrics || []).map(l => l.text).join('\n\n');
      if (fullLyricsBox) {
        fullLyricsBox.value = joinedLyrics;
        this.onFullLyricsInputChange(joinedLyrics);
      }

      const editorContainer = document.getElementById('slidesEditorContainer');
      if (editorContainer && song.lyrics && song.lyrics.length > 0) {
        editorContainer.innerHTML = '';
        song.lyrics.forEach(l => this.addSlideInputBox(l.type || 'Verse 1', l.text || ''));
        editorContainer.style.display = 'block';
      }
    } else {
      if (hiddenId) hiddenId.value = '';
      if (title) title.innerText = 'Add New Worship Song';
      document.getElementById('songTitleInput').value = '';
      document.getElementById('songLangInput').value = 'Telugu';
      document.getElementById('songCategoryInput').value = 'Worship Songs';
      document.getElementById('songYoutubeInput').value = '';
      document.getElementById('songChordsInput').value = '';
      if (fullLyricsBox) {
        fullLyricsBox.value = '';
        this.onFullLyricsInputChange('');
      }
    }

    document.getElementById('songModal').classList.add('active');
  }

  editSong(id) {
    this.openSongModal(id);
  }

  onFullLyricsInputChange(val) {
    const raw = (val || '').trim();
    const countBadge = document.getElementById('parsedSlidesCount');
    const previewList = document.getElementById('slidesPreviewList');

    if (!raw) {
      if (countBadge) countBadge.innerText = '0';
      if (previewList) previewList.innerHTML = '<span class="text-muted" style="font-size:12px;">Type or paste full song above to preview slides automatically.</span>';
      return;
    }

    // Split by Double Enter (\n\n or blank lines)
    const blocks = raw.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
    if (countBadge) countBadge.innerText = blocks.length;

    if (previewList) {
      previewList.innerHTML = blocks.map((block, idx) => `
        <div class="preview-slide-chip">
          <strong>Slide ${idx + 1} (Verse ${idx + 1})</strong>
          <p>${block}</p>
        </div>
      `).join('');
    }
  }

  toggleManualSlidesEditor() {
    const container = document.getElementById('slidesEditorContainer');
    if (!container) return;
    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';
    if (isHidden && container.children.length === 0) {
      this.populateManualSlidesFromWideBox();
    }
  }

  populateManualSlidesFromWideBox() {
    const raw = (document.getElementById('songFullLyricsInput')?.value || '').trim();
    const container = document.getElementById('slidesEditorContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!raw) {
      this.addSlideInputBox('Verse 1', '');
      return;
    }

    const blocks = raw.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
    blocks.forEach((block, idx) => {
      this.addSlideInputBox(`Verse ${idx + 1}`, block);
    });
  }

  addSlideInputBox(typeVal = 'Verse 1', textVal = '') {
    const container = document.getElementById('slidesEditorContainer');
    const div = document.createElement('div');
    div.className = 'form-group slide-box-editor mt-2 p-2 border-rounded';
    div.style.background = '#f8fafc';
    div.style.border = '1px solid #e2e8f0';
    div.style.borderRadius = '8px';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
        <input type="text" class="form-control slide-type-field" value="${typeVal}" placeholder="Slide Section Title (Verse 1, Chorus, Bridge, etc)" style="flex:1; font-weight:700;">
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-outline" onclick="this.closest('.slide-box-editor').querySelector('.slide-type-field').value='Verse 1'">V1</button>
          <button type="button" class="btn btn-sm btn-outline" onclick="this.closest('.slide-box-editor').querySelector('.slide-type-field').value='Chorus'">Chorus</button>
          <button type="button" class="btn btn-sm btn-outline" onclick="this.closest('.slide-box-editor').querySelector('.slide-type-field').value='Bridge'">Bridge</button>
          <button type="button" class="btn btn-sm btn-outline" onclick="this.closest('.slide-box-editor').querySelector('.slide-type-field').value='Pre-Chorus'">Pre-Chorus</button>
        </div>
        <button type="button" class="btn btn-sm btn-danger-action" onclick="this.closest('.slide-box-editor').remove()" title="Remove Slide"><i class="fa-solid fa-trash"></i></button>
      </div>
      <textarea class="form-control slide-text-field" rows="3" placeholder="Enter lyric lines...">${textVal}</textarea>
    `;
    container.appendChild(div);
  }

  async saveSongSubmit() {
    const id = document.getElementById('songIdInput')?.value;
    const title = document.getElementById('songTitleInput').value.trim();
    const language = document.getElementById('songLangInput').value || 'Telugu';
    const category = document.getElementById('songCategoryInput').value.trim() || 'Worship Songs';
    const youtubeLink = document.getElementById('songYoutubeInput').value.trim();
    const chords = document.getElementById('songChordsInput').value;

    const fullLyricsRaw = (document.getElementById('songFullLyricsInput')?.value || '').trim();
    let lyrics = [];

    const editorContainer = document.getElementById('slidesEditorContainer');
    if (editorContainer && editorContainer.style.display !== 'none' && editorContainer.children.length > 0) {
      const slideBoxes = document.querySelectorAll('.slide-box-editor');
      slideBoxes.forEach(box => {
        const type = box.querySelector('.slide-type-field').value.trim() || 'Verse';
        const text = box.querySelector('.slide-text-field').value.trim();
        if (text) lyrics.push({ type, text });
      });
    } else if (fullLyricsRaw) {
      // Auto-extract slides based on Double Enter (\n\n)
      const blocks = fullLyricsRaw.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
      blocks.forEach((b, idx) => {
        lyrics.push({ type: `Verse ${idx + 1}`, text: b });
      });
    }

    if (!title || lyrics.length === 0) {
      this.showToast('Please provide Song Title and at least one verse/slide of lyrics.', 'error');
      return;
    }

    this.setButtonLoading('btnSubmitSong', true, id ? 'Updating Song...' : 'Saving Song...');

    try {
      const url = id ? `/api/songs/${id}` : '/api/songs';
      const method = id ? 'PUT' : 'POST';
      const res = await this.authFetch(url, {
        method,
        body: JSON.stringify({ title, language, category, youtubeLink, chords, lyrics })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(id ? '🎉 Song updated successfully!' : '🎉 Song created successfully!', 'success');
        this.closeModal('songModal');
        await this.refreshAll();
      } else {
        this.showToast('Error: ' + data.message, 'error');
      }
    } catch (e) {
      this.showToast('Failed to save song: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSubmitSong', false, '', 'Save Song');
    }
  }

  async loadAppVersionConfig() {
    try {
      const res = await fetch('/api/config/app-version');
      const data = await res.json();
      if (data.success && data.config) {
        const cfg = data.config;
        if (document.getElementById('cfgLatestVersion')) document.getElementById('cfgLatestVersion').value = cfg.latestVersion || '1.0.1';
        if (document.getElementById('cfgMinVersion')) document.getElementById('cfgMinVersion').value = cfg.minVersion || '1.0.0';
        if (document.getElementById('cfgDownloadUrl')) document.getElementById('cfgDownloadUrl').value = cfg.downloadUrl || 'https://sfgc-church.onrender.com';
        if (document.getElementById('cfgUpdateNotes')) document.getElementById('cfgUpdateNotes').value = cfg.updateNotes || '';
        if (document.getElementById('cfgForceUpdate')) document.getElementById('cfgForceUpdate').checked = Boolean(cfg.forceUpdate);
      }
    } catch (e) {
      console.warn('Load app version config warning:', e);
    }
  }

  async handleUpdateAppVersion(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSaveAppVersion');
    this.setButtonLoading(btn, true, 'Publishing App Update...');

    const payload = {
      latestVersion: document.getElementById('cfgLatestVersion').value.trim(),
      minVersion: document.getElementById('cfgMinVersion').value.trim(),
      downloadUrl: document.getElementById('cfgDownloadUrl').value.trim(),
      updateNotes: document.getElementById('cfgUpdateNotes').value.trim(),
      forceUpdate: document.getElementById('cfgForceUpdate').checked,
      notifyUsers: document.getElementById('cfgNotifyUsers').checked,
    };

    try {
      const res = await this.authFetch('/api/config/app-version', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🎉 ${data.message}`, 'success');
        await this.loadAppVersionConfig();
      } else {
        this.showToast(`⚠️ ${data.message || 'Failed to update app version.'}`, 'error');
      }
    } catch (err) {
      this.showToast('App version update failed: ' + err.message, 'error');
    } finally {
      this.setButtonLoading(btn, false, '', 'Release & Publish App Update');
    }
  }


  async deleteSong(id) {
    if (!confirm('Are you sure you want to delete this song?')) return;
    try {
      await this.authFetch(`/api/songs/${id}`, { method: 'DELETE' });
      this.showToast('Song deleted.', 'info');
      await this.refreshAll();
    } catch (e) {
      this.showToast('Delete failed: ' + e.message, 'error');
    }
  }

  // MEMBERS METHODS
  renderMembersTable() {
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;

    if (this.members.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No members registered yet.</td></tr>';
      return;
    }

    tbody.innerHTML = this.members.map(m => `
      <tr>
        <td>
          <strong>${m.name}</strong><br>
          <small class="text-muted">${m.familyName || 'Family Unit'} • ${m.familyMembersCount || 1} members</small>
        </td>
        <td>
          <span>${m.email}</span><br>
          <small class="text-muted">${m.mobileNumber || m.location || '-'}</small>
        </td>
        <td><span class="badge ${m.role === 'Admin' ? 'badge-admin' : 'badge-primary'}">${m.role}</span></td>
        <td>
          ${(m.departments || []).length > 0 
            ? m.departments.map(d => `<span class="badge badge-primary" style="margin: 2px;">${d}</span>`).join('') 
            : '<span class="text-muted">None</span>'}
        </td>
        <td>
          ${(m.assignments || []).length > 0
            ? m.assignments.map(a => `<small style="display:block;">• <strong>${a.title}</strong> (${a.role})</small>`).join('')
            : '<span class="text-muted">No active duties</span>'}
        </td>
        <td>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="btn btn-sm btn-outline" style="padding:4px 8px;" onclick="app.openAssignmentModal('${m._id}', '${m.name.replace(/'/g, "\\'")}')" title="Assign Duty">
              <i class="fa-solid fa-plus"></i> Duty
            </button>
            <button class="btn btn-sm btn-outline" style="padding:4px 8px;" onclick="app.openEditMemberModal('${m._id}')" title="Edit Role & Departments">
              <i class="fa-solid fa-user-gear"></i> Access
            </button>
            <button class="btn btn-sm btn-danger-action" style="padding:4px 8px;" onclick="app.deleteMember('${m._id}')" title="Delete Member">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  filterMembers() {
    const q = (document.getElementById('memberSearchInput').value || '').toLowerCase();
    const dept = document.getElementById('memberDeptFilter').value;

    const filtered = this.members.filter(m => {
      const matchText = (m.name || '').toLowerCase().includes(q) ||
                        (m.email || '').toLowerCase().includes(q) ||
                        (m.familyName || '').toLowerCase().includes(q) ||
                        (m.mobileNumber || '').includes(q);
      const matchDept = !dept || (m.departments || []).includes(dept);
      return matchText && matchDept;
    });

    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(m => `
      <tr>
        <td>
          <strong>${m.name}</strong><br>
          <small class="text-muted">${m.familyName || 'Family Unit'}</small>
        </td>
        <td>${m.email}<br><small class="text-muted">${m.mobileNumber || '-'}</small></td>
        <td><span class="badge ${m.role === 'Admin' ? 'badge-admin' : 'badge-primary'}">${m.role}</span></td>
        <td>${(m.departments || []).join(', ') || '-'}</td>
        <td>${(m.assignments || []).length} assigned</td>
        <td>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="btn btn-sm btn-outline" style="padding:4px 8px;" onclick="app.openAssignmentModal('${m._id}', '${m.name.replace(/'/g, "\\'")}')">
              <i class="fa-solid fa-plus"></i> Duty
            </button>
            <button class="btn btn-sm btn-outline" style="padding:4px 8px;" onclick="app.openEditMemberModal('${m._id}')">
              <i class="fa-solid fa-user-gear"></i> Access
            </button>
            <button class="btn btn-sm btn-danger-action" style="padding:4px 8px;" onclick="app.deleteMember('${m._id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openAddMemberModal() {
    document.getElementById('addMemberName').value = '';
    document.getElementById('addMemberEmail').value = '';
    document.getElementById('addMemberPassword').value = 'member123';
    document.getElementById('addMemberPhone').value = '';
    document.getElementById('addMemberFamily').value = '';
    document.getElementById('addMemberRole').value = 'Member';
    document.getElementById('addMemberModal').classList.add('active');
  }

  async saveAddMemberSubmit() {
    const name = document.getElementById('addMemberName').value.trim();
    const email = document.getElementById('addMemberEmail').value.trim();
    const password = document.getElementById('addMemberPassword').value.trim();
    const mobileNumber = document.getElementById('addMemberPhone').value.trim();
    const familyName = document.getElementById('addMemberFamily').value.trim();
    const role = document.getElementById('addMemberRole').value;

    if (!name || !email || !password) {
      this.showToast('Name, Email, and Password are required.', 'error');
      return;
    }

    this.setButtonLoading('btnSubmitAddMember', true, 'Creating Profile...');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, mobileNumber, familyName, role })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🎉 Member ${name} registered successfully!`, 'success');
        this.closeModal('addMemberModal');
        await this.refreshAll();
      } else {
        this.showToast('Failed: ' + (data.message || 'Error creating member'), 'error');
      }
    } catch (e) {
      this.showToast('Error registering member: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSubmitAddMember', false, '', 'Save Member Profile');
    }
  }

  async deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member profile? This action cannot be undone.')) return;
    try {
      const res = await this.authFetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.showToast('Member profile deleted successfully.', 'success');
        await this.refreshAll();
      } else {
        this.showToast('Delete failed: ' + (data.message || 'Error'), 'error');
      }
    } catch (e) {
      this.showToast('Delete failed: ' + e.message, 'error');
    }
  }

  openEditMemberModal(id) {
    const m = this.members.find(u => u._id === id);
    if (!m) return;

    document.getElementById('editMemberId').value = m._id;
    document.getElementById('editMemberName').value = m.name;
    document.getElementById('editMemberEmail').value = m.email;
    document.getElementById('editMemberRoleSelect').value = m.role || 'Member';
    document.getElementById('editMemberCustomDept').value = '';

    const checks = document.querySelectorAll('.edit-dept-check');
    const userDepts = m.departments || [];
    checks.forEach(c => {
      c.checked = userDepts.includes(c.value);
    });

    document.getElementById('editMemberModal').classList.add('active');
  }

  async saveMemberAccessSubmit() {
    const id = document.getElementById('editMemberId').value;
    const role = document.getElementById('editMemberRoleSelect').value;
    const customDept = document.getElementById('editMemberCustomDept').value.trim();

    const selectedDepts = [];
    const checks = document.querySelectorAll('.edit-dept-check:checked');
    checks.forEach(c => selectedDepts.push(c.value));

    if (customDept && !selectedDepts.includes(customDept)) {
      selectedDepts.push(customDept);
    }

    this.setButtonLoading('btnSaveMemberAccess', true, 'Saving Access Level...');

    try {
      const res = await this.authFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ role, departments: selectedDepts })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('🎉 Member role & department access updated successfully!', 'success');
        this.closeModal('editMemberModal');
        await this.refreshAll();
      } else {
        this.showToast('Failed: ' + (data.message || 'Error'), 'error');
      }
    } catch (e) {
      this.showToast('Update failed: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSaveMemberAccess', false, '', 'Save Access & Department');
    }
  }

  openAssignmentModal(memberId, memberName) {
    document.getElementById('assignMemberId').value = memberId;
    document.getElementById('assignMemberName').value = memberName;
    document.getElementById('assignTitle').value = '';
    document.getElementById('assignRole').value = '';
    document.getElementById('assignNotes').value = '';
    document.getElementById('assignmentModal').classList.add('active');
  }

  async saveAssignmentSubmit() {
    const id = document.getElementById('assignMemberId').value;
    const title = document.getElementById('assignTitle').value.trim();
    const role = document.getElementById('assignRole').value.trim();
    const department = document.getElementById('assignDept').value;
    const date = document.getElementById('assignDate').value;
    const notes = document.getElementById('assignNotes').value.trim();

    if (!title || !role) {
      this.showToast('Please fill Duty Title and Role.', 'error');
      return;
    }

    this.setButtonLoading('btnSubmitAssignment', true, 'Assigning Duty Role...');

    try {
      const res = await this.authFetch(`/api/users/${id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ title, role, department, date, notes })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('🎉 Duty assigned successfully!', 'success');
        this.closeModal('assignmentModal');
        await this.refreshAll();
      } else {
        this.showToast('Error: ' + data.message, 'error');
      }
    } catch (e) {
      this.showToast('Assignment failed: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSubmitAssignment', false, '', 'Confirm Assignment');
    }
  }

  // EVENTS METHODS
  renderEventsTable() {
    const totalCount = this.events ? this.events.length : 0;
    
    // Update Overview & Events Tab Stat Counters
    const statEventsCount = document.getElementById('statEventsCount');
    if (statEventsCount) statEventsCount.innerText = totalCount;

    const statTotalEventsCount = document.getElementById('statTotalEventsCount');
    if (statTotalEventsCount) statTotalEventsCount.innerText = totalCount;

    const badgeEventsCount = document.getElementById('badgeEventsCount');
    if (badgeEventsCount) badgeEventsCount.innerText = `${totalCount} ${totalCount === 1 ? 'Event' : 'Events'}`;

    let totalRSVPs = 0;
    let upcomingCount = 0;
    const nowTimestamp = new Date().getTime() - (24 * 60 * 60 * 1000);

    if (Array.isArray(this.events)) {
      this.events.forEach(ev => {
        totalRSVPs += (ev.rsvps || []).length;
        const evTime = new Date(ev.date).getTime();
        if (isNaN(evTime) || evTime >= nowTimestamp) {
          upcomingCount++;
        }
      });
    }

    const statTotalEventRSVPs = document.getElementById('statTotalEventRSVPs');
    if (statTotalEventRSVPs) statTotalEventRSVPs.innerText = totalRSVPs;

    const statUpcomingEventsCount = document.getElementById('statUpcomingEventsCount');
    if (statUpcomingEventsCount) statUpcomingEventsCount.innerText = upcomingCount;

    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    if (totalCount === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fa-solid fa-calendar-xmark" style="font-size:32px; color:#cbd5e1; margin-bottom:8px; display:block;"></i>No church events created yet. Click <strong>Create New Event</strong> above to publish your first service.</td></tr>';
      return;
    }

    tbody.innerHTML = this.events.map(ev => {
      const parsedDate = new Date(ev.date);
      const dateDisplay = !isNaN(parsedDate.getTime()) 
        ? parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : ev.date;

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              ${(ev.banner || ev.imageUrl) 
                ? `<img src="${ev.banner || ev.imageUrl}" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.06);">` 
                : `<div style="width:48px; height:48px; border-radius:8px; background:linear-gradient(135deg,#f59e0b,#d97706); display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;"><i class="fa-solid fa-calendar"></i></div>`}
              <div>
                <strong style="color:#0f172a; font-size:14px;">${ev.title}</strong>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">${ev.speaker ? `🎙️ ${ev.speaker}` : 'Church Service Gathering'}</div>
              </div>
            </div>
          </td>
          <td style="font-weight:600; color:#334155;">${ev.speaker || 'Senior Pastor'}</td>
          <td><span style="display:inline-flex; align-items:center; gap:5px; background:#f1f5f9; padding:4px 10px; border-radius:6px; font-weight:600; color:#475569; font-size:12px;"><i class="fa-solid fa-location-dot text-amber"></i> ${ev.venue}</span></td>
          <td>
            <div style="font-weight:600; color:#0f172a; font-size:13px;">${dateDisplay}</div>
            <div style="font-size:11px; color:#64748b;">${ev.time ? `🕒 ${ev.time}` : ''}</div>
          </td>
          <td>
            ${ev.requiresRSVP 
              ? `<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:5px 10px; border-radius:12px; font-weight:700;"><i class="fa-solid fa-users"></i> ${(ev.rsvps || []).length} Attending</span>` 
              : `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0; padding:5px 10px; border-radius:12px;">Open Gathering</span>`}
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm" style="background:#e0e7ff; border:1px solid #c7d2fe; color:#3730a3; padding:6px 12px; border-radius:8px; font-weight:600;" onclick="app.pushEventNotification('${ev._id}')" title="Re-push Notification to Mobile App">
                <i class="fa-solid fa-bell text-indigo"></i> Push
              </button>
              <button class="btn btn-sm" style="background:#f8fafc; border:1px solid #cbd5e1; color:#334155; padding:6px 12px; border-radius:8px; font-weight:600;" onclick="app.editEvent('${ev._id}')" title="Edit Event">
                <i class="fa-solid fa-pen-to-square text-primary"></i> Edit
              </button>
              <button class="btn btn-sm btn-danger-action" style="padding:6px 12px; border-radius:8px; font-weight:600;" onclick="app.deleteEvent('${ev._id}')" title="Delete Event">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  openEventModal(evt = null) {
    document.getElementById('eventId').value = evt ? (evt._id || '') : '';
    document.getElementById('eventModalTitle').innerText = evt ? 'Edit Church Event / Service' : 'Create Church Event / Service';
    document.getElementById('eventTitle').value = evt ? (evt.title || '') : '';
    document.getElementById('eventSpeaker').value = evt ? (evt.speaker || '') : '';
    document.getElementById('eventVenue').value = evt ? (evt.venue || '') : 'Main Sanctuary';

    document.getElementById('eventDate').value = evt ? (evt.date || '').split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('eventTime').value = evt ? (evt.time || '') : '09:30 AM - 11:30 AM';
    document.getElementById('eventBanner').value = evt ? (evt.banner || evt.imageUrl || '') : '';
    document.getElementById('eventMapsLocation').value = evt ? (evt.mapsLocation || '') : '';
    document.getElementById('eventRequiresRSVP').checked = evt ? Boolean(evt.requiresRSVP) : false;
    document.getElementById('eventDesc').value = evt ? (evt.description || '') : '';

    const fileInput = document.getElementById('eventBannerFile');
    if (fileInput) fileInput.value = '';

    this.handleBannerUrlInput(evt ? (evt.banner || evt.imageUrl || '') : '');
    document.getElementById('eventModal').classList.add('active');
  }

  editEvent(id) {
    const evt = this.events.find(e => e._id === id);
    if (evt) {
      this.openEventModal(evt);
    }
  }

  handleBannerFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress image to JPEG 75% quality (~40KB - 80KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        document.getElementById('eventBanner').value = compressedDataUrl;
        this.handleBannerUrlInput(compressedDataUrl);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  handleBannerUrlInput(val) {
    const imgEl = document.getElementById('eventBannerPreview');
    const container = document.getElementById('eventBannerPreviewContainer');
    if (imgEl && container) {
      if (val && val.trim()) {
        imgEl.src = val.trim();
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    }
  }

  async saveEventSubmit() {
    const id = document.getElementById('eventId').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const speaker = document.getElementById('eventSpeaker').value.trim();
    const venue = document.getElementById('eventVenue').value.trim();

    const dateInput = document.getElementById('eventDate').value.trim();
    const time = document.getElementById('eventTime').value.trim();
    const banner = document.getElementById('eventBanner').value.trim();
    const mapsLocation = document.getElementById('eventMapsLocation').value.trim();
    const requiresRSVP = document.getElementById('eventRequiresRSVP').checked;
    const description = document.getElementById('eventDesc').value.trim();

    if (!title || !venue || !dateInput) {
      this.showToast('Title, venue, and date are required.', 'error');
      return;
    }

    let date = dateInput;
    if (dateInput && !dateInput.includes('T')) {
      const d = new Date(`${dateInput}T09:00:00`);
      date = isNaN(d.getTime()) ? dateInput : d.toISOString();
    }

    const payload = { title, speaker, venue, date, time, banner, imageUrl: banner, mapsLocation, requiresRSVP, description };

    this.setButtonLoading('btnSubmitEvent', true, id ? 'Updating Event...' : 'Publishing Event...');

    try {
      const url = id ? `/api/events/${id}` : '/api/events';
      const method = id ? 'PUT' : 'POST';
      const res = await this.authFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(id ? '🎉 Event updated successfully!' : '🎉 Event published successfully!', 'success');
        document.getElementById('eventId').value = '';
        this.closeModal('eventModal');
        await this.refreshAll();
      } else {
        this.showToast('Event operation failed: ' + (data.message || 'Unknown error'), 'error');
      }
    } catch (e) {
      this.showToast('Event operation failed: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSubmitEvent', false, '', id ? 'Update Event' : 'Publish Event');
    }
  }

  async deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    try {
      const res = await this.authFetch(`/api/events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.showToast('Event deleted.', 'info');
        await this.refreshAll();
      } else {
        this.showToast('Delete failed: ' + (data.message || 'Unknown error'), 'error');
      }
    } catch (e) {
      this.showToast('Delete failed: ' + e.message, 'error');
    }
  }

  // NOTICES METHODS
  renderNoticesTable() {
    const tbody = document.getElementById('noticesTableBody');
    if (!tbody) return;

    if (this.notices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No notices posted.</td></tr>';
      return;
    }

    tbody.innerHTML = this.notices.map(n => `
      <tr>
        <td><strong>${n.title}</strong></td>
        <td>${n.description}</td>
        <td>${n.time || new Date(n.date || n.createdAt).toLocaleDateString()}</td>
        <td>${n.location || 'All Wings'}</td>
        <td>
          <button class="btn btn-sm" style="background:#e0e7ff; border:1px solid #c7d2fe; color:#3730a3; padding:6px 10px; border-radius:8px; font-weight:600; margin-right:4px;" onclick="app.pushNoticeNotification('${n._id}')" title="Re-push Notification">
            <i class="fa-solid fa-bell"></i> Push
          </button>
          <button class="btn btn-sm btn-danger-action" style="padding: 6px 10px;" onclick="app.deleteNotice('${n._id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  openNoticeModal() {
    document.getElementById('noticeTitle').value = '';
    document.getElementById('noticeDesc').value = '';
    document.getElementById('noticeLoc').value = 'Main Sanctuary';
    document.getElementById('noticeTime').value = 'Immediate';
    document.getElementById('noticeImage').value = '';
    document.getElementById('noticeIsPinned').checked = false;
    const fileInput = document.getElementById('noticeBannerFile');
    if (fileInput) fileInput.value = '';
    this.handleNoticeUrlInput('');
    document.getElementById('noticeModal').classList.add('active');
  }

  handleNoticeFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        document.getElementById('noticeImage').value = compressedDataUrl;
        this.handleNoticeUrlInput(compressedDataUrl);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  handleNoticeUrlInput(val) {
    const imgEl = document.getElementById('noticeImagePreview');
    const container = document.getElementById('noticeImagePreviewContainer');
    if (imgEl && container) {
      if (val && val.trim()) {
        imgEl.src = val.trim();
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    }
  }

  openNoticeModal(notice = null) {
    document.getElementById('noticeId').value = notice ? (notice._id || '') : '';
    document.getElementById('noticeTitle').value = notice ? (notice.title || '') : '';
    document.getElementById('noticeDesc').value = notice ? (notice.description || '') : '';
    document.getElementById('noticeLoc').value = notice ? (notice.location || '') : '';
    document.getElementById('noticeDate').value = notice ? (notice.date || '').split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('noticeTime').value = notice ? (notice.time || '') : '';
    document.getElementById('noticeImage').value = notice ? (notice.image || '') : '';
    document.getElementById('noticeIsPinned').checked = notice ? Boolean(notice.isPinned) : false;
    
    const tmplSelect = document.getElementById('noticeTemplateSelect');
    if (tmplSelect) tmplSelect.value = '';

    const fileInput = document.getElementById('noticeBannerFile');
    if (fileInput) fileInput.value = '';
    this.handleNoticeUrlInput(notice ? (notice.image || '') : '');

    document.getElementById('noticeModal').classList.add('active');
  }

  editNotice(id) {
    const notice = this.notices.find(n => n._id === id);
    if (notice) {
      this.openNoticeModal(notice);
    }
  }

  handleNoticeTemplateSelect(templateKey) {
    const templates = {
      sunday_service: {
        title: '📢 Sunday Miracle Worship & Holy Communion Service',
        description: 'Warm welcome to attend our Sunday Divine Worship & Holy Communion Service. Come with your family and experience God\'s presence and anointed word!',
        location: 'Main Sanctuary',
        time: '09:30 AM - 11:30 AM'
      },
      cottage_prayer: {
        title: '🔥 Midweek Cottage & Intercessory Prayer Meeting',
        description: 'Join us for midweek cottage prayer and intercessory worship. Let us stand in prayer for our church families, sickness healing, and spiritual revival.',
        location: 'Branch Chapel & Online Zoom',
        time: '06:30 PM - 08:00 PM'
      },
      fellowship_meal: {
        title: '☕ Coffee & Christian Fellowship Gathering',
        description: 'Stay back after the Sunday worship service for delicious refreshments, coffee, tea, and warm fellowship with our church family.',
        location: 'Fellowship Hall',
        time: '11:45 AM - 12:30 PM'
      },
      special_speaker: {
        title: '🎙️ Special Guest Evangelist Revival Service',
        description: 'Special anointed miracle revival meeting with guest preacher. Special prayer for divine healing, deliverance, and spiritual breakthrough will be conducted.',
        location: 'Main Sanctuary',
        time: '06:00 PM - 08:30 PM'
      },
      youth_fellowship: {
        title: '🎸 Youth & Young Adults Worship Gathering',
        description: 'Energetic praise & worship, inspiring testimony, interactive bible discussion, and snacks for all youth and young adults!',
        location: 'Youth Hall',
        time: '05:00 PM - 07:00 PM'
      },
      fasting_prayer: {
        title: '🙏 Combined Church Fasting & Prayer Service',
        description: 'Special church-wide 1-day fasting & prayer gathering. Come seeking God\'s face for our families, church expansion, and country.',
        location: 'Main Sanctuary',
        time: '10:00 AM - 01:00 PM'
      }
    };

    const tmpl = templates[templateKey];
    if (tmpl) {
      document.getElementById('noticeTitle').value = tmpl.title;
      document.getElementById('noticeDesc').value = tmpl.description;
      document.getElementById('noticeLoc').value = tmpl.location;
      document.getElementById('noticeTime').value = tmpl.time;
      document.getElementById('noticeDate').value = new Date().toISOString().split('T')[0];
    }
  }

  async saveNoticeSubmit() {
    const id = document.getElementById('noticeId').value.trim();
    const title = document.getElementById('noticeTitle').value.trim();
    const description = document.getElementById('noticeDesc').value.trim();
    const location = document.getElementById('noticeLoc').value.trim();
    const dateInput = document.getElementById('noticeDate').value.trim();
    const time = document.getElementById('noticeTime').value.trim();
    const image = document.getElementById('noticeImage').value.trim();
    const isPinned = document.getElementById('noticeIsPinned').checked;

    if (!title || !description) {
      this.showToast('Title and description are required.', 'error');
      return;
    }

    let date = dateInput || new Date().toISOString();
    if (dateInput && !dateInput.includes('T')) {
      const d = new Date(`${dateInput}T09:00:00`);
      date = isNaN(d.getTime()) ? dateInput : d.toISOString();
    }

    const payload = { title, description, location, date, time, image, isPinned };

    this.setButtonLoading('btnSubmitNotice', true, id ? 'Updating Notice...' : 'Broadcasting Notice...');

    try {
      const url = id ? `/api/notices/${id}` : '/api/notices';
      const method = id ? 'PUT' : 'POST';
      const res = await this.authFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(id ? '🎉 Notice updated successfully!' : '🎉 Notice broadcast successfully!', 'success');
        document.getElementById('noticeId').value = '';
        this.closeModal('noticeModal');
        await this.refreshAll();
      }
    } catch (e) {
      this.showToast('Notice operation failed: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSubmitNotice', false, '', id ? 'Update Notice' : 'Post Notice');
    }
  }

  async pushEventNotification(id) {
    try {
      this.showToast('Broadcasting event push notification...', 'info');
      const res = await this.authFetch(`/api/events/${id}/push`, { method: 'POST' });
      if (res.success) {
        this.showToast(res.message || 'Event push notification sent!', 'success');
      } else {
        this.showToast('Push failed: ' + (res.message || 'Error'), 'error');
      }
    } catch (e) {
      this.showToast('Push error: ' + e.message, 'error');
    }
  }

  async deleteNotice(id) {
    if (!confirm('Delete this notice?')) return;
    try {
      await this.authFetch(`/api/notices/${id}`, { method: 'DELETE' });
      this.showToast('Notice deleted.', 'info');
      await this.refreshAll();
    } catch (e) {
      this.showToast('Delete failed: ' + e.message, 'error');
    }
  }

  async pushNoticeNotification(id) {
    try {
      this.showToast('Broadcasting notice push notification...', 'info');
      const res = await this.authFetch(`/api/notices/${id}/push`, { method: 'POST' });
      if (res.success) {
        this.showToast(res.message || 'Notice push notification sent!', 'success');
      } else {
        this.showToast('Push failed: ' + (res.message || 'Error'), 'error');
      }
    } catch (e) {
      this.showToast('Push error: ' + e.message, 'error');
    }
  }

  // STREAM METHODS
  updateStreamPreview(url) {
    const iframe = document.getElementById('streamPreviewIframe');
    if (!iframe) return;

    if (!url || !url.trim()) {
      iframe.src = '';
      return;
    }

    const trimmed = url.trim();
    let videoId = '';

    if (trimmed.includes('youtube.com/embed/')) {
      iframe.src = trimmed;
      return;
    }

    if (trimmed.includes('youtube.com/live/')) {
      const parts = trimmed.split('youtube.com/live/');
      if (parts[1]) videoId = parts[1].split('?')[0].split('&')[0];
    } else if (trimmed.includes('watch?v=')) {
      const parts = trimmed.split('watch?v=');
      if (parts[1]) videoId = parts[1].split('&')[0].split('#')[0];
    } else if (trimmed.includes('youtu.be/')) {
      const parts = trimmed.split('youtu.be/');
      if (parts[1]) videoId = parts[1].split('?')[0].split('&')[0];
    } else {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = trimmed.match(regExp);
      if (match && match[2].length === 11) videoId = match[2];
    }

    if (videoId) {
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
    } else {
      iframe.src = trimmed;
    }
  }

  async saveStreamUrl() {
    const url = document.getElementById('streamUrlInput').value.trim();
    if (!url) {
      this.showToast('Please enter a valid YouTube stream URL.', 'error');
      return;
    }

    const btn = document.getElementById('btnSaveStream') || document.querySelector("button[onclick='app.saveStreamUrl()']");
    this.setButtonLoading(btn, true, 'Updating Live Stream...');

    try {
      const res = await this.authFetch('/api/stream', {
        method: 'PUT',
        body: JSON.stringify({ activeYoutubeLink: url, isStreamingLive: true })
      });
      const data = await res.json();
      if (data.success) {
        if (this.socket) {
          this.socket.emit('updateYoutubeLink', { youtubeLink: url });
        }
        this.showToast('🎉 Live Stream link updated and broadcast to all members!', 'success');
      }
    } catch (e) {
      this.showToast('Stream link update failed: ' + e.message, 'error');
    } finally {
      this.setButtonLoading(btn, false, '', '<i class="fa-brands fa-youtube"></i> Update Sanctuary Live Stream');
    }
  }

  // MOBILE SIDEBAR TOGGLE
  toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.onclick = () => this.toggleMobileSidebar();
      document.body.appendChild(overlay);
    }

    if (sidebar) {
      const isActive = sidebar.classList.contains('mobile-active');
      if (isActive) {
        sidebar.classList.remove('mobile-active');
        overlay.classList.remove('active');
      } else {
        sidebar.classList.add('mobile-active');
        overlay.classList.add('active');
      }
    }
  }

  // BIBLE READING PLANS & VISUAL BUILDER
  initPlanBuilder() {
    const select = document.getElementById('builderBookSelect');
    if (!select) return;
    select.innerHTML = BIBLE_BOOKS_66.map(b => `
      <option value="${b.eng}">${b.tel} (${b.eng} - ${b.chapters} Ch)</option>
    `).join('');

    this.populateBuilderChapters(BIBLE_BOOKS_66[0].eng);

    this.builderPortions = [];
    this.loadPlanBuilderPreset('1-year-canonical');
  }

  populateBuilderChapters(bookEng) {
    const b = BIBLE_BOOKS_66.find(item => item.eng === bookEng) || BIBLE_BOOKS_66[0];
    const startSelect = document.getElementById('builderStartCh');
    const endSelect = document.getElementById('builderEndCh');

    if (!startSelect || !endSelect) return;

    let options = '';
    for (let i = 1; i <= b.chapters; i++) {
      options += `<option value="${i}">Chapter ${i}</option>`;
    }
    startSelect.innerHTML = options;
    endSelect.innerHTML = options;

    startSelect.value = 1;
    endSelect.value = Math.min(3, b.chapters);
    this.updatePortionSummaryPreview();
  }

  onBuilderBookChange(val) {
    this.populateBuilderChapters(val);
  }

  loadPlanBuilderPreset(presetId) {
    const planIdInput = document.getElementById('builderPlanId');
    const titleEngInput = document.getElementById('builderTitleEnglish');
    const titleTelInput = document.getElementById('builderTitleTelugu');

    if (presetId === '1-year-canonical') {
      if (planIdInput) planIdInput.value = '1-year-canonical';
      if (titleEngInput) titleEngInput.value = '1-Year Complete Bible Reading Plan';
      if (titleTelInput) titleTelInput.value = '1 సంవత్సర సమగ్ర బైబిల్ పఠన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 1, endChapter: 3, versesSummary: 'ఆదికాండము 1–3 / Genesis 1–3' },
        { day: 2, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 4, endChapter: 7, versesSummary: 'ఆదికాండము 4–7 / Genesis 4–7' },
      ];
    } else if (presetId === '2-year-canonical') {
      if (planIdInput) planIdInput.value = '2-year-canonical';
      if (titleEngInput) titleEngInput.value = '2-Year Bible Reading Plan';
      if (titleTelInput) titleTelInput.value = '2 సంవత్సరాల బైబిల్ పఠన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 1, endChapter: 2, versesSummary: 'ఆదికాండము 1–2 / Genesis 1–2' },
        { day: 2, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 3, endChapter: 4, versesSummary: 'ఆదికాండము 3–4 / Genesis 3–4' },
      ];
    } else if (presetId === '3-year-canonical') {
      if (planIdInput) planIdInput.value = '3-year-canonical';
      if (titleEngInput) titleEngInput.value = '3-Year Bible Reading Plan';
      if (titleTelInput) titleTelInput.value = '3 సంవత్సరాల దేవుని వాక్య పఠన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 1, endChapter: 1, versesSummary: 'ఆదికాండము 1 / Genesis 1' },
      ];
    } else if (presetId === '6-month-plan') {
      if (planIdInput) planIdInput.value = '6-month-plan';
      if (titleEngInput) titleEngInput.value = '6-Month Intensive Bible Reading Plan';
      if (titleTelInput) titleTelInput.value = '6 నెలల తీవ్రమైన బైబిల్ అధ్యయన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 1, endChapter: 7, versesSummary: 'ఆదికాండము 1–7 / Genesis 1–7' },
      ];
    } else if (presetId === '3-month-plan') {
      if (planIdInput) planIdInput.value = '3-month-plan';
      if (titleEngInput) titleEngInput.value = '3-Month Fast Reading Plan';
      if (titleTelInput) titleTelInput.value = '3 నెలల వేగవంతమైన బైబిల్ పఠన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 1, endChapter: 13, versesSummary: 'ఆదికాండము 1–13 / Genesis 1–13' },
      ];
    } else if (presetId === '1-month-plan') {
      if (planIdInput) planIdInput.value = '1-month-plan';
      if (titleEngInput) titleEngInput.value = '1-Month New Testament Reading Plan';
      if (titleTelInput) titleTelInput.value = '1 నెల కొత్త నిబంధన పఠన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Matthew', bookTelugu: 'మత్తయి సువార్త', startChapter: 1, endChapter: 9, versesSummary: 'మత్తయి సువార్త 1–9 / Matthew 1–9' },
      ];
    }

    this.renderBuilderPortionsTable();
  }

  openShareLinkPage(presetId = '1-year-canonical') {
    const shareUrl = `/share-plan.html?planId=${encodeURIComponent(presetId)}`;
    window.open(shareUrl, '_blank');
  }

  async autoCalculatePlanChapters(presetId = '1-year-canonical') {
    let targetDays = 365;
    let titleEng = '1-Year Complete Bible Reading Plan';
    let titleTel = '1 సంవత్సర సమగ్ర బైబిల్ పఠన ప్రణాళిక';

    if (presetId === '2-year-canonical') {
      targetDays = 730;
      titleEng = '2-Year Bible Reading Plan';
      titleTel = '2 సంవత్సరాల బైబిల్ పఠన ప్రణాళిక';
    } else if (presetId === '3-year-canonical') {
      targetDays = 1095;
      titleEng = '3-Year Bible Reading Plan';
      titleTel = '3 సంవత్సరాల దేవుని వాక్య పఠన ప్రణాళిక';
    } else if (presetId === '6-month-plan') {
      targetDays = 180;
      titleEng = '6-Month Intensive Bible Reading Plan';
      titleTel = '6 నెలల తీవ్రమైన బైబిల్ అధ్యయన ప్రణాళిక';
    } else if (presetId === '3-month-plan') {
      targetDays = 90;
      titleEng = '3-Month Fast Reading Plan';
      titleTel = '3 నెలల వేగవంతమైన బైబిల్ పఠన ప్రణాళిక';
    } else if (presetId === '1-month-plan') {
      targetDays = 30;
      titleEng = '1-Month New Testament Reading Plan';
      titleTel = '1 నెల కొత్త నిబంధన పఠన ప్రణాళిక';
    }

    const targetBooks = presetId === '1-month-plan' ? BIBLE_BOOKS_66.slice(39) : BIBLE_BOOKS_66;
    const allChaptersList = [];

    targetBooks.forEach(b => {
      for (let c = 1; c <= b.chapters; c++) {
        allChaptersList.push({ book: b.eng, tel: b.tel, ch: c });
      }
    });

    const totalChapters = allChaptersList.length;
    const basePerDay = Math.floor(totalChapters / targetDays);
    const extraCount = totalChapters % targetDays;

    const portions = [];
    let chapterCursor = 0;

    for (let dayIdx = 1; dayIdx <= targetDays; dayIdx++) {
      const countForToday = basePerDay + (dayIdx <= extraCount ? 1 : 0);
      if (countForToday <= 0 || chapterCursor >= totalChapters) break;

      const chunk = allChaptersList.slice(chapterCursor, chapterCursor + countForToday);
      chapterCursor += countForToday;

      if (chunk.length === 0) break;

      const first = chunk[0];
      const last = chunk[chunk.length - 1];

      let summary = '';
      if (first.book === last.book) {
        const chStr = first.ch === last.ch ? `${first.ch}` : `${first.ch}–${last.ch}`;
        summary = `${first.tel} ${chStr} / ${first.book} ${chStr}`;
      } else {
        summary = `${first.tel} ${first.ch} - ${last.tel} ${last.ch}`;
      }

      portions.push({
        day: dayIdx,
        book: first.book,
        bookTelugu: first.tel,
        startChapter: first.ch,
        endChapter: last.ch,
        versesSummary: summary
      });
    }

    try {
      const res = await this.authFetch('/api/bible-plans/admin/update-plan', {
        method: 'POST',
        body: JSON.stringify({
          planId: presetId,
          titleEnglish: titleEng,
          titleTelugu: titleTel,
          durationDays: portions.length,
          dailyPortions: portions,
          category: 'canonical'
        })
      });
      const json = await res.json();
      if (json.success) {
        this.showToast(`⚡ Auto-generated & deployed EXACTLY ${portions.length} daily portions for ${targetDays}-day plan!`, 'success');
        await this.loadBiblePlanStats();
      } else {
        this.showToast('Failed to auto-deploy plan: ' + json.message, 'error');
      }
    } catch (e) {
      this.showToast('Error deploying plan: ' + e.message, 'error');
    }
  }

  async exportPlanToExcelAdmin(presetId = '1-year-canonical') {
    try {
      const res = await fetch(`/api/bible-plans/public/${presetId}`);
      const json = await res.json();
      const portions = (json.success && json.data?.dailyPortions) ? json.data.dailyPortions : [];

      if (portions.length === 0) {
        this.showToast('No configured portions found. Click Auto 365 Days first.', 'error');
        return;
      }

      let csv = '\uFEFF'; // UTF-8 BOM for Telugu characters in Excel
      csv += 'Day,Book (Telugu),Book (English),Start Chapter,End Chapter,Portion Summary\n';

      portions.forEach(p => {
        const telEsc = `"${(p.bookTelugu || '').replace(/"/g, '""')}"`;
        const engEsc = `"${(p.book || '').replace(/"/g, '""')}"`;
        const sumEsc = `"${(p.versesSummary || '').replace(/"/g, '""')}"`;
        csv += `Day ${p.day},${telEsc},${engEsc},${p.startChapter},${p.endChapter},${sumEsc}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${presetId}_Bible_Reading_Plan.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast(`📥 Exported ${portions.length} days of ${presetId} to Excel CSV!`, 'success');
    } catch (e) {
      this.showToast('Export failed: ' + e.message, 'error');
    }
  }



  copyPublicShareLink() {
    const planId = document.getElementById('builderPlanId')?.value || '1-year-canonical';
    const shareUrl = `${window.location.origin}/share-plan.html?planId=${encodeURIComponent(planId)}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showToast(`🔗 Shareable link copied: ${shareUrl}`, 'success');
    }).catch(() => {
      prompt('Copy this shareable Bible reading plan link:', shareUrl);
    });
  }

  updatePortionSummaryPreview() {
    const bookEng = document.getElementById('builderBookSelect')?.value || 'Genesis';
    const b = BIBLE_BOOKS_66.find(item => item.eng === bookEng) || { eng: bookEng, tel: bookEng };
    const startCh = Number(document.getElementById('builderStartCh')?.value) || 1;
    const endCh = Number(document.getElementById('builderEndCh')?.value) || startCh;

    const chStr = startCh === endCh ? `${startCh}` : `${startCh}–${endCh}`;
    const autoSummary = `${b.tel} ${chStr} / ${b.eng} ${chStr}`;
    const summaryInput = document.getElementById('builderSummary');
    if (summaryInput) summaryInput.value = autoSummary;
  }

  onBuilderDayChange(val) {
    const dayNum = Number(val) || 1;
    const existing = this.builderPortions.find(p => p.day === dayNum);
    if (existing) {
      const bookSelect = document.getElementById('builderBookSelect');
      if (bookSelect) bookSelect.value = existing.book;
      this.populateBuilderChapters(existing.book);
      const startSelect = document.getElementById('builderStartCh');
      const endSelect = document.getElementById('builderEndCh');
      if (startSelect) startSelect.value = existing.startChapter;
      if (endSelect) endSelect.value = existing.endChapter;
      const summaryInput = document.getElementById('builderSummary');
      if (summaryInput) summaryInput.value = existing.versesSummary;
    } else {
      this.updatePortionSummaryPreview();
    }
  }

  addPortionToCurrentPlan() {
    const day = Number(document.getElementById('builderDayNum').value) || 1;
    const bookEng = document.getElementById('builderBookSelect').value;
    const b = BIBLE_BOOKS_66.find(item => item.eng === bookEng) || { eng: bookEng, tel: bookEng };
    const startChapter = Number(document.getElementById('builderStartCh').value) || 1;
    const endChapter = Number(document.getElementById('builderEndCh').value) || startChapter;

    const versesSummary = document.getElementById('builderSummary').value.trim() || `${b.tel} ${startChapter}–${endChapter}`;

    const newPortion = {
      day,
      book: bookEng,
      bookTelugu: b.tel,
      startChapter,
      endChapter,
      versesSummary
    };

    const existingIdx = this.builderPortions.findIndex(p => p.day === day);
    if (existingIdx > -1) {
      this.builderPortions[existingIdx] = newPortion;
    } else {
      this.builderPortions.push(newPortion);
    }

    this.builderPortions.sort((a, b) => a.day - b.day);
    this.renderBuilderPortionsTable();

    document.getElementById('builderDayNum').value = day + 1;
    this.onBuilderDayChange(day + 1);
  }

  removeBuilderPortion(dayNum) {
    this.builderPortions = this.builderPortions.filter(p => p.day !== dayNum);
    this.renderBuilderPortionsTable();
  }

  renderBuilderPortionsTable() {
    const tbody = document.getElementById('builderPortionsTableBody');
    const badge = document.getElementById('builderTotalCountBadge');
    if (!tbody) return;

    if (badge) badge.innerText = `${this.builderPortions.length} Days Configured`;

    if (this.builderPortions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No reading portions added yet. Select day and add portions above.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.builderPortions.map(p => `
      <tr>
        <td><strong>Day ${p.day}</strong></td>
        <td>${p.bookTelugu} (${p.book})</td>
        <td>Ch ${p.startChapter}${p.endChapter !== p.startChapter ? ` – ${p.endChapter}` : ''}</td>
        <td><small>${p.versesSummary}</small></td>
        <td>
          <button class="btn btn-sm btn-danger-action" style="padding:4px 8px;" onclick="app.removeBuilderPortion(${p.day})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  async saveVisualPlanSubmit() {
    const planId = document.getElementById('builderPlanId').value.trim();
    const titleEnglish = document.getElementById('builderTitleEnglish').value.trim();
    const titleTelugu = document.getElementById('builderTitleTelugu').value.trim();

    if (!planId || !titleEnglish || this.builderPortions.length === 0) {
      this.showToast('Please provide Plan ID, Title, and at least 1 configured day portion.', 'error');
      return;
    }

    this.setButtonLoading('btnSaveBuilderPlan', true, 'Deploying 365-Day Plan...');

    try {
      const payload = {
        planId,
        titleEnglish,
        titleTelugu,
        durationDays: this.builderPortions.length || 365,
        dailyPortions: this.builderPortions,
        category: 'canonical'
      };

      const res = await this.authFetch('/api/bible-plans/admin/update-plan', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        this.showToast(`🎉 Plan "${titleEnglish}" with ${this.builderPortions.length} days saved and deployed!`, 'success');
        await this.loadBiblePlanStats();
      } else {
        this.showToast('Failed: ' + (json.message || 'Error'), 'error');
      }
    } catch (e) {
      this.showToast('Plan save failed: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSaveBuilderPlan', false, '', '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Deploy 365-Day Plan to Database');
    }
  }

  async loadUserProgress() {
    try {
      const res = await this.authFetch('/api/bible-plans/progress/me?planId=1-year-canonical');
      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data;
        const completedCount = p.completedDays ? p.completedDays.length : 0;
        const totalDays = 365;
        const percent = Math.min(100, Math.round((completedCount / totalDays) * 100));

        const titleEl = document.getElementById('userActivePlanTitle');
        const subEl = document.getElementById('userActivePlanSubtitle');
        const pctEl = document.getElementById('userProgressPercentText');
        const barEl = document.getElementById('userProgressBarFill');
        const doneEl = document.getElementById('userCompletedDaysCount');
        const remEl = document.getElementById('userRemainingDaysCount');
        const streakEl = document.getElementById('userCurrentStreakCount');

        if (titleEl) titleEl.innerText = p.planId === '1-year-canonical' ? '1-Year Complete Bible Reading Plan' : p.planId;
        if (subEl) subEl.innerText = `Day ${p.currentDay || 1} Portion • 1 సంవత్సర సమగ్ర బైబిల్ పఠన ప్రణాళిక`;
        if (pctEl) pctEl.innerText = `${percent}% Completed`;
        if (barEl) barEl.style.width = `${percent}%`;
        if (doneEl) doneEl.innerText = `${completedCount} Days`;
        if (remEl) remEl.innerText = `${totalDays - completedCount} Days`;
        if (streakEl) streakEl.innerText = `🔥 ${p.streak || 0} Days`;
      }
    } catch (e) {
      console.log('Error loading user progress:', e);
    }
  }

  // Overview Today's Promise Quick Editor Methods
  async loadOverviewPromise() {
    try {
      const res = await fetch('/api/bible-plans/daily-promise');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const verseEl = document.getElementById('overviewPromiseVerseTel');
        const refTelEl = document.getElementById('overviewPromiseRefTel');
        const refEngEl = document.getElementById('overviewPromiseRefEng');

        if (verseEl) verseEl.value = d.verseTelugu || d.verseEnglish || '';
        if (refTelEl) refTelEl.value = d.referenceTelugu || '';
        if (refEngEl) refEngEl.value = d.referenceEnglish || '';
      }
      this.populateOverviewPromiseBooks();
    } catch (e) {
      console.log('Error loading overview promise:', e);
    }
  }

  populateOverviewPromiseBooks() {
    const bookSelect = document.getElementById('overviewPromiseBook');
    if (!bookSelect || bookSelect.children.length > 0) return;

    bookSelect.innerHTML = BIBLE_BOOKS_66.map(b => `
      <option value="${b.eng}">${b.tel} (${b.eng})</option>
    `).join('');

    this.onOverviewPromiseBookChange(BIBLE_BOOKS_66[0].eng);
  }

  onOverviewPromiseBookChange(bookEng) {
    const b = BIBLE_BOOKS_66.find(item => item.eng === bookEng) || BIBLE_BOOKS_66[0];
    const chSelect = document.getElementById('overviewPromiseChapter');
    if (!chSelect) return;

    let options = '';
    for (let c = 1; c <= b.chapters; c++) {
      options += `<option value="${c}">Chapter ${c}</option>`;
    }
    chSelect.innerHTML = options;
    this.onOverviewPromiseChapterChange();
  }

  onOverviewPromiseChapterChange() {
    const verseSelect = document.getElementById('overviewPromiseVerse');
    if (!verseSelect) return;

    let options = '';
    for (let v = 1; v <= 30; v++) {
      options += `<option value="${v}">Verse ${v}</option>`;
    }
    verseSelect.innerHTML = options;
  }

  async fetchScriptureVerseForPromise() {
    const bookEng = document.getElementById('overviewPromiseBook')?.value || 'Psalms';
    const b = BIBLE_BOOKS_66.find(item => item.eng === bookEng) || BIBLE_BOOKS_66[0];
    const ch = document.getElementById('overviewPromiseChapter')?.value || '23';
    const v = document.getElementById('overviewPromiseVerse')?.value || '1';

    const refTel = `${b.tel} ${ch}:${v}`;
    const refEng = `${b.eng} ${ch}:${v}`;

    // Common Telugu Promises fallback generator
    let verseTextTel = `${b.tel} ${ch}:${v} — దేవుని కృప మరియు సమాధానము మీకు తోడైయుండును గాక.`;
    if (b.eng === 'Psalms' && ch === '23' && v === '1') {
      verseTextTel = "యెహోవా నా కాపరి; నాకు లేమి కలుగదు.";
    } else if (b.eng === 'Isaiah' && ch === '41' && v === '10') {
      verseTextTel = "నీవు భయపడకుము నేను నీకు తోడైయున్నాను; దిగులుపడకుము నేను నీ దేవుడనై యున్నాను.";
    } else if (b.eng === 'John' && ch === '3' && v === '16') {
      verseTextTel = "దేవుడు లోకమును ఎంతో ప్రేమించెను; కాగా ఆయన తన అద్వితీయ కుమారునిగా అనుగ్రహించెను.";
    }

    const verseInput = document.getElementById('overviewPromiseVerseTel');
    const refTelInput = document.getElementById('overviewPromiseRefTel');
    const refEngInput = document.getElementById('overviewPromiseRefEng');

    if (verseInput) verseInput.value = verseTextTel;
    if (refTelInput) refTelInput.value = refTel;
    if (refEngInput) refEngInput.value = refEng;

    this.showToast(`✨ Fetched scripture verse for ${refEng}!`, 'success');
  }

  toggleEditPromiseText() {
    const verseInput = document.getElementById('overviewPromiseVerseTel');
    if (verseInput) {
      verseInput.focus();
      this.showToast('You can now edit the promise verse text.', 'info');
    }
  }

  async saveOverviewPromiseSubmit() {
    const verseTelugu = document.getElementById('overviewPromiseVerseTel')?.value.trim();
    const referenceTelugu = document.getElementById('overviewPromiseRefTel')?.value.trim();
    const referenceEnglish = document.getElementById('overviewPromiseRefEng')?.value.trim();

    if (!verseTelugu || !referenceTelugu) {
      this.showToast('Promise verse text and reference are required.', 'error');
      return;
    }

    const btn = document.getElementById('btnPublishOverviewPromise');
    this.setButtonLoading(btn, true, 'Publishing Promise...');

    try {
      const res = await this.authFetch('/api/bible-plans/daily-promise', {
        method: 'POST',
        body: JSON.stringify({
          verseTelugu,
          referenceTelugu,
          verseEnglish: verseTelugu,
          referenceEnglish
        })
      });
      const json = await res.json();
      if (json.success) {
        this.showToast("🎉 Today's God's Promise published to mobile app!", 'success');
      } else {
        this.showToast('Failed: ' + json.message, 'error');
      }
    } catch (e) {
      this.showToast('Error publishing promise: ' + e.message, 'error');
    } finally {
      this.setButtonLoading(btn, false, '', '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Today\'s God\'s Promise');
    }
  }

  // Projection Slide Navigation Methods
  prevSlide() {
    if (!this.activeSong || !this.activeSong.slides) return;
    if (this.activeSlideIndex > 0) {
      this.triggerSlide(this.activeSlideIndex - 1);
    } else {
      this.showToast('Already on the first slide.', 'info');
    }
  }

  nextSlide() {
    if (!this.activeSong || !this.activeSong.slides) return;
    if (this.activeSlideIndex < this.activeSong.slides.length - 1) {
      this.triggerSlide(this.activeSlideIndex + 1);
    } else {
      this.showToast('Already on the last slide.', 'info');
    }
  }

  startLiveSession() {
    this.showToast('🔴 Worship Session Live! Sanctuary Projection Active.', 'success');
  }

  // YouTube Media Catalog Manager Methods
  async saveYouTubeMediaSubmit() {
    const title = document.getElementById('ytVideoTitle')?.value.trim();
    const categoryId = document.getElementById('ytVideoCategory')?.value || 'sunday';
    const youtubeUrl = document.getElementById('ytVideoUrl')?.value.trim();

    if (!title || !youtubeUrl) {
      this.showToast('Title and YouTube Video URL are required.', 'error');
      return;
    }

    const btn = document.getElementById('btnSaveStream');
    this.setButtonLoading(btn, true, 'Publishing Video...');

    try {
      const res = await this.authFetch('/api/stream/videos', {
        method: 'POST',
        body: JSON.stringify({ title, youtubeUrl, categoryId })
      });
      const json = await res.json();
      if (json.success) {
        this.showToast('🎉 YouTube video published to mobile app!', 'success');
        if (document.getElementById('ytVideoTitle')) document.getElementById('ytVideoTitle').value = '';
        if (document.getElementById('ytVideoUrl')) document.getElementById('ytVideoUrl').value = '';
        await this.loadYouTubeMediaList();
      } else {
        this.showToast('Failed to publish video: ' + (json.message || 'Error'), 'error');
      }
    } catch (e) {
      this.showToast('Error publishing video: ' + e.message, 'error');
    } finally {
      this.setButtonLoading(btn, false, '', '<i class="fa-brands fa-youtube"></i> Publish YouTube Video to Mobile App');
    }
  }

  async loadYouTubeMediaList() {
    const container = document.getElementById('youtubeMediaListGrid');
    if (!container) return;

    try {
      const res = await fetch('/api/stream/videos');
      const json = await res.json();

      if (json.channelId && document.getElementById('ytChannelIdInput')) {
        document.getElementById('ytChannelIdInput').value = json.channelId;
      }

      if (json.success && Array.isArray(json.videos)) {
        const videos = json.videos;
        if (videos.length === 0) {
          container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:32px 16px; background: rgba(15, 23, 42, 0.5); border:1px dashed var(--border-card); border-radius:14px;">
              <i class="fa-brands fa-youtube" style="font-size:38px; margin-bottom:10px; color:#ef4444;"></i>
              <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">No YouTube Videos Published Yet</h4>
              <p style="font-size:12px; color:var(--text-muted);">Paste a video link above or enter your YouTube Channel ID to auto-sync videos!</p>
            </div>
          `;
          return;
        }

        const categoryLabels = {
          sunday: '🔴 Sunday Worship',
          fasting: '🙏 Fasting & Prayer',
          youth: '⚡ Youth Service',
          sermon: '📖 Sermon',
          special: '⭐ Special Service'
        };

        container.innerHTML = videos.map(v => {
          const thumb = v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
          const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '';
          const catName = categoryLabels[v.categoryId] || v.categoryId || 'Video';
          const titleEsc = (v.title || '').replace(/"/g, '&quot;');

          return `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-card); border-radius:14px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; transition: transform 0.2s ease;">
              <div style="position:relative; width:100%; height:130px; border-radius:10px; overflow:hidden; margin-bottom:10px; background:#000;">
                <img src="${thumb}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg'" />
                <span class="badge badge-primary" style="position:absolute; top:6px; right:6px; font-size:10px; backdrop-filter:blur(4px);">${catName}</span>
              </div>
              <h4 style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:6px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${titleEsc}</h4>
              <p style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">📅 Published: ${dateStr}</p>
              <div style="display:flex; gap:8px; margin-top:auto;">
                <button class="btn btn-sm btn-outline-danger" style="width:100%; font-size:11px; padding:6px 10px;" onclick="app.deleteYouTubeVideo('${v._id}')">
                  <i class="fa-solid fa-trash"></i> Delete Video
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.log('Error loading video list:', e);
      container.innerHTML = `<p style="color:#ef4444; text-align:center; padding:16px;">Failed to load video library.</p>`;
    }
  }

  async deleteYouTubeVideo(id) {
    if (!confirm('Are you sure you want to delete this YouTube video from the mobile app?')) return;
    try {
      const res = await this.authFetch(`/api/stream/videos/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        this.showToast('Video deleted successfully from mobile app.', 'success');
        await this.loadYouTubeMediaList();
      } else {
        this.showToast(json.message || 'Failed to delete video.', 'error');
      }
    } catch (e) {
      this.showToast('Delete error: ' + e.message, 'error');
    }
  }

  async syncYouTubeChannelSubmit() {
    const channelId = document.getElementById('ytChannelIdInput')?.value.trim();
    if (!channelId) {
      this.showToast('Please enter your YouTube Channel ID or Channel URL.', 'error');
      return;
    }

    const btn = document.getElementById('btnSyncYtChannel');
    this.setButtonLoading(btn, true, 'Syncing Channel...');

    try {
      const res = await fetch('/api/stream/videos/sync-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });
      const json = await res.json();
      if (json.success) {
        this.showToast(json.message || 'Channel synced successfully!', 'success');
        await this.loadYouTubeMediaList();
      } else {
        this.showToast(json.message || 'Sync failed.', 'error');
      }
    } catch (e) {
      this.showToast('Sync error: ' + e.message, 'error');
    } finally {
      this.setButtonLoading(btn, false, '', '<i class="fa-brands fa-youtube"></i> Sync Channel Videos (Free)');
    }
  }

  async loadBiblePlanStats() {
    try {
      const res = await fetch('/api/bible-plans/admin/statistics');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const totalEnrolled = d.totalEnrolledMembers || 0;
        const totalStreaks = d.activeStreakCount || 0;
        const totalCompleted = d.totalPortionsCompleted || 0;

        const enrEl = document.getElementById('statPlanEnrolled');
        const strEl = document.getElementById('statPlanStreaks');
        const comEl = document.getElementById('statPlanCompleted');
        if (enrEl) enrEl.innerText = totalEnrolled;
        if (strEl) strEl.innerText = `${totalStreaks} 🔥`;
        if (comEl) comEl.innerText = totalCompleted;

        const consistency = totalEnrolled > 0 ? Math.min(100, Math.round((totalStreaks / totalEnrolled) * 100)) : 100;
        const consEl = document.getElementById('statPlanConsistency');
        if (consEl) consEl.innerText = `${consistency}%`;

        const tbody = document.getElementById('planLeaderboardBody');
        if (tbody) {
          if (d.topReaders && d.topReaders.length > 0) {
            tbody.innerHTML = d.topReaders.map((r, index) => {
              const memberName = r.userName || r.userId || 'Member';
              const daysCount = r.completedDays ? r.completedDays.length : 0;
              const rankBadge = index === 0 ? '🥇 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `#${index + 1}`;
              return `
                <tr>
                  <td><strong>${rankBadge} — ${memberName}</strong></td>
                  <td><span class="badge badge-primary">${r.planId}</span></td>
                  <td>Day ${r.currentDay || 1}</td>
                  <td><strong>${daysCount} days</strong></td>
                  <td><span class="badge badge-success">🔥 ${r.streak || 0} streak</span></td>
                </tr>
              `;
            }).join('');
          } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No member reading data recorded yet.</td></tr>`;
          }
        }
      }
    } catch (e) {
      console.log('Error loading Bible plan stats:', e);
    }
  }

  populateDailyPromiseBookDropdown() {
    const select = document.getElementById('dpBookSelect');
    if (!select || select.options.length > 0) return;
    
    select.innerHTML = BIBLE_BOOKS_66.map((b, idx) => `
      <option value="${b.eng}" data-tel="${b.tel}" data-chapters="${b.chapters}">
        ${idx + 1}. ${b.tel} (${b.eng})
      </option>
    `).join('');
    
    this.handleDpBookChange();
  }

  handleDpBookChange() {
    const bookSelect = document.getElementById('dpBookSelect');
    const chapterSelect = document.getElementById('dpChapterSelect');
    if (!bookSelect || !chapterSelect) return;

    const opt = bookSelect.options[bookSelect.selectedIndex];
    const maxCh = Number(opt?.dataset?.chapters) || 50;

    let chHtml = '';
    for (let c = 1; c <= maxCh; c++) {
      chHtml += `<option value="${c}">అధ్యాయము ${c} / Chapter ${c}</option>`;
    }
    chapterSelect.innerHTML = chHtml;
    this.populateDpVerseDropdowns();
  }

  populateDpVerseDropdowns() {
    const startVerseSelect = document.getElementById('dpStartVerseSelect');
    const endVerseSelect = document.getElementById('dpEndVerseSelect');
    if (!startVerseSelect || !endVerseSelect) return;

    let verseHtml = '';
    for (let v = 1; v <= 176; v++) {
      verseHtml += `<option value="${v}">వచనము ${v} / Verse ${v}</option>`;
    }
    startVerseSelect.innerHTML = verseHtml;
    endVerseSelect.innerHTML = verseHtml;
    startVerseSelect.value = '1';
    endVerseSelect.value = '1';
    this.handleDpRefChange();
  }

  handleDpRefChange() {
    const bookSelect = document.getElementById('dpBookSelect');
    const chapterSelect = document.getElementById('dpChapterSelect');
    const startVerseSelect = document.getElementById('dpStartVerseSelect');
    const endVerseSelect = document.getElementById('dpEndVerseSelect');

    const refTelInput = document.getElementById('dpRefTel');
    const refEngInput = document.getElementById('dpRefEng');
    if (!bookSelect || !chapterSelect || !refTelInput || !refEngInput) return;

    const opt = bookSelect.options[bookSelect.selectedIndex];
    const engBook = opt?.value || 'Genesis';
    const telBook = opt?.dataset?.tel || 'ఆదికాండము';
    const ch = chapterSelect.value || '1';
    const v1 = startVerseSelect?.value || '1';
    const v2 = endVerseSelect?.value || v1;

    const verseStr = v1 === v2 ? `${v1}` : `${v1}-${v2}`;
    refTelInput.value = `${telBook} ${ch}:${verseStr}`;
    refEngInput.value = `${engBook} ${ch}:${verseStr}`;
  }

  openDailyPromiseModal(promiseItem = null) {
    this.populateDailyPromiseBookDropdown();
    const todayStr = new Date().toISOString().split('T')[0];

    document.getElementById('dpDate').value = promiseItem ? promiseItem.date : todayStr;
    document.getElementById('dpRefTel').value = promiseItem ? (promiseItem.referenceTelugu || '') : 'యిర్మీయా 29:11';
    document.getElementById('dpRefEng').value = promiseItem ? (promiseItem.referenceEnglish || '') : 'Jeremiah 29:11';
    document.getElementById('dpVerseTel').value = promiseItem ? (promiseItem.verseTelugu || '') : '';
    document.getElementById('dpVerseEng').value = promiseItem ? (promiseItem.verseEnglish || '') : '';

    document.getElementById('dailyPromiseModal').classList.add('active');
  }

  async saveDailyPromiseSubmit() {
    const date = document.getElementById('dpDate').value;
    const referenceTelugu = document.getElementById('dpRefTel').value.trim();
    const referenceEnglish = document.getElementById('dpRefEng').value.trim();
    const verseTelugu = document.getElementById('dpVerseTel').value.trim();
    const verseEnglish = document.getElementById('dpVerseEng').value.trim();

    if (!date || !referenceTelugu || !verseTelugu) {
      this.showToast('Please fill in Date, Telugu Reference, and Telugu Verse.', 'error');
      return;
    }

    this.setButtonLoading('btnSubmitDailyPromise', true, 'Saving Promise...');

    try {
      const res = await this.authFetch('/api/bible-plans/daily-promise', {
        method: 'POST',
        body: JSON.stringify({ date, referenceTelugu, referenceEnglish, verseTelugu, verseEnglish })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('🌅 Daily God\'s Promise scheduled and broadcast successfully!', 'success');
        this.closeModal('dailyPromiseModal');
        await this.loadDailyPromisesTable();
      } else {
        this.showToast('Failed to schedule promise: ' + (data.message || 'Error'), 'error');
      }
    } catch (e) {
      this.showToast('Schedule error: ' + e.message, 'error');
    } finally {
      this.setButtonLoading('btnSubmitDailyPromise', false, '', '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Broadcast Promise');
    }
  }

  async loadDailyPromisesTable() {
    const tbody = document.getElementById('dailyPromiseTableBody');
    if (!tbody) return;

    try {
      const res = await fetch('/api/bible-plans/scheduled-promises');
      const data = await res.json();
      const list = (data.success && Array.isArray(data.data)) ? data.data : [];

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No custom daily promises scheduled. Default canonical promise pool is active.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(p => `
        <tr>
          <td><strong>${p.date}</strong></td>
          <td>${p.referenceTelugu}</td>
          <td>${p.referenceEnglish || '—'}</td>
          <td><small class="text-muted">${(p.verseTelugu || '').substring(0, 60)}...</small></td>
          <td>
            <button class="btn btn-sm btn-danger-action" style="padding:4px 8px;" onclick="app.deleteDailyPromise('${p.date}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.log('Error loading daily promises table:', e);
    }
  }

  async deleteDailyPromise(date) {
    if (!confirm(`Delete scheduled promise for ${date}?`)) return;
    try {
      const res = await this.authFetch(`/api/bible-plans/daily-promise/${date}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.showToast('Promise schedule deleted.', 'info');
        await this.loadDailyPromisesTable();
      }
    } catch (e) {
      this.showToast('Delete failed: ' + e.message, 'error');
    }
  }

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }
}

// Instantiate global app instance
const app = new ChurchApp();
window.app = app;

