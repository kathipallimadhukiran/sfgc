// ChurchConnect Web Admin & Live Lyrics Projection SPA Controller
const BIBLE_BOOKS_66 = [
  { eng: 'Genesis', tel: 'ఆదికాండము' },
  { eng: 'Exodus', tel: 'నిర్గమకాండము' },
  { eng: 'Leviticus', tel: 'లేవీయకాండము' },
  { eng: 'Numbers', tel: 'సంఖ్యాకాండము' },
  { eng: 'Deuteronomy', tel: 'ద్వితీయోపదేశకాండము' },
  { eng: 'Joshua', tel: 'యెహోషువ' },
  { eng: 'Judges', tel: 'న్యాయాధిపతులు' },
  { eng: 'Ruth', tel: 'రూతు' },
  { eng: '1 Samuel', tel: '1 సమూయేలు' },
  { eng: '2 Samuel', tel: '2 సమూయేలు' },
  { eng: '1 Kings', tel: '1 రాజులు' },
  { eng: '2 Kings', tel: '2 రాజులు' },
  { eng: '1 Chronicles', tel: '1 దినవృత్తాంతములు' },
  { eng: '2 Chronicles', tel: '2 దినవృత్తాంతములు' },
  { eng: 'Ezra', tel: 'ఎజ్రా' },
  { eng: 'Nehemiah', tel: 'నెహెమ్యా' },
  { eng: 'Esther', tel: 'ఎస్తేరు' },
  { eng: 'Job', tel: 'యోబు' },
  { eng: 'Psalms', tel: 'కీర్తనలు' },
  { eng: 'Proverbs', tel: 'సామెతలు' },
  { eng: 'Ecclesiastes', tel: 'ప్రసంగి' },
  { eng: 'Song of Solomon', tel: 'పరమగీతము' },
  { eng: 'Isaiah', tel: 'యెషయా' },
  { eng: 'Jeremiah', tel: 'యిర్మీయా' },
  { eng: 'Lamentations', tel: 'విలాపవాక్యములు' },
  { eng: 'Ezekiel', tel: 'యెహెజ్కేలు' },
  { eng: 'Daniel', tel: 'దానియేలు' },
  { eng: 'Hosea', tel: 'హోషేయ' },
  { eng: 'Joel', tel: 'యోవేలు' },
  { eng: 'Amos', tel: 'ఆమోసు' },
  { eng: 'Obadiah', tel: 'ఓబద్యా' },
  { eng: 'Jonah', tel: 'యోనా' },
  { eng: 'Micah', tel: 'మీకా' },
  { eng: 'Nahum', tel: 'నహూము' },
  { eng: 'Habakkuk', tel: 'హబక్కూకు' },
  { eng: 'Zephaniah', tel: 'జెఫన్యా' },
  { eng: 'Haggai', tel: 'హగ్గయి' },
  { eng: 'Zechariah', tel: 'జెకర్యా' },
  { eng: 'Malachi', tel: 'మలాకీ' },
  { eng: 'Matthew', tel: 'మత్తయి సువార్త' },
  { eng: 'Mark', tel: 'మార్కు సువార్త' },
  { eng: 'Luke', tel: 'లూకా సువార్త' },
  { eng: 'John', tel: 'యోహాను సువార్త' },
  { eng: 'Acts', tel: 'అపొస్తలుల కార్యములు' },
  { eng: 'Romans', tel: 'రోమీయులకు' },
  { eng: '1 Corinthians', tel: '1 కొరింథీయులకు' },
  { eng: '2 Corinthians', tel: '2 కొరింథీయులకు' },
  { eng: 'Galatians', tel: 'గలతీయులకు' },
  { eng: 'Ephesians', tel: 'ఎఫెసీయులకు' },
  { eng: 'Philippians', tel: 'ఫిలిప్పీయులకు' },
  { eng: 'Colossians', tel: 'కొలస్సీయులకు' },
  { eng: '1 Thessalonians', tel: '1 దెస్సలొనీకయులకు' },
  { eng: '2 Thessalonians', tel: '2 దెస్సలొనీకయులకు' },
  { eng: '1 Timothy', tel: '1 తిమోతికి' },
  { eng: '2 Timothy', tel: '2 తిమోతికి' },
  { eng: 'Titus', tel: 'తీతుకు' },
  { eng: 'Philemon', tel: 'ఫిలేమోనుకు' },
  { eng: 'Hebrews', tel: 'హెబ్రీయులకు' },
  { eng: 'James', tel: 'యాకోబు' },
  { eng: '1 Peter', tel: '1 పేతురు' },
  { eng: '2 Peter', tel: '2 పేతురు' },
  { eng: '1 John', tel: '1 యోహాను' },
  { eng: '2 John', tel: '2 యోహాను' },
  { eng: '3 John', tel: '3 యోహాను' },
  { eng: 'Jude', tel: 'యూదా' },
  { eng: 'Revelation', tel: 'ప్రకటన గ్రంథము' }
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
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Admin Panel'; }
    }
  }

  quickFillLogin(email, password) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = password;
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
        console.log('✅ Connected to ChurchConnect Live Socket Engine');
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

    if (tabId === 'bibleplans') {
      this.loadBiblePlanStats();
    }

    if (titles[tabId]) {
      document.getElementById('tabTitle').innerText = titles[tabId].title;
      document.getElementById('tabSubtitle').innerText = titles[tabId].sub;
    }
  }

  // Arrow Key Slide Navigation
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.prevSlide();
      } else if (e.key.toLowerCase() === 'b') {
        this.toggleBlackout();
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
      this.renderOverview();
      this.renderSongsTable();
      this.renderProjectionSongsList();
      this.renderMembersTable();
      this.renderEventsTable();
      this.renderNoticesTable();
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
    const list = document.getElementById('projSongsList');
    if (!list) return;

    if (this.songs.length === 0) {
      list.innerHTML = '<p class="text-muted p-2">No songs found in catalog.</p>';
      return;
    }

    list.innerHTML = this.songs.map(song => `
      <div class="proj-song-item ${this.activeSong?._id === song._id ? 'active' : ''}" onclick="app.loadSongToProjector('${song._id}')">
        <h4>${song.title}</h4>
        <small>${song.language} • ${song.lyrics?.length || 0} Slides</small>
      </div>
    `).join('');
  }

  filterProjectionSongs() {
    const query = (document.getElementById('projSongSearch').value || '').toLowerCase();
    const filtered = this.songs.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.language.toLowerCase().includes(query) ||
      (s.lyrics || []).some(l => l.text.toLowerCase().includes(query))
    );

    const list = document.getElementById('projSongsList');
    if (!list) return;

    list.innerHTML = filtered.map(song => `
      <div class="proj-song-item ${this.activeSong?._id === song._id ? 'active' : ''}" onclick="app.loadSongToProjector('${song._id}')">
        <h4>${song.title}</h4>
        <small>${song.language} • ${song.lyrics?.length || 0} Slides</small>
      </div>
    `).join('');
  }

  loadSongToProjector(songId) {
    const song = this.songs.find(s => s._id === songId);
    if (!song) return;

    this.activeSong = song;
    this.activeSlideIndex = 0;
    this.activeLineIndex = -1;
    this.blackScreen = false;
    this.blankScreen = false;

    if (this.socket) {
      this.socket.emit('startSession', { song, slideIndex: 0 });
    }

    this.renderStageScreen();
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
    this.highlightActiveTrigger();
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
    if (this.blackScreen) this.blankScreen = false;
    if (this.socket) {
      this.socket.emit('screenState', { blackScreen: this.blackScreen, blankScreen: this.blankScreen });
    }
    this.renderStageScreen();
    this.updateOverrideButtons();
  }

  toggleBlank() {
    this.blankScreen = !this.blankScreen;
    if (this.blankScreen) this.blackScreen = false;
    if (this.socket) {
      this.socket.emit('screenState', { blackScreen: this.blackScreen, blankScreen: this.blankScreen });
    }
    this.renderStageScreen();
    this.updateOverrideButtons();
  }

  updateOverrideButtons() {
    const btnB = document.getElementById('btnBlackout');
    const btnClr = document.getElementById('btnBlank');
    if (btnB) btnB.classList.toggle('active', this.blackScreen);
    if (btnClr) btnClr.classList.toggle('active', this.blankScreen);
  }

  endLiveSession() {
    if (this.socket) {
      this.socket.emit('endSession');
    }
    this.activeSong = null;
    this.renderStageScreen();
    this.renderSlideTriggers();
    this.renderProjectionSongsList();
  }

  renderStageScreen() {
    const contentEl = document.getElementById('stageScreenContent');
    const titleEl = document.getElementById('activeSongTitle');

    if (!this.activeSong) {
      titleEl.innerText = 'No Song Loaded on Projector';
      contentEl.innerHTML = '<p class="stage-placeholder">Select a song from the left list to begin projection</p>';
      return;
    }

    titleEl.innerText = `Projecting: ${this.activeSong.title} (${this.activeSong.language})`;

    if (this.blackScreen) {
      contentEl.innerHTML = '<p class="stage-placeholder" style="color: #64748b;">[ SCREEN BLACKOUT ACTIVE ]</p>';
      return;
    }

    if (this.blankScreen) {
      contentEl.innerHTML = '<p class="stage-placeholder" style="color: #ef4444;">[ TEXT BLANKED BY OPERATOR ]</p>';
      return;
    }

    const slide = this.activeSong.lyrics?.[this.activeSlideIndex];
    if (!slide) return;

    const lines = (slide.text || '').split('\n');
    contentEl.innerHTML = `
      <div class="stage-slide-type">${slide.type || 'Verse'}</div>
      ${lines.map((l, idx) => `
        <div class="stage-line ${this.activeLineIndex === idx ? 'highlighted' : ''}">${l}</div>
      `).join('')}
    `;
  }

  renderSlideTriggers() {
    const grid = document.getElementById('slidesGrid');
    if (!this.activeSong || !this.activeSong.lyrics) {
      grid.innerHTML = '<p class="empty-hint">Load a song to view lyric slide triggers.</p>';
      return;
    }

    grid.innerHTML = this.activeSong.lyrics.map((slide, index) => `
      <div class="slide-trigger-card ${this.activeSlideIndex === index ? 'active' : ''}" onclick="app.selectSlide(${index})">
        <div class="slide-trigger-tag">${slide.type || `Slide ${index + 1}`}</div>
        <div class="slide-trigger-text">${slide.text}</div>
      </div>
    `).join('');
  }

  highlightActiveTrigger() {
    const cards = document.querySelectorAll('.slide-trigger-card');
    cards.forEach((c, idx) => {
      c.classList.toggle('active', idx === this.activeSlideIndex);
    });
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
          <button class="btn btn-sm btn-outline" onclick="app.loadSongToProjector('${song._id}'); app.switchTab('projection');">
            <i class="fa-solid fa-desktop"></i> Project
          </button>
          <button class="btn btn-sm btn-danger-action" style="padding: 6px 10px;" onclick="app.deleteSong('${song._id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  openSongModal() {
    document.getElementById('songModalTitle').innerText = 'Add New Worship Song';
    document.getElementById('songTitleInput').value = '';
    document.getElementById('songLangInput').value = 'English';
    document.getElementById('songCategoryInput').value = 'Worship Songs';
    document.getElementById('songYoutubeInput').value = '';
    document.getElementById('songChordsInput').value = '';
    
    const container = document.getElementById('slidesEditorContainer');
    container.innerHTML = `
      <div class="form-group slide-box-editor">
        <input type="text" class="form-control mb-2 slide-type-field" value="Verse 1" placeholder="Slide Type (Verse 1, Chorus, etc)">
        <textarea class="form-control slide-text-field" rows="3" placeholder="Enter lyric lines..."></textarea>
      </div>
    `;

    document.getElementById('songModal').classList.add('active');
  }

  addSlideInputBox() {
    const container = document.getElementById('slidesEditorContainer');
    const div = document.createElement('div');
    div.className = 'form-group slide-box-editor mt-2';
    div.innerHTML = `
      <input type="text" class="form-control mb-2 slide-type-field" value="Chorus" placeholder="Slide Type">
      <textarea class="form-control slide-text-field" rows="3" placeholder="Enter lyric lines..."></textarea>
    `;
    container.appendChild(div);
  }

  async saveSongSubmit() {
    const title = document.getElementById('songTitleInput').value.trim();
    const language = document.getElementById('songLangInput').value;
    const category = document.getElementById('songCategoryInput').value.trim();
    const youtubeLink = document.getElementById('songYoutubeInput').value.trim();
    const chords = document.getElementById('songChordsInput').value;

    const slideBoxes = document.querySelectorAll('.slide-box-editor');
    const lyrics = [];
    slideBoxes.forEach(box => {
      const type = box.querySelector('.slide-type-field').value.trim() || 'Verse';
      const text = box.querySelector('.slide-text-field').value.trim();
      if (text) lyrics.push({ type, text });
    });

    if (!title || lyrics.length === 0) {
      alert('Please provide Song Title and at least one slide with lyrics.');
      return;
    }

    this.setButtonLoading('btnSubmitSong', true, 'Saving Song to Database...');

    try {
      const res = await this.authFetch('/api/songs', {
        method: 'POST',
        body: JSON.stringify({ title, language, category, youtubeLink, chords, lyrics })
      });
      const data = await res.json();
      if (data.success) {
        alert('🎉 Song created and saved to database successfully!');
        this.closeModal('songModal');
        await this.refreshAll();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (e) {
      alert('Failed to save song: ' + e.message);
    } finally {
      this.setButtonLoading('btnSubmitSong', false, '', 'Save Song');
    }
  }

  async deleteSong(id) {
    if (!confirm('Are you sure you want to delete this song?')) return;
    try {
      await this.authFetch(`/api/songs/${id}`, { method: 'DELETE' });
      await this.refreshAll();
    } catch (e) {
      alert('Delete failed: ' + e.message);
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

  async deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member profile? This action cannot be undone.')) return;
    try {
      const res = await this.authFetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Member profile deleted successfully.');
        await this.refreshAll();
      } else {
        alert('Delete failed: ' + (data.message || 'Error'));
      }
    } catch (e) {
      alert('Delete failed: ' + e.message);
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
        alert('🎉 Member role & department access updated successfully!');
        this.closeModal('editMemberModal');
        await this.refreshAll();
      } else {
        alert('Failed: ' + (data.message || 'Error'));
      }
    } catch (e) {
      alert('Update failed: ' + e.message);
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
      alert('Please fill Duty Title and Role.');
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
        alert('🎉 Duty assigned successfully!');
        this.closeModal('assignmentModal');
        await this.refreshAll();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (e) {
      alert('Assignment failed: ' + e.message);
    } finally {
      this.setButtonLoading('btnSubmitAssignment', false, '', 'Confirm Assignment');
    }
  }

  // EVENTS METHODS
  renderEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    if (this.events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No events created yet.</td></tr>';
      return;
    }

    tbody.innerHTML = this.events.map(ev => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${(ev.banner || ev.imageUrl) ? `<img src="${ev.banner || ev.imageUrl}" style="width:44px; height:44px; border-radius:6px; object-fit:cover; border:1px solid #eee;">` : ''}
            <div>
              <strong>${ev.title}</strong>
              <div style="font-size:11px; color:#666;">${ev.speaker ? `🎙️ ${ev.speaker}` : ''}</div>
            </div>
          </div>
        </td>
        <td>${ev.venue}</td>
        <td>${new Date(ev.date).toLocaleDateString()} ${ev.time ? `• ${ev.time}` : ''}</td>
        <td>
          ${ev.requiresRSVP 
            ? `<span class="badge badge-success"><i class="fa-solid fa-users"></i> ${(ev.rsvps || []).length} RSVP Attending</span>` 
            : `<span class="badge badge-secondary">Open Gathering (No RSVP)</span>`}
        </td>
        <td>
          <button class="btn btn-sm btn-outline" style="padding: 6px 10px; margin-right: 4px;" onclick="app.editEvent('${ev._id}')" title="Edit Event">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-sm btn-danger-action" style="padding: 6px 10px;" onclick="app.deleteEvent('${ev._id}')" title="Delete Event">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  openEventModal(evt = null) {
    document.getElementById('eventId').value = evt ? (evt._id || '') : '';
    document.getElementById('eventModalTitle').innerText = evt ? 'Edit Church Event / Service' : 'Create Church Event / Service';
    document.getElementById('eventTitle').value = evt ? (evt.title || '') : '';

    // Handle Speaker Dropdown / Custom Input
    const speakerVal = evt ? (evt.speaker || '') : '';
    const speakerSelect = document.getElementById('eventSpeakerSelect');
    const speakerCustom = document.getElementById('eventSpeakerCustom');
    if (['Pastor John Doe', 'Pastor David', 'Evangelist Billy Graham'].includes(speakerVal)) {
      speakerSelect.value = speakerVal;
      speakerCustom.style.display = 'none';
      speakerCustom.value = '';
    } else if (speakerVal) {
      speakerSelect.value = 'custom';
      speakerCustom.style.display = 'block';
      speakerCustom.value = speakerVal;
    } else {
      speakerSelect.value = 'Pastor John Doe';
      speakerCustom.style.display = 'none';
      speakerCustom.value = '';
    }

    // Handle Venue Dropdown / Custom Input
    const venueVal = evt ? (evt.venue || '') : 'Main Sanctuary';
    const venueSelect = document.getElementById('eventVenueSelect');
    const venueCustom = document.getElementById('eventVenueCustom');
    if (['Main Sanctuary', 'Youth Chapel', 'Branch Church 2'].includes(venueVal)) {
      venueSelect.value = venueVal;
      venueCustom.style.display = 'none';
      venueCustom.value = '';
    } else {
      venueSelect.value = 'custom';
      venueCustom.style.display = 'block';
      venueCustom.value = venueVal;
    }

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

  handleSpeakerSelectChange(val) {
    const customInput = document.getElementById('eventSpeakerCustom');
    if (customInput) customInput.style.display = (val === 'custom') ? 'block' : 'none';
  }

  handleVenueSelectChange(val) {
    const customInput = document.getElementById('eventVenueCustom');
    if (customInput) customInput.style.display = (val === 'custom') ? 'block' : 'none';
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
    const id = document.getElementById('eventId').value;
    const title = document.getElementById('eventTitle').value.trim();

    const speakerSelect = document.getElementById('eventSpeakerSelect').value;
    const speakerCustom = document.getElementById('eventSpeakerCustom').value.trim();
    const speaker = (speakerSelect === 'custom') ? speakerCustom : speakerSelect;

    const venueSelect = document.getElementById('eventVenueSelect').value;
    const venueCustom = document.getElementById('eventVenueCustom').value.trim();
    const venue = (venueSelect === 'custom') ? venueCustom : venueSelect;

    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value.trim();
    const banner = document.getElementById('eventBanner').value.trim();
    const mapsLocation = document.getElementById('eventMapsLocation').value.trim();
    const requiresRSVP = document.getElementById('eventRequiresRSVP').checked;
    const description = document.getElementById('eventDesc').value.trim();

    if (!title || !venue || !date) {
      alert('Title, venue, and date are required.');
      return;
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
        alert(id ? '🎉 Event updated successfully!' : '🎉 Event published successfully!');
        this.closeModal('eventModal');
        await this.refreshAll();
      } else {
        alert('Event operation failed: ' + (data.message || 'Unknown error'));
      }
    } catch (e) {
      alert('Event operation failed: ' + e.message);
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
        await this.refreshAll();
      } else {
        alert('Delete failed: ' + (data.message || 'Unknown error'));
      }
    } catch (e) {
      alert('Delete failed: ' + e.message);
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

  async saveNoticeSubmit() {
    const title = document.getElementById('noticeTitle').value.trim();
    const description = document.getElementById('noticeDesc').value.trim();
    const location = document.getElementById('noticeLoc').value.trim();
    const time = document.getElementById('noticeTime').value.trim();
    const image = document.getElementById('noticeImage').value.trim();
    const isPinned = document.getElementById('noticeIsPinned').checked;

    if (!title || !description) {
      alert('Title and description are required.');
      return;
    }

    this.setButtonLoading('btnSubmitNotice', true, 'Broadcasting Notice...');

    try {
      const res = await this.authFetch('/api/notices', {
        method: 'POST',
        body: JSON.stringify({ title, description, location, time, image, isPinned })
      });
      const data = await res.json();
      if (data.success) {
        alert('🎉 Notice broadcast successfully!');
        this.closeModal('noticeModal');
        await this.refreshAll();
      }
    } catch (e) {
      alert('Notice creation failed: ' + e.message);
    } finally {
      this.setButtonLoading('btnSubmitNotice', false, '', 'Post Notice');
    }
  }

  async deleteNotice(id) {
    if (!confirm('Delete this notice?')) return;
    try {
      await this.authFetch(`/api/notices/${id}`, { method: 'DELETE' });
      await this.refreshAll();
    } catch (e) {
      alert('Delete failed: ' + e.message);
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

    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.trim().match(regExp);

    if (match && match[2].length === 11) {
      videoId = match[2];
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
    } else {
      iframe.src = url.trim();
    }
  }

  async saveStreamUrl() {
    const url = document.getElementById('streamUrlInput').value.trim();
    if (!url) {
      alert('Please enter a valid YouTube stream URL.');
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
        alert('🎉 Live Stream link updated and broadcast to all members!');
      }
    } catch (e) {
      alert('Stream link update failed: ' + e.message);
    } finally {
      this.setButtonLoading(btn, false, '', '<i class="fa-brands fa-youtube"></i> Update Sanctuary Live Stream');
    }
  }

  // BIBLE READING PLANS & VISUAL BUILDER
  initPlanBuilder() {
    const select = document.getElementById('builderBookSelect');
    if (!select) return;
    select.innerHTML = BIBLE_BOOKS_66.map(b => `
      <option value="${b.eng}">${b.tel} (${b.eng})</option>
    `).join('');

    this.builderPortions = [];
    this.loadPlanBuilderPreset('1-year-canonical');
  }

  loadPlanBuilderPreset(presetId) {
    if (presetId === '1-year-canonical') {
      document.getElementById('builderPlanId').value = '1-year-canonical';
      document.getElementById('builderTitleEnglish').value = '1-Year Complete Bible Reading Plan';
      document.getElementById('builderTitleTelugu').value = '1 సంవత్సర సమగ్ర బైబిల్ పఠన ప్రణాళిక';
      
      this.builderPortions = [
        { day: 1, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 1, endChapter: 3, versesSummary: 'ఆదికాండము 1–3 / Genesis 1–3' },
        { day: 2, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 4, endChapter: 7, versesSummary: 'ఆదికాండము 4–7 / Genesis 4–7' },
        { day: 3, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 8, endChapter: 11, versesSummary: 'ఆదికాండము 8–11 / Genesis 8–11' },
      ];
    } else if (presetId === '2-year-canonical') {
      document.getElementById('builderPlanId').value = '2-year-canonical';
      document.getElementById('builderTitleEnglish').value = '2-Year Bible Reading Plan';
      document.getElementById('builderTitleTelugu').value = '2 సంవత్సరాల బైబిల్ పఠన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 1, endChapter: 2, versesSummary: 'ఆదికాండము 1–2 / Genesis 1–2' },
        { day: 2, book: 'Genesis', bookTelugu: 'ఆదికాండము', startChapter: 3, endChapter: 3, versesSummary: 'ఆదికాండము 3 / Genesis 3' },
      ];
    } else {
      document.getElementById('builderPlanId').value = 'custom-360-plan';
      document.getElementById('builderTitleEnglish').value = '360-Day Church Bible Study Plan';
      document.getElementById('builderTitleTelugu').value = '360 రోజుల సంఘ బైబిల్ అధ్యయన ప్రణాళిక';
      this.builderPortions = [
        { day: 1, book: 'Matthew', bookTelugu: 'మత్తయి సువార్త', startChapter: 1, endChapter: 2, versesSummary: 'మత్తయి సువార్త 1–2 / Matthew 1–2' },
      ];
    }

    this.renderBuilderPortionsTable();
  }

  updatePortionSummaryPreview() {
    const bookEng = document.getElementById('builderBookSelect').value;
    const b = BIBLE_BOOKS_66.find(item => item.eng === bookEng) || { eng: bookEng, tel: bookEng };
    const startCh = document.getElementById('builderStartCh').value || 1;
    const endCh = document.getElementById('builderEndCh').value || startCh;

    const chStr = startCh === endCh ? `${startCh}` : `${startCh}–${endCh}`;
    const autoSummary = `${b.tel} ${chStr} / ${b.eng} ${chStr}`;
    document.getElementById('builderSummary').value = autoSummary;
  }

  onBuilderBookChange(val) {
    this.updatePortionSummaryPreview();
  }

  onBuilderDayChange(val) {
    const dayNum = Number(val) || 1;
    const existing = this.builderPortions.find(p => p.day === dayNum);
    if (existing) {
      document.getElementById('builderBookSelect').value = existing.book;
      document.getElementById('builderStartCh').value = existing.startChapter;
      document.getElementById('builderEndCh').value = existing.endChapter;
      document.getElementById('builderSummary').value = existing.versesSummary;
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
      alert('Please provide Plan ID, Title, and at least 1 configured day portion.');
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
        alert(`🎉 Plan "${titleEnglish}" with ${this.builderPortions.length} days saved and deployed successfully to all mobile devices!`);
        await this.loadBiblePlanStats();
      } else {
        alert('Failed: ' + (json.message || 'Error'));
      }
    } catch (e) {
      alert('Plan save failed: ' + e.message);
    } finally {
      this.setButtonLoading('btnSaveBuilderPlan', false, '', '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Deploy 365-Day Plan to Database');
    }
  }

  async loadBiblePlanStats() {
    try {
      const res = await fetch('/api/bible-plans/admin/statistics');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        document.getElementById('statPlanEnrolled').innerText = d.totalEnrolledMembers || 0;
        document.getElementById('statPlanStreaks').innerText = `${d.activeStreakCount || 0} 🔥`;
        document.getElementById('statPlanCompleted').innerText = d.totalPortionsCompleted || 0;

        const tbody = document.getElementById('planLeaderboardBody');
        if (d.topReaders && d.topReaders.length > 0) {
          tbody.innerHTML = d.topReaders.map(r => `
            <tr>
              <td><strong>${r.userId}</strong></td>
              <td><span class="badge badge-primary">${r.planId}</span></td>
              <td>Day ${r.currentDay}</td>
              <td>${r.completedDays ? r.completedDays.length : 0} days</td>
              <td><span class="badge badge-success">🔥 ${r.streak} streak</span></td>
            </tr>
          `).join('');
        } else {
          tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No member reading data recorded yet.</td></tr>`;
        }
      }
    } catch (e) {
      console.log('Error loading Bible plan stats:', e);
    }
  }

  async saveDailyPromiseSubmit() {
    const verseTelugu = document.getElementById('adminPromiseTelugu').value.trim();
    const referenceTelugu = document.getElementById('adminPromiseRef').value.trim();
    const verseEnglish = document.getElementById('adminPromiseEnglish').value.trim();

    if (!verseTelugu || !referenceTelugu) {
      alert('Telugu Promise Verse and Reference are required.');
      return;
    }

    const btn = document.querySelector("button[onclick='app.saveDailyPromiseSubmit()']");
    this.setButtonLoading(btn, true, 'Publishing Promise...');

    try {
      const res = await this.authFetch('/api/bible-plans/daily-promise', {
        method: 'POST',
        body: JSON.stringify({ verseTelugu, referenceTelugu, verseEnglish })
      });
      const json = await res.json();
      if (json.success) {
        alert('🎉 Today\'s God\'s Promise published successfully to all mobile apps in Telugu!');
      } else {
        alert('Failed: ' + json.message);
      }
    } catch (e) {
      alert('Error saving promise: ' + e.message);
    } finally {
      this.setButtonLoading(btn, false, '', '<i class="fa-solid fa-paper-plane"></i> Publish Today\'s Promise');
    }
  }

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }
}

// Instantiate global app instance
const app = new ChurchApp();
window.app = app;
