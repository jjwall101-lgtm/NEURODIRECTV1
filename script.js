/* NeuroDirect Teen App
   Local-only PWA for ages 13–17. No Firebase in this version. */
(() => {
  'use strict';

  const APP_VERSION = '2.0.0';
  const STORAGE_KEY = 'neurodirectTeenAppState.v1';
  const SESSION_PARENT_KEY = 'neurodirectParentUnlocked';
  const DEFAULT_PIN = '2468';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const clamp = (num, min, max) => Math.min(Math.max(Number(num) || 0, min), max);
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const defaultState = () => ({
    version: APP_VERSION,
    profile: {
      teenName: 'Your teen',
      theme: 'dark',
      parentPin: DEFAULT_PIN,
      firstRunComplete: false
    },
    points: 0,
    checkins: [],
    tasks: [
      { id: uid(), title: 'Pack school bag', category: 'School', due: todayKey(), priority: 'normal', done: false, awarded: false, createdAt: new Date().toISOString() },
      { id: uid(), title: '10 minute reset before bed', category: 'Wellbeing', due: todayKey(), priority: 'low', done: false, awarded: false, createdAt: new Date().toISOString() }
    ],
    goals: [
      { id: uid(), title: 'Complete homework without rushing', target: 3, progress: 0, points: 15, completedAwarded: false, createdAt: new Date().toISOString() },
      { id: uid(), title: 'Use a calm tool when overloaded', target: 2, progress: 0, points: 10, completedAwarded: false, createdAt: new Date().toISOString() }
    ],
    rewards: [
      { id: uid(), title: 'Extra gaming time', cost: 30, claimed: false, createdAt: new Date().toISOString() },
      { id: uid(), title: 'Choose a takeaway', cost: 55, claimed: false, createdAt: new Date().toISOString() },
      { id: uid(), title: 'Money towards something wanted', cost: 80, claimed: false, createdAt: new Date().toISOString() }
    ],
    journal: [],
    calmSessions: [],
    supportRequests: []
  });

  let state = loadState();
  let activeTab = 'today';
  let timer = null;
  let timerRemaining = 0;
  let timerTotal = 300;
  let timerMode = 'Reset timer';
  let deferredInstallPrompt = null;

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored || typeof stored !== 'object') return defaultState();
      const base = defaultState();
      return {
        ...base,
        ...stored,
        profile: { ...base.profile, ...(stored.profile || {}) },
        points: Number(stored.points || 0),
        checkins: Array.isArray(stored.checkins) ? stored.checkins : [],
        tasks: Array.isArray(stored.tasks) ? stored.tasks : [],
        goals: Array.isArray(stored.goals) ? stored.goals : [],
        rewards: Array.isArray(stored.rewards) ? stored.rewards : [],
        journal: Array.isArray(stored.journal) ? stored.journal : [],
        calmSessions: Array.isArray(stored.calmSessions) ? stored.calmSessions : [],
        supportRequests: Array.isArray(stored.supportRequests) ? stored.supportRequests : []
      };
    } catch (error) {
      console.warn('Unable to load state. Starting fresh.', error);
      return defaultState();
    }
  }

  function saveState() {
    state.version = APP_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setTab(tab) {
    activeTab = tab;
    render();
    const app = $('#app');
    if (app) app.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function todayCheckin() {
    return state.checkins.find(item => item.date === todayKey()) || null;
  }

  function checkinsNewest(limit = 14) {
    return [...state.checkins]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }

  function recentAverage(key, limit = 7) {
    const values = checkinsNewest(limit).map(item => Number(item[key])).filter(Number.isFinite);
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  function readinessScore(checkin) {
    if (!checkin) return 0;
    const mood = Number(checkin.mood) || 0;
    const energy = Number(checkin.energy) || 0;
    const focus = Number(checkin.focus) || 0;
    const sleep = Number(checkin.sleep) || 0;
    const stress = Number(checkin.stress) || 0;
    return Math.round(((mood + energy + focus + sleep + (11 - stress)) / 50) * 100);
  }

  function taskDueToday(task) {
    return task.due === todayKey() || !task.due;
  }

  function incompleteTasksToday() {
    return state.tasks.filter(task => !task.done && taskDueToday(task));
  }

  function updateNav() {
    $$('.nav-link, .mobile-link').forEach(button => {
      button.classList.toggle('is-active', button.dataset.tab === activeTab);
    });
  }

  function applyTheme() {
    const theme = state.profile.theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#f6f9fc' : '#06111f');
    updateThemeControls();
  }

  function updateThemeControls() {
    const theme = state.profile.theme === 'light' ? 'light' : 'dark';
    $$('[data-theme-mode]').forEach(button => {
      const active = button.dataset.themeMode === theme;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function render() {
    applyTheme();
    updateNav();
    const views = {
      today: renderToday,
      checkin: renderCheckin,
      planner: renderPlanner,
      goals: renderGoals,
      calm: renderCalm,
      journal: renderJournal,
      parent: renderParent
    };
    $('#app').innerHTML = (views[activeTab] || renderToday)();
    bindRangeOutputs();
    updateTimerDisplay();
  }

  function pageHead(title, lede, actions = '') {
    return `
      <section class="page-head">
        <div>
          <h2>${title}</h2>
          <p class="lede">${lede}</p>
        </div>
        <div class="pill-row">${actions}</div>
      </section>
    `;
  }

  function statusPill(status = 'alright') {
    const labels = {
      good: 'Good',
      alright: 'Alright',
      rough: 'Rough',
      overloaded: 'Overloaded',
      space: 'Need space',
      help: 'Need help'
    };
    return `<span class="status-pill ${status}">${labels[status] || 'Alright'}</span>`;
  }

  function stat(label, value, suffix = '') {
    const display = value || value === 0 ? value : '—';
    return `<div class="stat-card"><b>${display}${suffix}</b><span>${label}</span></div>`;
  }

  function empty(label = 'No items yet.') {
    return `<div class="empty-state"><div class="empty-icon">•</div><p>${label}</p></div>`;
  }

  function renderToday() {
    const checkin = todayCheckin();
    const score = readinessScore(checkin);
    const greeting = state.profile.teenName && state.profile.teenName !== 'Your teen'
      ? `Hi, ${escapeHtml(state.profile.teenName)}`
      : 'Today';
    const taskList = incompleteTasksToday().slice(0, 5);
    const sharedEntries = state.journal.filter(entry => entry.visibility === 'shared').slice(-3).reverse();
    const installAction = deferredInstallPrompt
      ? '<button class="secondary-btn small" id="installApp" type="button">Install app</button>'
      : '';

    return `
      ${pageHead(greeting, 'A calm, grown-up space to track mood, focus, plans, goals and support.', `
        ${statusPill(checkin?.status || 'alright')}
        <span class="pill">${state.points} pts</span>
        ${installAction}
      `)}

      <section class="grid main-dashboard">
        <article class="card hero-card">
          <div class="hero-row">
            <div>
              <p class="eyebrow">Daily readiness</p>
              <h3>${checkin ? 'Check-in complete' : 'No check-in yet'}</h3>
              <p>${checkin ? escapeHtml(checkin.note || 'Scores saved for today.') : 'Start with a quick check-in. It takes less than a minute and helps spot patterns.'}</p>
              <div class="pill-row">
                <button class="primary-btn" data-go="checkin" type="button">Open check-in</button>
                <button class="ghost-btn" data-go="calm" type="button">Use calm tool</button>
              </div>
            </div>
            <div class="score-ring" style="--score:${score}">
              <div><strong>${score || '—'}</strong><span>${score ? 'out of 100' : 'not set'}</span></div>
            </div>
          </div>
          <div class="stat-grid">
            ${stat('Mood', checkin?.mood, '/10')}
            ${stat('Stress', checkin?.stress, '/10')}
            ${stat('Energy', checkin?.energy, '/10')}
            ${stat('Focus', checkin?.focus, '/10')}
            ${stat('Sleep', checkin?.sleep, '/10')}
          </div>
        </article>

        <article class="card">
          <p class="eyebrow">This week</p>
          <h3>Pattern snapshot</h3>
          <div class="stat-grid">
            ${stat('Avg mood', recentAverage('mood'), '/10')}
            ${stat('Avg stress', recentAverage('stress'), '/10')}
            ${stat('Avg sleep', recentAverage('sleep'), '/10')}
            ${stat('Sessions', state.calmSessions.length)}
          </div>
          <div class="hr"></div>
          <p>Private journal entries stay in the teen view. Parent view only shows shared entries and trend data.</p>
        </article>
      </section>

      <section class="grid two" style="margin-top:14px">
        <article class="card">
          <div class="goal-top">
            <div>
              <p class="eyebrow">Planner</p>
              <h3>Today’s tasks</h3>
            </div>
            <button class="ghost-btn small" data-go="planner" type="button">Manage</button>
          </div>
          <div class="list">
            ${taskList.length ? taskList.map(taskTemplate).join('') : empty('No open tasks for today.')}
          </div>
        </article>
        <article class="card">
          <div class="goal-top">
            <div>
              <p class="eyebrow">Shared notes</p>
              <h3>What parents can see</h3>
            </div>
            <button class="ghost-btn small" data-go="journal" type="button">Journal</button>
          </div>
          <div class="list">
            ${sharedEntries.length ? sharedEntries.map(entryTemplate).join('') : empty('No shared journal entries.')}
          </div>
        </article>
      </section>
    `;
  }

  function renderCheckin() {
    const checkin = todayCheckin() || {
      status: 'alright', mood: 5, stress: 5, energy: 5, focus: 5, sleep: 5, school: 'mixed', note: ''
    };

    return `
      ${pageHead('Check-in', 'Quick sliders for how the day is going. This is for patterns, not judgement.', `
        <span class="pill">+5 pts once per day</span>
      `)}

      <section class="grid two">
        <article class="card">
          <form class="form" id="checkinForm">
            <div class="form-row">
              <label class="field">Today feels like
                <select name="status">
                  ${option('good', 'Good', checkin.status)}
                  ${option('alright', 'Alright', checkin.status)}
                  ${option('rough', 'Rough', checkin.status)}
                  ${option('overloaded', 'Overloaded', checkin.status)}
                  ${option('space', 'Need space', checkin.status)}
                  ${option('help', 'Need help', checkin.status)}
                </select>
              </label>
              <label class="field">School / college day
                <select name="school">
                  ${option('good', 'Good', checkin.school)}
                  ${option('mixed', 'Mixed', checkin.school)}
                  ${option('hard', 'Hard', checkin.school)}
                  ${option('not-school-day', 'Not a school day', checkin.school)}
                </select>
              </label>
            </div>
            ${rangeField('Mood', 'mood', checkin.mood)}
            ${rangeField('Stress', 'stress', checkin.stress)}
            ${rangeField('Energy', 'energy', checkin.energy)}
            ${rangeField('Focus', 'focus', checkin.focus)}
            ${rangeField('Sleep', 'sleep', checkin.sleep)}
            <label class="field">Optional note
              <textarea name="note" placeholder="Anything worth remembering?">${escapeHtml(checkin.note || '')}</textarea>
            </label>
            <button class="primary-btn" type="submit">Save today’s check-in</button>
          </form>
        </article>

        <aside class="card privacy-card">
          <p class="eyebrow">Privacy built in</p>
          <h3>Teen-first, parent-supported</h3>
          <p>The parent area shows trends, tasks and shared journal notes. Private notes are not shown in the parent area.</p>
          <div class="hr"></div>
          <h3>When to use “Need help”</h3>
          <p>Use it when talking would help, when the day feels too much, or when you need an adult to step in calmly.</p>
          <button class="secondary-btn" data-support="Need help" type="button">Send support request</button>
        </aside>
      </section>
    `;
  }

  function rangeField(label, name, value) {
    return `
      <div class="range-field">
        <div class="range-top"><label for="${name}">${label}</label><span class="range-value" data-output="${name}">${value}</span></div>
        <input id="${name}" name="${name}" type="range" min="1" max="10" value="${value}" />
      </div>
    `;
  }

  function option(value, label, selected) {
    return `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`;
  }

  function renderPlanner() {
    const sorted = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done) || String(a.due || '').localeCompare(String(b.due || '')));
    return `
      ${pageHead('Planner', 'Keep school, home, revision and personal tasks in one clean list.', `
        <span class="pill">Done tasks earn 2 pts</span>
      `)}

      <section class="grid two">
        <article class="card">
          <h3>Add task</h3>
          <form class="form" id="taskForm" style="margin-top:14px">
            <label class="field">Task title
              <input name="title" type="text" placeholder="e.g. Finish maths homework" required maxlength="90" />
            </label>
            <div class="form-row">
              <label class="field">Category
                <select name="category">
                  <option>School</option>
                  <option>Revision</option>
                  <option>Home</option>
                  <option>Wellbeing</option>
                  <option>Appointment</option>
                  <option>Other</option>
                </select>
              </label>
              <label class="field">Priority
                <select name="priority">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <label class="field">Due date
              <input name="due" type="date" value="${todayKey()}" />
            </label>
            <button class="primary-btn" type="submit">Add task</button>
          </form>
        </article>

        <article class="card">
          <div class="goal-top">
            <div>
              <p class="eyebrow">Task list</p>
              <h3>${state.tasks.filter(t => !t.done).length} open</h3>
            </div>
            <button class="ghost-btn small" data-clear-done type="button">Clear done</button>
          </div>
          <div class="list">
            ${sorted.length ? sorted.map(taskTemplate).join('') : empty('No tasks yet.')}
          </div>
        </article>
      </section>
    `;
  }

  function taskTemplate(task) {
    return `
      <div class="task-item ${task.done ? 'done' : ''}" data-task-id="${task.id}">
        <button class="check-dot" data-toggle-task="${task.id}" type="button" aria-label="Toggle task"></button>
        <div>
          <span class="item-title">${escapeHtml(task.title)}</span>
          <div class="item-meta">
            <span>${escapeHtml(task.category || 'Other')}</span>
            <span>•</span>
            <span>${task.due ? escapeHtml(task.due) : 'No date'}</span>
            <span>•</span>
            <span class="priority-${escapeHtml(task.priority || 'normal')}">${escapeHtml(task.priority || 'normal')}</span>
          </div>
        </div>
        <button class="icon-btn" data-delete-task="${task.id}" type="button" aria-label="Delete task">×</button>
      </div>
    `;
  }

  function renderGoals() {
    return `
      ${pageHead('Goals', 'Use goals and responsibility points instead of childish reward charts.', `
        <span class="pill">${state.points} points available</span>
      `)}

      <section class="grid two">
        <article class="card">
          <h3>Add goal</h3>
          <form class="form" id="goalForm" style="margin-top:14px">
            <label class="field">Goal title
              <input name="title" type="text" placeholder="e.g. Revise for 20 minutes" maxlength="90" required />
            </label>
            <div class="form-row">
              <label class="field">Target count
                <input name="target" type="number" min="1" max="100" value="3" required />
              </label>
              <label class="field">Points when complete
                <input name="points" type="number" min="1" max="500" value="10" required />
              </label>
            </div>
            <button class="primary-btn" type="submit">Add goal</button>
          </form>
        </article>

        <article class="card">
          <h3>Rewards / agreements</h3>
          <form class="form" id="rewardForm" style="margin-top:14px">
            <label class="field">Reward or agreement
              <input name="title" type="text" placeholder="e.g. Later bedtime on Friday" maxlength="90" required />
            </label>
            <label class="field">Cost in points
              <input name="cost" type="number" min="1" max="999" value="25" required />
            </label>
            <button class="secondary-btn" type="submit">Add reward</button>
          </form>
        </article>
      </section>

      <section class="grid two" style="margin-top:14px">
        <article class="card">
          <p class="eyebrow">Progress</p>
          <h3>Active goals</h3>
          <div class="list">
            ${state.goals.length ? state.goals.map(goalTemplate).join('') : empty('No goals yet.')}
          </div>
        </article>
        <article class="card">
          <p class="eyebrow">Points store</p>
          <h3>Rewards</h3>
          <div class="list">
            ${state.rewards.length ? state.rewards.map(rewardTemplate).join('') : empty('No rewards yet.')}
          </div>
        </article>
      </section>
    `;
  }

  function goalTemplate(goal) {
    const percent = Math.min(100, Math.round((Number(goal.progress || 0) / Number(goal.target || 1)) * 100));
    const complete = Number(goal.progress || 0) >= Number(goal.target || 1);
    return `
      <div class="goal-item" data-goal-id="${goal.id}">
        <div class="goal-top">
          <div>
            <span class="item-title">${escapeHtml(goal.title)}</span>
            <div class="item-meta"><span>${goal.progress || 0}/${goal.target}</span><span>•</span><span>${goal.points} pts</span>${complete ? '<span>• complete</span>' : ''}</div>
          </div>
          <div class="pill-row">
            <button class="ghost-btn small" data-dec-goal="${goal.id}" type="button">−</button>
            <button class="secondary-btn small" data-inc-goal="${goal.id}" type="button">+1</button>
            <button class="icon-btn" data-delete-goal="${goal.id}" type="button" aria-label="Delete goal">×</button>
          </div>
        </div>
        <div class="progress-bar" style="--progress:${percent}%"><span></span></div>
      </div>
    `;
  }

  function rewardTemplate(reward) {
    const canClaim = state.points >= Number(reward.cost || 0) && !reward.claimed;
    return `
      <div class="reward-card" data-reward-id="${reward.id}">
        <div class="reward-top">
          <div>
            <span class="item-title">${escapeHtml(reward.title)}</span>
            <div class="item-meta"><span>${reward.cost} pts</span>${reward.claimed ? '<span>• claimed</span>' : ''}</div>
          </div>
          <div class="pill-row">
            <button class="primary-btn small" data-claim-reward="${reward.id}" type="button" ${canClaim ? '' : 'disabled'}>${reward.claimed ? 'Claimed' : 'Claim'}</button>
            <button class="icon-btn" data-delete-reward="${reward.id}" type="button" aria-label="Delete reward">×</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCalm() {
    return `
      ${pageHead('Calm tools', 'Timers and prompts for cooling down, getting space and resetting before reacting.', `
        <span class="pill">${state.calmSessions.length} sessions logged</span>
      `)}

      <section class="calm-layout">
        <article class="card timer-card">
          <div class="card-title-row">
            <div class="card-title-lockup">
              <svg class="line-icon" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M25.5 5.8C16.2 5.8 7.6 12.3 6.6 22.2c6.7.3 13-2.9 16.9-9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.5 26.2c3-6 7.8-10.2 14.5-12.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
              </svg>
              <h3>Take a short pause</h3>
            </div>
            <span class="info-dot" title="Use this when you need a reset before reacting.">i</span>
          </div>

          <div class="timer-display" id="timerRing" style="--timer-progress:100%">
            <div class="timer-center">
              <strong id="timerText">05:00</strong>
              <span id="timerModeText">Reset timer</span>
            </div>
          </div>

          <div class="timer-duration-row" aria-label="Timer lengths">
            <button class="ghost-btn small" data-start-timer="2" type="button">2 min</button>
            <button class="ghost-btn small" data-start-timer="5" type="button">5 min</button>
            <button class="ghost-btn small" data-start-timer="10" type="button">10 min</button>
            <button class="ghost-btn small" data-start-timer="20" type="button">20 min</button>
          </div>

          <div class="timer-actions">
            <button class="primary-btn" data-timer-mode="Breathing" type="button">Breathing</button>
            <button class="secondary-btn" data-timer-mode="Space" type="button">Need space</button>
            <button class="danger-btn" data-stop-timer type="button">Stop</button>
          </div>
        </article>

        <section class="grid two compact-panels">
          <aside class="card alert-card">
            <p class="eyebrow">Support</p>
            <h3>I need help / space</h3>
            <p>This creates a parent-visible support request in the app. It does not send a real phone notification in this local version.</p>
            <div class="pill-row">
              <button class="secondary-btn" data-support="Can we talk?" type="button">Can we talk?</button>
              <button class="ghost-btn" data-support="Need space" type="button">Need space</button>
              <button class="danger-btn" data-support="Need help" type="button">Need help</button>
            </div>
            <div class="hr"></div>
            <p><strong>Safety note:</strong> if someone is in immediate danger, use emergency help now. This app is not an emergency service.</p>
          </aside>

          <section class="card privacy-card">
            <p class="eyebrow">Grounding prompt</p>
            <h3>5–4–3–2–1 reset</h3>
            <p>Name 5 things you can see, 4 things you can feel, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. Keep your shoulders low and breathe slowly.</p>
          </section>
        </section>
      </section>
    `;
  }

  function renderJournal() {
    const entries = [...state.journal].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `
      ${pageHead('Journal', 'Write privately, or choose to share a note with the parent area.', `
        <span class="pill">Private by default</span>
      `)}

      <section class="grid two">
        <article class="card">
          <h3>New journal entry</h3>
          <form class="form" id="journalForm" style="margin-top:14px">
            <label class="field">Title
              <input name="title" type="text" placeholder="e.g. Today was a lot" maxlength="90" required />
            </label>
            <label class="field">Entry
              <textarea name="body" placeholder="Write what happened, what helped, or what you need next." required></textarea>
            </label>
            <label class="field">Visibility
              <select name="visibility">
                <option value="private">Private</option>
                <option value="shared">Share with parent view</option>
              </select>
            </label>
            <button class="primary-btn" type="submit">Save entry</button>
          </form>
        </article>

        <article class="card">
          <p class="eyebrow">Saved entries</p>
          <h3>${entries.length} entries</h3>
          <div class="list">
            ${entries.length ? entries.map(entryTemplate).join('') : empty('No journal entries yet.')}
          </div>
        </article>
      </section>
    `;
  }

  function entryTemplate(entry) {
    return `
      <div class="entry-card" data-entry-id="${entry.id}">
        <div class="entry-top">
          <div>
            <span class="item-title">${escapeHtml(entry.title)}</span>
            <div class="item-meta"><span>${escapeHtml((entry.createdAt || '').slice(0, 10))}</span><span>•</span><span>${entry.visibility === 'shared' ? 'shared' : 'private'}</span></div>
          </div>
          <button class="icon-btn" data-delete-entry="${entry.id}" type="button" aria-label="Delete entry">×</button>
        </div>
        <p>${escapeHtml(entry.body)}</p>
      </div>
    `;
  }

  function renderParent() {
    const unlocked = sessionStorage.getItem(SESSION_PARENT_KEY) === 'true';
    if (!unlocked) {
      return `
        ${pageHead('Parent area', 'PIN-protected overview for trends, shared notes, agreements and data export.')}
        <section class="modal-wrap">
          <article class="modal-card">
            <p class="eyebrow">Protected</p>
            <h2>Enter parent PIN</h2>
            <p class="lede">Default PIN is 2468. Change it after first setup.</p>
            <form class="form" id="pinForm" style="margin-top:16px">
              <label class="field">PIN
                <input name="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12" required />
              </label>
              <button class="primary-btn" type="submit">Unlock parent area</button>
            </form>
          </article>
        </section>
      `;
    }

    const sharedEntries = state.journal.filter(entry => entry.visibility === 'shared').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const openRequests = [...state.supportRequests].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8);

    return `
      ${pageHead('Parent area', 'A calm support overview without making the teen side feel like surveillance.', `
        <button class="ghost-btn small" data-lock-parent type="button">Lock</button>
        <button class="secondary-btn small" id="exportData" type="button">Export data</button>
      `)}

      <section class="grid four">
        <article class="stat-card"><span>Available points</span><div class="kpi">${state.points}</div></article>
        <article class="stat-card"><span>Avg mood</span><div class="kpi">${recentAverage('mood') || '—'}</div></article>
        <article class="stat-card"><span>Avg stress</span><div class="kpi">${recentAverage('stress') || '—'}</div></article>
        <article class="stat-card"><span>Open tasks</span><div class="kpi">${state.tasks.filter(t => !t.done).length}</div></article>
      </section>

      <section class="grid two" style="margin-top:14px">
        <article class="card">
          <p class="eyebrow">Setup</p>
          <h3>Profile and PIN</h3>
          <form class="form" id="settingsForm" style="margin-top:14px">
            <label class="field">Teen display name
              <input name="teenName" type="text" maxlength="60" value="${escapeHtml(state.profile.teenName)}" />
            </label>
            <div class="form-row">
              <label class="field">Theme
                <select name="theme">
                  ${option('dark', 'Premium dark', state.profile.theme)}
                  ${option('light', 'Clean light', state.profile.theme)}
                </select>
              </label>
              <label class="field">New parent PIN
                <input name="parentPin" type="password" inputmode="numeric" maxlength="12" placeholder="Leave blank to keep current" />
              </label>
            </div>
            <button class="primary-btn" type="submit">Save settings</button>
          </form>
          <div class="hr"></div>
          <div class="file-input-wrap">
            <button class="ghost-btn" id="importDataButton" type="button">Import backup</button>
            <input id="importDataInput" class="hidden-input" type="file" accept="application/json" />
            <button class="danger-btn" data-reset-app type="button">Reset app</button>
          </div>
        </article>

        <article class="card alert-card">
          <p class="eyebrow">Support requests</p>
          <h3>Recent requests</h3>
          <div class="list">
            ${openRequests.length ? openRequests.map(requestTemplate).join('') : empty('No support requests yet.')}
          </div>
        </article>
      </section>

      <section class="grid two" style="margin-top:14px">
        <article class="card privacy-card">
          <p class="eyebrow">Shared journal</p>
          <h3>Shared by teen</h3>
          <div class="list">
            ${sharedEntries.length ? sharedEntries.map(entryTemplate).join('') : empty('No shared journal entries.')}
          </div>
        </article>
        <article class="card">
          <p class="eyebrow">Check-in history</p>
          <h3>Recent check-ins</h3>
          <div class="list">
            ${checkinsNewest(10).length ? checkinsNewest(10).map(checkinTemplate).join('') : empty('No check-ins yet.')}
          </div>
        </article>
      </section>
    `;
  }

  function requestTemplate(request) {
    return `
      <div class="timeline-item">
        <div class="goal-top">
          <div>
            <span class="item-title">${escapeHtml(request.type)}</span>
            <div class="item-meta"><span>${escapeHtml(new Date(request.createdAt).toLocaleString())}</span></div>
          </div>
          <button class="icon-btn" data-delete-request="${request.id}" type="button" aria-label="Clear request">×</button>
        </div>
      </div>
    `;
  }

  function checkinTemplate(checkin) {
    return `
      <div class="timeline-item">
        <div class="goal-top">
          <div>
            <span class="item-title">${escapeHtml(checkin.date)}</span>
            <div class="item-meta"><span>Mood ${checkin.mood}/10</span><span>•</span><span>Stress ${checkin.stress}/10</span><span>•</span><span>Sleep ${checkin.sleep}/10</span></div>
          </div>
          ${statusPill(checkin.status)}
        </div>
        ${checkin.note ? `<p>${escapeHtml(checkin.note)}</p>` : ''}
      </div>
    `;
  }

  function bindRangeOutputs() {
    $$('input[type="range"]').forEach(input => {
      const output = $(`[data-output="${input.name}"]`);
      if (!output) return;
      output.textContent = input.value;
      input.addEventListener('input', () => { output.textContent = input.value; });
    });
  }

  function toast(message) {
    let node = $('.toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('show');
    window.clearTimeout(node.dataset.timeoutId);
    const timeoutId = window.setTimeout(() => node.classList.remove('show'), 2200);
    node.dataset.timeoutId = timeoutId;
  }

  function awardPoints(amount, reason) {
    state.points += Number(amount) || 0;
    if (amount > 0) toast(`+${amount} points: ${reason}`);
  }

  function saveCheckin(form) {
    const data = new FormData(form);
    const existing = todayCheckin();
    const checkin = {
      id: existing?.id || uid(),
      date: todayKey(),
      status: data.get('status'),
      school: data.get('school'),
      mood: clamp(data.get('mood'), 1, 10),
      stress: clamp(data.get('stress'), 1, 10),
      energy: clamp(data.get('energy'), 1, 10),
      focus: clamp(data.get('focus'), 1, 10),
      sleep: clamp(data.get('sleep'), 1, 10),
      note: String(data.get('note') || '').trim(),
      awarded: existing?.awarded || false,
      updatedAt: new Date().toISOString()
    };
    if (existing) {
      state.checkins = state.checkins.map(item => item.id === existing.id ? checkin : item);
    } else {
      state.checkins.push(checkin);
    }
    if (!checkin.awarded) {
      checkin.awarded = true;
      awardPoints(5, 'daily check-in');
    }
    saveState();
    toast('Check-in saved');
    setTab('today');
  }

  function addTask(form) {
    const data = new FormData(form);
    state.tasks.unshift({
      id: uid(),
      title: String(data.get('title') || '').trim(),
      category: String(data.get('category') || 'Other'),
      due: String(data.get('due') || ''),
      priority: String(data.get('priority') || 'normal'),
      done: false,
      awarded: false,
      createdAt: new Date().toISOString()
    });
    saveState();
    form.reset();
    toast('Task added');
    render();
  }

  function toggleTask(id) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    task.done = !task.done;
    if (task.done && !task.awarded) {
      task.awarded = true;
      awardPoints(2, 'task completed');
    }
    saveState();
    render();
  }

  function addGoal(form) {
    const data = new FormData(form);
    state.goals.unshift({
      id: uid(),
      title: String(data.get('title') || '').trim(),
      target: clamp(data.get('target'), 1, 100),
      progress: 0,
      points: clamp(data.get('points'), 1, 500),
      completedAwarded: false,
      createdAt: new Date().toISOString()
    });
    saveState();
    toast('Goal added');
    form.reset();
    render();
  }

  function adjustGoal(id, delta) {
    const goal = state.goals.find(item => item.id === id);
    if (!goal) return;
    goal.progress = clamp(Number(goal.progress || 0) + delta, 0, Number(goal.target || 1));
    if (goal.progress >= goal.target && !goal.completedAwarded) {
      goal.completedAwarded = true;
      awardPoints(goal.points, 'goal completed');
    }
    if (goal.progress < goal.target) goal.completedAwarded = false;
    saveState();
    render();
  }

  function addReward(form) {
    const data = new FormData(form);
    state.rewards.unshift({
      id: uid(),
      title: String(data.get('title') || '').trim(),
      cost: clamp(data.get('cost'), 1, 999),
      claimed: false,
      createdAt: new Date().toISOString()
    });
    saveState();
    toast('Reward added');
    form.reset();
    render();
  }

  function claimReward(id) {
    const reward = state.rewards.find(item => item.id === id);
    if (!reward || reward.claimed) return;
    if (state.points < reward.cost) {
      toast('Not enough points yet');
      return;
    }
    state.points -= Number(reward.cost);
    reward.claimed = true;
    reward.claimedAt = new Date().toISOString();
    saveState();
    toast('Reward claimed');
    render();
  }

  function addJournal(form) {
    const data = new FormData(form);
    state.journal.unshift({
      id: uid(),
      title: String(data.get('title') || '').trim(),
      body: String(data.get('body') || '').trim(),
      visibility: String(data.get('visibility') || 'private'),
      createdAt: new Date().toISOString()
    });
    saveState();
    toast('Journal entry saved');
    form.reset();
    render();
  }

  function sendSupport(type) {
    state.supportRequests.push({ id: uid(), type, createdAt: new Date().toISOString() });
    saveState();
    toast('Support request saved');
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function updateTimerDisplay() {
    const text = $('#timerText');
    const modeText = $('#timerModeText');
    const ring = $('#timerRing');
    const total = timerTotal || 300;
    const remaining = timerRemaining || total;
    const progress = Math.max(0, Math.min(100, (remaining / total) * 100));
    if (text) text.textContent = formatTime(remaining);
    if (modeText) modeText.textContent = timerMode;
    if (ring) ring.style.setProperty('--timer-progress', `${progress}%`);
  }

  function startTimer(minutes) {
    stopTimer(false);
    timerTotal = clamp(minutes, 1, 120) * 60;
    timerRemaining = timerTotal;
    updateTimerDisplay();
    timer = window.setInterval(() => {
      timerRemaining -= 1;
      updateTimerDisplay();
      if (timerRemaining <= 0) {
        stopTimer(false);
        state.calmSessions.push({ id: uid(), mode: timerMode, minutes: Number(minutes), createdAt: new Date().toISOString() });
        saveState();
        toast('Calm session complete');
        render();
      }
    }, 1000);
  }

  function stopTimer(showToast = true) {
    if (timer) window.clearInterval(timer);
    timer = null;
    if (showToast) toast('Timer stopped');
  }

  function saveSettings(form) {
    const data = new FormData(form);
    const pin = String(data.get('parentPin') || '').trim();
    state.profile.teenName = String(data.get('teenName') || 'Your teen').trim() || 'Your teen';
    state.profile.theme = String(data.get('theme') || 'dark');
    if (pin) state.profile.parentPin = pin;
    state.profile.firstRunComplete = true;
    saveState();
    toast('Settings saved');
    render();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neurodirect-backup-${todayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Backup exported');
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported || typeof imported !== 'object') throw new Error('Invalid file');
        state = {
          ...defaultState(),
          ...imported,
          profile: { ...defaultState().profile, ...(imported.profile || {}) }
        };
        saveState();
        toast('Backup imported');
        render();
      } catch (error) {
        console.error(error);
        toast('Could not import backup');
      }
    };
    reader.readAsText(file);
  }

  function resetApp() {
    const confirmed = window.confirm('Reset NeuroDirect on this device? This clears local data and cannot be undone unless you exported a backup.');
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_PARENT_KEY);
    state = defaultState();
    activeTab = 'today';
    saveState();
    toast('App reset');
    render();
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-tab]');
    if (nav) return setTab(nav.dataset.tab);

    const go = event.target.closest('[data-go]');
    if (go) return setTab(go.dataset.go);

    const themeMode = event.target.closest('[data-theme-mode]');
    if (themeMode) {
      state.profile.theme = themeMode.dataset.themeMode === 'light' ? 'light' : 'dark';
      saveState();
      applyTheme();
      return;
    }

    const themeToggle = event.target.closest('#themeToggle');
    if (themeToggle) {
      state.profile.theme = state.profile.theme === 'light' ? 'dark' : 'light';
      saveState();
      applyTheme();
      return;
    }

    const install = event.target.closest('#installApp');
    if (install && deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; render(); });
      return;
    }

    const support = event.target.closest('[data-support]');
    if (support) return sendSupport(support.dataset.support);

    const toggle = event.target.closest('[data-toggle-task]');
    if (toggle) return toggleTask(toggle.dataset.toggleTask);

    const deleteTask = event.target.closest('[data-delete-task]');
    if (deleteTask) {
      state.tasks = state.tasks.filter(task => task.id !== deleteTask.dataset.deleteTask);
      saveState();
      render();
      return;
    }

    const clearDone = event.target.closest('[data-clear-done]');
    if (clearDone) {
      state.tasks = state.tasks.filter(task => !task.done);
      saveState();
      render();
      return;
    }

    const incGoal = event.target.closest('[data-inc-goal]');
    if (incGoal) return adjustGoal(incGoal.dataset.incGoal, 1);

    const decGoal = event.target.closest('[data-dec-goal]');
    if (decGoal) return adjustGoal(decGoal.dataset.decGoal, -1);

    const deleteGoal = event.target.closest('[data-delete-goal]');
    if (deleteGoal) {
      state.goals = state.goals.filter(goal => goal.id !== deleteGoal.dataset.deleteGoal);
      saveState();
      render();
      return;
    }

    const claimRewardButton = event.target.closest('[data-claim-reward]');
    if (claimRewardButton) return claimReward(claimRewardButton.dataset.claimReward);

    const deleteReward = event.target.closest('[data-delete-reward]');
    if (deleteReward) {
      state.rewards = state.rewards.filter(reward => reward.id !== deleteReward.dataset.deleteReward);
      saveState();
      render();
      return;
    }

    const deleteEntry = event.target.closest('[data-delete-entry]');
    if (deleteEntry) {
      state.journal = state.journal.filter(entry => entry.id !== deleteEntry.dataset.deleteEntry);
      saveState();
      render();
      return;
    }

    const deleteRequest = event.target.closest('[data-delete-request]');
    if (deleteRequest) {
      state.supportRequests = state.supportRequests.filter(request => request.id !== deleteRequest.dataset.deleteRequest);
      saveState();
      render();
      return;
    }

    const timerButton = event.target.closest('[data-start-timer]');
    if (timerButton) return startTimer(Number(timerButton.dataset.startTimer));

    const timerModeButton = event.target.closest('[data-timer-mode]');
    if (timerModeButton) {
      timerMode = timerModeButton.dataset.timerMode;
      updateTimerDisplay();
      toast(`${timerMode} mode selected`);
      return;
    }

    const stopTimerButton = event.target.closest('[data-stop-timer]');
    if (stopTimerButton) return stopTimer(true);

    const lockParent = event.target.closest('[data-lock-parent]');
    if (lockParent) {
      sessionStorage.removeItem(SESSION_PARENT_KEY);
      render();
      return;
    }

    const exportButton = event.target.closest('#exportData');
    if (exportButton) return exportData();

    const importButton = event.target.closest('#importDataButton');
    if (importButton) return $('#importDataInput')?.click();

    const resetButton = event.target.closest('[data-reset-app]');
    if (resetButton) return resetApp();
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.id === 'checkinForm') return saveCheckin(form);
    if (form.id === 'taskForm') return addTask(form);
    if (form.id === 'goalForm') return addGoal(form);
    if (form.id === 'rewardForm') return addReward(form);
    if (form.id === 'journalForm') return addJournal(form);
    if (form.id === 'settingsForm') return saveSettings(form);
    if (form.id === 'pinForm') {
      const pin = String(new FormData(form).get('pin') || '').trim();
      if (pin === state.profile.parentPin) {
        sessionStorage.setItem(SESSION_PARENT_KEY, 'true');
        toast('Parent area unlocked');
        render();
      } else {
        toast('Incorrect PIN');
      }
    }
  });

  document.addEventListener('change', event => {
    const input = event.target;
    if (input?.id === 'importDataInput') importData(input.files?.[0]);
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    render();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service worker registration failed', error));
    });
  }

  saveState();
  render();
})();
