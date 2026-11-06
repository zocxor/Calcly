/*
 * Calc Suit — application shell: navigation, calculator, tools, history,
 * settings, local storage and the bridge to the Android wrapper.
 * All text from storage, history or the remote config is written with
 * textContent; nothing user- or server-supplied is ever parsed as HTML.
 */
(function () {
  'use strict';
  var E = window.CalcEngine, T = window.CalcTools;
  var APP_NAME = 'Calc Suit';
  var PUBLISHER = 'Zocxorian Technologies';

  /* ================================================================== */
  /* Small helpers                                                       */
  /* ================================================================== */
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') for (var s in v) el.style.setProperty(s, v[s]);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  var SVGNS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    tools: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.4-5.9"/><path d="M3.5 4.5v4h4"/><path d="M12 8v4.2l2.8 1.8"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    star: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
    copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6.5a2.5 2.5 0 0 0-2.5-2.5H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l.9 11.2A2 2 0 0 0 8.9 20h6.2a2 2 0 0 0 2-1.8L18 7M9 7V4.5h6V7"/>',
    backspace: '<path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    swap: '<path d="M8 4v16M4.5 7.5L8 4l3.5 3.5M16 20V4M12.5 16.5L16 20l3.5-3.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    everyday: '<path d="M6 18L18 6"/><circle cx="7.5" cy="7.5" r="2.3"/><circle cx="16.5" cy="16.5" r="2.3"/>',
    finance: '<ellipse cx="12" cy="6.5" rx="7" ry="2.7"/><path d="M5 6.5v5c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7v-5M5 11.5v5c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7v-5"/>',
    date: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    convert: '<path d="M4 9h14l-3.5-3.5M20 15H6l3.5 3.5"/>',
    message: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    external: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    shield: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  // Icon markup is a fixed constant above, never data, so parsing it is safe.
  function icon(name, extra) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'i' + (extra ? ' ' + extra : ''));
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  }

  /* ================================================================== */
  /* Storage: everything stays on this device                           */
  /* ================================================================== */
  var mem = {};
  var frozen = false; // set while "Reset app" wipes storage, so nothing is written back during the reload
  var Store = {
    get: function (k, def) {
      try { var v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch (e) { if (k in mem) return mem[k]; }
      return k in mem ? mem[k] : def;
    },
    set: function (k, v) { if (frozen) return; mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked: keep in memory */ } },
    remove: function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { } },
    raw: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    keys: function () { var out = []; try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) { } return out; }
  };
  var K = { prefs: 'cs.prefs.v1', history: 'cs.history.v1', pinned: 'cs.pinned.v1', inputs: 'cs.inputs.v1', draft: 'cs.draft.v1', notice: 'cs.notice.v1', ui: 'cs.ui.v1', legacyTheme: 'calc-theme-v2' };

  var DEFAULT_PREFS = { theme: 'system', keypad: 'large', grouping: true, haptics: true, angle: 'deg', mode: 'standard', memory: 0 };
  function loadPrefs() {
    var p = Store.get(K.prefs, null);
    if (!p || typeof p !== 'object') {
      p = {};
      // Version 1.1.2 kept only the theme, under its own key. Carry it over.
      var legacy = Store.raw(K.legacyTheme);
      if (legacy === 'dark' || legacy === 'light') p.theme = legacy;
    }
    var out = {};
    for (var k in DEFAULT_PREFS) out[k] = (k in p && typeof p[k] === typeof DEFAULT_PREFS[k]) ? p[k] : DEFAULT_PREFS[k];
    if (['system', 'light', 'dark'].indexOf(out.theme) < 0) out.theme = 'system';
    if (['comfortable', 'large', 'xl'].indexOf(out.keypad) < 0) out.keypad = 'large';
    if (['standard', 'scientific'].indexOf(out.mode) < 0) out.mode = 'standard';
    if (out.angle !== 'rad') out.angle = 'deg';
    if (!isFinite(out.memory)) out.memory = 0;
    return out;
  }
  var prefs = loadPrefs();
  function savePrefs() { Store.set(K.prefs, prefs); }
  savePrefs();

  var HISTORY_MAX = 200;
  var history = (function () {
    var hs = Store.get(K.history, []);
    if (!Array.isArray(hs)) return [];
    return hs.filter(function (x) { return x && typeof x.expr === 'string' && typeof x.value === 'number' && isFinite(x.value); }).slice(0, HISTORY_MAX);
  })();
  function saveHistory() { Store.set(K.history, history); }

  var pinned = (function () { var p = Store.get(K.pinned, []); return Array.isArray(p) ? p.filter(function (id) { return T.byId[id]; }) : []; })();
  function savePinned() { Store.set(K.pinned, pinned); }
  var inputs = Store.get(K.inputs, {}) || {};
  var ui = Store.get(K.ui, {}) || {};
  function saveUi() { Store.set(K.ui, ui); }

  /* ================================================================== */
  /* Native bridge (Android). Every call is optional and fails quietly. */
  /* ================================================================== */
  var NB = window.CalcSuitNative || null;
  var Native = {
    has: !!NB,
    call: function (name) {
      if (!NB || typeof NB[name] !== 'function') return undefined;
      try { return NB[name].apply(NB, Array.prototype.slice.call(arguments, 1)); } catch (e) { return undefined; }
    }
  };
  var appInfo = (function () {
    var raw = Native.call('getAppInfo');
    try { var o = JSON.parse(raw); if (o && typeof o.versionName === 'string') return o; } catch (e) { }
    return { versionName: '1.2.0', versionCode: 13, web: true };
  })();

  function haptic(kind) { if (prefs.haptics) Native.call('haptic', kind || 'tap'); }
  function logScreen(id) { Native.call('logScreen', String(id).replace(/[^a-z0-9_]/g, '_').slice(0, 40)); }

  function copyText(text) {
    var r = Native.call('copyText', text);
    if (r === 'system') return; // Android 13+ shows its own confirmation
    if (r === 'ok') { toast('Copied'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, function () { toast('Couldn’t copy'); });
    } else toast('Couldn’t copy');
  }

  /* ================================================================== */
  /* Theme                                                               */
  /* ================================================================== */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function systemDark() {
    var n = Native.call('isSystemDark');
    if (typeof n === 'boolean') return n;
    return !!(mq && mq.matches);
  }
  function applyTheme() {
    var dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark());
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#07122B' : '#EEF2F8');
    Native.call('setTheme', dark);
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (prefs.theme === 'system') applyTheme(); });
  applyTheme();

  /* ================================================================== */
  /* Toast                                                               */
  /* ================================================================== */
  var toastTimer = null;
  function toast(msg, action) {
    var el = $('toast');
    clear(el);
    el.appendChild(h('span', { text: msg }));
    if (action) el.appendChild(h('button', { type: 'button', text: action.label, onclick: function () { hideToast(); action.run(); } }));
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 2200);
  }
  function hideToast() { $('toast').hidden = true; }

  /* ================================================================== */
  /* Remote configuration (maintenance notice, feature flags, updates)  */
  /* Delivered by the Android wrapper from the admin backend; validated */
  /* again here and only ever shown as plain text.                       */
  /* ================================================================== */
  var remote = { disabled: {}, notice: null, latest: 0, min: 0, updateText: '' };
  function applyRemoteConfig(raw) {
    var c;
    try { c = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
    if (!c || typeof c !== 'object') return;
    var next = { disabled: {}, notice: null, latest: 0, min: 0, updateText: '' };
    if (Array.isArray(c.disabledTools)) c.disabledTools.slice(0, 100).forEach(function (id) { if (typeof id === 'string' && T.byId[id]) next.disabled[id] = true; });
    if (c.notice && typeof c.notice.text === 'string' && c.notice.text.trim()) {
      next.notice = {
        id: String(c.notice.id || '').slice(0, 64),
        text: c.notice.text.trim().slice(0, 280),
        level: c.notice.level === 'warning' ? 'warning' : 'info'
      };
    }
    if (isFinite(c.latestVersionCode)) next.latest = Math.floor(c.latestVersionCode);
    if (isFinite(c.minVersionCode)) next.min = Math.floor(c.minVersionCode);
    if (typeof c.updateText === 'string') next.updateText = c.updateText.trim().slice(0, 200);
    remote = next;
    renderNotice();
    buildSidebar();
    if (screens.tools) renderTools();
    if (current.name === 'tool' && screens.tool) renderTool(current.arg);
  }
  function updateNeeded() { return !appInfo.web && remote.min > 0 && appInfo.versionCode < remote.min; }
  function updateAvailable() { return !appInfo.web && remote.latest > 0 && appInfo.versionCode < remote.latest; }
  function renderNotice() {
    var el = $('notice');
    clear(el);
    var dismissed = Store.get(K.notice, '');
    var text = null, level = 'info', id = null;
    if (updateNeeded()) { text = remote.updateText || 'This version is no longer supported. Update to keep using every calculator.'; level = 'warning'; id = 'min-' + remote.min; }
    else if (remote.notice && remote.notice.id !== dismissed) { text = remote.notice.text; level = remote.notice.level; id = remote.notice.id; }
    if (!text) { el.hidden = true; return; }
    el.className = 'notice ' + level;
    el.appendChild(icon('info'));
    var p = h('p', null, text);
    if (updateNeeded() || (updateAvailable() && level === 'warning')) {
      p.appendChild(document.createTextNode(' '));
      p.appendChild(h('button', { type: 'button', class: 'text-btn', style: { padding: '0', 'min-height': '0' }, text: 'Update', onclick: function () { Native.call('openExternal', 'play'); } }));
    }
    el.appendChild(p);
    if (!updateNeeded()) el.appendChild(h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Dismiss notice', onclick: function () { Store.set(K.notice, id); renderNotice(); } }, icon('close')));
    el.hidden = false;
  }

  /* ================================================================== */
  /* Navigation                                                          */
  /*   depth 0 is the root entry; tabs sit at depth 1, tool pages at 2. */
  /*   The Android back button walks this stack, then leaves the app.   */
  /* ================================================================== */
  var TABS = [
    { id: 'calc', path: '#/calc', label: 'Calculator', icon: 'calc' },
    { id: 'tools', path: '#/tools', label: 'Tools', icon: 'tools' },
    { id: 'history', path: '#/history', label: 'History', icon: 'history' },
    { id: 'settings', path: '#/settings', label: 'Settings', icon: 'settings' }
  ];
  var current = { name: null, arg: null };
  var pendingAfterPop = null;
  function depth() { return (window.history.state && window.history.state.d) || 0; }
  function push(path) { window.history.pushState({ d: depth() + 1 }, '', path); route(); }
  function replace(path, d) { window.history.replaceState({ d: d == null ? depth() : d }, '', path); route(); }
  function goTab(path) {
    var d = depth();
    if (location.hash === path) { route(); return; }
    if (path === '#/calc') {
      // Walk back to the root entry and make sure it is the calculator, whatever it was before
      if (d > 0) { pendingAfterPop = { path: path, d: 0 }; window.history.go(-d); } else replace(path, 0);
      return;
    }
    if (d === 0) push(path);
    else if (d === 1) replace(path, 1);
    else { pendingAfterPop = { path: path, d: 1 }; window.history.go(-(d - 1)); }
  }
  function goBack(fallback) { if (depth() > 0) window.history.back(); else replace(fallback || '#/calc', 0); }
  window.addEventListener('popstate', function () {
    if (pendingAfterPop) { var p = pendingAfterPop; pendingAfterPop = null; replace(p.path, p.d); return; }
    route();
  });

  function parseRoute(hash) {
    var m = /^#\/([a-z]+)(?:\/([a-z0-9-]+))?$/.exec(hash || '');
    if (!m) return { name: 'calc' };
    if (m[1] === 'tool' && m[2] && T.byId[m[2]]) return { name: 'tool', arg: m[2] };
    if (m[1] === 'settings' && m[2] === 'feedback') return { name: 'feedback' };
    if (['calc', 'tools', 'history', 'settings'].indexOf(m[1]) >= 0) return { name: m[1] };
    return { name: 'calc' };
  }

  var screens = {};
  function screenEl(name) {
    if (!screens[name]) {
      screens[name] = h('section', { class: 'screen ' + name, 'data-screen': name });
      $('screens').appendChild(screens[name]);
    }
    return screens[name];
  }

  var toolOpens = 0, lastAd = Date.now();
  function route() {
    var r = parseRoute(location.hash);
    var prevName = current.name, prevArg = current.arg;
    current = r;
    try {
      if (r.name === 'calc') { screenEl('calc'); if (!calcBuilt) buildCalc(); else { renderCalc(); renderSideHistory(); } }
      else if (r.name === 'tools') renderTools();
      else if (r.name === 'tool') { if (prevName !== 'tool' || prevArg !== r.arg) renderTool(r.arg); }
      else if (r.name === 'history') renderHistory();
      else if (r.name === 'settings') renderSettings();
      else if (r.name === 'feedback') renderFeedback();
    } catch (e) {
      renderCrash(r.name === 'tool' ? 'tool' : r.name, e);
    }
    var showName = r.name === 'feedback' ? 'feedback' : r.name;
    for (var n in screens) screens[n].classList.toggle('active', n === showName);
    var tabId = r.name === 'tool' ? 'tools' : r.name === 'feedback' ? 'settings' : r.name;
    Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
      if (b.getAttribute('data-tab') === tabId) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-tool-link]'), function (b) {
      if (r.name === 'tool' && b.getAttribute('data-tool-link') === r.arg) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (r.name === 'calc') requestAnimationFrame(layoutKeypad);
    if (prevName !== r.name || prevArg !== r.arg) {
      logScreen(r.name === 'tool' ? 'tool_' + r.arg : r.name === 'calc' ? 'calc_' + prefs.mode : r.name);
      if (r.name === 'tool') maybeInterstitial();
      var scr = screens[showName];
      if (scr && r.name !== 'calc' && !(prevName === 'tool' && r.name === 'tool' && prevArg === r.arg)) scr.scrollTop = 0;
    }
  }
  // Full-screen ads stay switched off in the Android wrapper (SHOW_INTERSTITIAL = false).
  // When enabled there, they appear at most every 4th tool opened and 90 s apart.
  function maybeInterstitial() {
    toolOpens++;
    if (toolOpens >= 4 && Date.now() - lastAd > 90000) { toolOpens = 0; lastAd = Date.now(); Native.call('showInterstitial'); }
  }
  function renderCrash(name, err) {
    var el = clear(screenEl(name));
    el.appendChild(h('div', { class: 'empty' }, icon('info'), h('strong', { text: 'This screen couldn’t open' }),
      h('p', { text: 'Your data is safe. Go back and try again.' }),
      h('button', { type: 'button', class: 'btn secondary', text: 'Back to calculator', onclick: function () { goTab('#/calc'); } })));
    if (window.console) console.error(err);
  }

  function buildTabbar() {
    var bar = clear($('tabbar'));
    TABS.forEach(function (t) {
      bar.appendChild(h('button', { type: 'button', 'data-tab': t.id, onclick: function () { haptic('tap'); goTab(t.path); } },
        h('span', { class: 'pill' }, icon(t.icon)), h('span', { text: t.label })));
    });
  }

  /* ---------- sidebar / ☰ menu ---------- */
  var wideQuery = window.matchMedia ? window.matchMedia('(min-width: 960px)') : { matches: false };
  var drawerOpen = false, drawerReturn = null;
  function syncSidebarMode() {
    var sb = $('sidebar');
    if (wideQuery.matches) { drawerOpen = false; $('shell').classList.remove('drawer-open'); $('scrim').hidden = true; sb.removeAttribute('inert'); sb.removeAttribute('aria-hidden'); }
    else if (!drawerOpen) { sb.setAttribute('inert', ''); sb.setAttribute('aria-hidden', 'true'); }
  }
  if (wideQuery.addEventListener) wideQuery.addEventListener('change', syncSidebarMode);
  function openDrawer() {
    if (wideQuery.matches) return;
    drawerOpen = true;
    drawerReturn = document.activeElement;
    var sb = $('sidebar');
    sb.removeAttribute('inert'); sb.removeAttribute('aria-hidden');
    $('scrim').hidden = false;
    $('shell').classList.add('drawer-open');
    haptic('tap');
    var first = sb.querySelector('.tool-link, .side-link');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 30);
  }
  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    $('shell').classList.remove('drawer-open');
    $('scrim').hidden = true;
    syncSidebarMode();
    if (drawerReturn && drawerReturn.focus) try { drawerReturn.focus({ preventScroll: true }); } catch (e) { }
  }
  function menuButton() {
    return h('button', { type: 'button', class: 'icon-btn menu-btn', 'aria-label': 'Open menu', onclick: openDrawer }, icon('menu'));
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawerOpen) { e.stopPropagation(); closeDrawer(); } }, true);

  function buildSidebar() {
    var sb = clear($('sidebar'));
    var shell = $('shell');
    shell.classList.toggle('collapsed', !!ui.sideCollapsed);
    $('scrim').onclick = closeDrawer;
    sb.appendChild(h('div', { class: 'side-head' },
      h('span', { class: 'brand-name', text: APP_NAME }),
      h('button', { type: 'button', class: 'icon-btn side-close', 'aria-label': 'Close menu', onclick: closeDrawer }, icon('close')),
      h('button', { type: 'button', class: 'icon-btn side-collapse', 'aria-label': ui.sideCollapsed ? 'Expand navigation' : 'Collapse navigation', 'aria-expanded': String(!ui.sideCollapsed),
        onclick: function () { ui.sideCollapsed = !ui.sideCollapsed; saveUi(); buildSidebar(); route(); } }, icon('panel'))));
    TABS.forEach(function (t) {
      sb.appendChild(h('button', { type: 'button', class: 'side-link', 'data-tab': t.id, title: t.label, onclick: function () { closeDrawer(); goTab(t.path); } },
        icon(t.icon), h('span', { class: 'label', text: t.label })));
    });
    var pins = pinned.filter(function (id) { return !remote.disabled[id]; });
    if (pins.length) {
      sb.appendChild(h('div', { class: 'group-title', text: 'Pinned' }));
      pins.forEach(function (id) { sb.appendChild(toolLink(T.byId[id])); });
    }
    // Daily-use calculators come first, then finance, dates and converters
    T.categories.forEach(function (c) {
      sb.appendChild(h('div', { class: 'group-title', text: c.name }));
      T.list.forEach(function (tool) { if (tool.cat === c.id && !remote.disabled[tool.id]) sb.appendChild(toolLink(tool)); });
    });
    sb.appendChild(h('div', { class: 'group-title', text: 'Services' }));
    sb.appendChild(serviceLink('message', 'Send feedback', function () { openUnder('#/settings', '#/settings/feedback'); }));
    if (Native.has) {
      sb.appendChild(serviceLink('star', 'Rate on Google Play', function () { Native.call('openExternal', 'play'); }));
      sb.appendChild(serviceLink('shield', 'Privacy policy', function () { Native.call('openExternal', 'privacy'); }));
    }
    sb.appendChild(serviceLink('settings', 'Settings', function () { goTab('#/settings'); }));
    syncSidebarMode();
    function toolLink(tool) {
      return h('button', { type: 'button', class: 'tool-link', 'data-tool-link': tool.id, onclick: function () { closeDrawer(); openTool(tool.id); } },
        h('span', { class: 'dot ' + tool.cat }), tool.name);
    }
    function serviceLink(ic, label, run) {
      return h('button', { type: 'button', class: 'tool-link service-link', onclick: function () { closeDrawer(); run(); } }, icon(ic), label);
    }
  }

  function openTool(id) { openUnder('#/tools', '#/tool/' + id); }
  /** Opens a second-level page with its tab underneath, so Back returns to that tab. */
  function openUnder(tabPath, path) {
    if (location.hash === path) return;
    var d = depth();
    if (d >= 2) { replace(path); return; }
    if (location.hash === tabPath && d === 1) { push(path); return; }
    if (d === 0) window.history.pushState({ d: 1 }, '', tabPath);
    else window.history.replaceState({ d: 1 }, '', tabPath);
    push(path);
  }

  /* ================================================================== */
  /* Calculator                                                          */
  /* ================================================================== */
  var calc = (function () {
    var d = Store.get(K.draft, null);
    var s = { expr: '', committed: false, result: null, error: null, second: false, lastExpr: '' };
    if (d && typeof d.expr === 'string' && d.expr.length <= E.LIMITS.maxLength) {
      s.expr = d.expr; s.committed = !!d.committed && typeof d.result === 'number';
      s.result = typeof d.result === 'number' ? d.result : null; s.lastExpr = typeof d.lastExpr === 'string' ? d.lastExpr : '';
    }
    return s;
  })();
  var draftTimer = null;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () { Store.set(K.draft, { expr: calc.expr, committed: calc.committed, result: calc.result, lastExpr: calc.lastExpr }); }, 250);
  }

  var KEYS = {
    'AC': { label: 'AC', aria: 'All clear', cls: 'clear' },
    'back': { icon: 'backspace', aria: 'Backspace', cls: 'clear' },
    '%': { label: '%', aria: 'Percent', cls: 'op' },
    '÷': { label: '÷', aria: 'Divide', cls: 'op' }, '×': { label: '×', aria: 'Multiply', cls: 'op' },
    '−': { label: '−', aria: 'Minus', cls: 'op' }, '+': { label: '+', aria: 'Plus', cls: 'op' },
    '=': { label: '=', aria: 'Equals', cls: 'eq' }, '±': { label: '±', aria: 'Change sign' }, '.': { label: '.', aria: 'Decimal point' },
    '2nd': { label: ['2', { sup: 'nd' }], aria: 'Second functions', cls: 'fn', toggle: true },
    'sin': { label: 'sin', second: 'asin', aria: 'Sine', cls: 'fn' }, 'asin': { label: ['sin', { sup: '−1' }], aria: 'Inverse sine', cls: 'fn' },
    'cos': { label: 'cos', second: 'acos', aria: 'Cosine', cls: 'fn' }, 'acos': { label: ['cos', { sup: '−1' }], aria: 'Inverse cosine', cls: 'fn' },
    'tan': { label: 'tan', second: 'atan', aria: 'Tangent', cls: 'fn' }, 'atan': { label: ['tan', { sup: '−1' }], aria: 'Inverse tangent', cls: 'fn' },
    'π': { label: 'π', aria: 'Pi', cls: 'fn' },
    'pow': { label: ['x', { sup: 'y' }], aria: 'Power', cls: 'fn' },
    'log': { label: 'log', second: 'tenx', aria: 'Logarithm base 10', cls: 'fn' }, 'tenx': { label: ['10', { sup: 'x' }], aria: 'Ten to the power of', cls: 'fn' },
    'ln': { label: 'ln', second: 'ex', aria: 'Natural logarithm', cls: 'fn' }, 'ex': { label: ['e', { sup: 'x' }], aria: 'e to the power of', cls: 'fn' },
    '(': { label: '(', aria: 'Open bracket', cls: 'fn' }, ')': { label: ')', aria: 'Close bracket', cls: 'fn' },
    'sqrt': { label: '√', second: 'cbrt', aria: 'Square root', cls: 'fn' }, 'cbrt': { label: '∛', aria: 'Cube root', cls: 'fn' },
    'sq': { label: ['x', { sup: '2' }], second: 'cube', aria: 'Square', cls: 'fn' }, 'cube': { label: ['x', { sup: '3' }], aria: 'Cube', cls: 'fn' },
    'fact': { label: 'x!', second: 'abs', aria: 'Factorial', cls: 'fn' }, 'abs': { label: '|x|', aria: 'Absolute value', cls: 'fn' },
    'inv': { label: '1/x', second: 'ans', aria: 'Reciprocal', cls: 'fn' }, 'ans': { label: 'Ans', aria: 'Previous answer', cls: 'fn' },
    'e': { label: 'e', second: 'EE', aria: 'Euler’s number', cls: 'fn' }, 'EE': { label: 'EE', aria: 'Times ten to the power of', cls: 'fn' }
  };
  for (var d = 0; d <= 9; d++) KEYS[String(d)] = { label: String(d), aria: String(d) };
  var STD_LAYOUT = ['AC', 'back', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
  var SCI_LAYOUT = ['2nd', 'sin', 'cos', 'tan', 'π', 'pow', 'log', 'ln', '(', ')', 'sqrt', 'AC', 'back', '%', '÷',
    'sq', '7', '8', '9', '×', 'fact', '4', '5', '6', '−', 'inv', '1', '2', '3', '+', 'e', '±', '0', '.', '='];

  var calcBuilt = false;
  var C = {}; // calculator DOM references

  function labelNodes(spec) {
    if (typeof spec === 'string') return [document.createTextNode(spec)];
    return spec.map(function (p) { return typeof p === 'string' ? document.createTextNode(p) : h('sup', { text: p.sup }); });
  }

  function buildCalc() {
    var el = clear(screenEl('calc'));
    C.wrap = h('div', { class: 'calc-wrap' });
    C.modeStd = h('button', { type: 'button', text: 'Standard', onclick: function () { setMode('standard'); } });
    C.modeSci = h('button', { type: 'button', text: 'Scientific', onclick: function () { setMode('scientific'); } });
    C.copyBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Copy result', onclick: copyCurrent }, icon('copy'));
    C.histBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'History', onclick: function () { goTab('#/history'); } }, icon('history'));
    C.wrap.appendChild(h('div', { class: 'calc-bar' }, menuButton(), h('div', { class: 'seg', role: 'group', 'aria-label': 'Calculator mode' }, C.modeStd, C.modeSci), h('span', { class: 'spacer' }), C.copyBtn, C.histBtn));

    C.angle = h('button', { type: 'button', class: 'badge', onclick: toggleAngle });
    C.memBadge = h('span', { class: 'badge static', title: 'A value is stored in memory' }, 'M');
    C.status = h('div', { class: 'status' }, C.angle, C.memBadge);
    C.prev = h('button', { type: 'button', class: 'prev', onclick: function () { var x = history[0]; if (x) reuse(x); } });
    C.expr = h('div', { class: 'line expr' });
    C.result = h('div', { class: 'line result', 'aria-live': 'polite' });
    C.display = h('div', { class: 'display' }, C.status, C.prev, C.expr, C.result);
    C.display.addEventListener('contextmenu', function (e) { e.preventDefault(); copyCurrent(); });
    C.wrap.appendChild(C.display);

    C.mem = h('div', { class: 'mem-row', role: 'group', 'aria-label': 'Memory' },
      ['MC', 'MR', 'M+', 'M−'].map(function (m) {
        return h('button', { type: 'button', text: m, 'aria-label': { 'MC': 'Memory clear', 'MR': 'Memory recall', 'M+': 'Memory add', 'M−': 'Memory subtract' }[m], onclick: function () { haptic('tap'); memory(m); } });
      }));
    C.wrap.appendChild(C.mem);
    C.keypad = h('div', { class: 'keypad', role: 'group', 'aria-label': 'Keypad' });
    C.keypad.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]');
      if (!b) return;
      press(b.getAttribute('data-k'));
    });
    C.wrap.appendChild(C.keypad);
    el.appendChild(C.wrap);

    C.side = h('aside', { class: 'side-history', 'aria-label': 'Recent calculations' });
    el.appendChild(C.side);
    calcBuilt = true;
    buildKeypad();
    renderCalc();
    renderSideHistory();
  }

  function buildKeypad() {
    var sci = prefs.mode === 'scientific';
    screenEl('calc').classList.toggle('sci', sci);
    clear(C.keypad);
    (sci ? SCI_LAYOUT : STD_LAYOUT).forEach(function (id) {
      var k = KEYS[id];
      var useId = calc.second && k.second ? k.second : id;
      var kk = KEYS[useId];
      var b = h('button', { type: 'button', class: 'key' + (kk.cls ? ' ' + kk.cls : ''), 'data-k': useId, 'aria-label': kk.aria });
      if (kk.icon) b.appendChild(icon(kk.icon)); else add(b, labelNodes(kk.label));
      if (kk.toggle) b.setAttribute('aria-pressed', String(calc.second));
      C.keypad.appendChild(b);
    });
    C.modeStd.setAttribute('aria-pressed', String(!sci));
    C.modeSci.setAttribute('aria-pressed', String(sci));
    C.mem.hidden = !sci;
    C.status.hidden = !sci;
    layoutKeypad();
  }

  var KEYPAD_SIZES = { comfortable: { h: 56, gap: 8 }, large: { h: 64, gap: 10 }, xl: { h: 74, gap: 12 } };
  function layoutKeypad() {
    if (!calcBuilt || current.name !== 'calc') return;
    var sci = prefs.mode === 'scientific';
    var size = KEYPAD_SIZES[prefs.keypad] || KEYPAD_SIZES.large;
    var rows = sci ? 7 : 5;
    var gap = sci ? Math.round(size.gap * .8) : size.gap;
    var pref = sci ? Math.round(size.h * .8) : size.h;
    var root = document.documentElement;
    root.style.setProperty('--kgap', gap + 'px');
    var screenH = C.wrap.clientHeight || window.innerHeight;
    var wide = window.innerWidth >= 960;
    var minDisplay = wide ? 200 : (sci ? 104 : 120);
    var other = C.wrap.firstChild.offsetHeight + (C.mem.hidden ? 0 : C.mem.offsetHeight) + 12 + minDisplay + (wide ? 48 : 0);
    var fit = Math.floor((screenH - other - gap * (rows - 1)) / rows);
    var kh = Math.max(40, Math.min(pref, fit));
    root.style.setProperty('--kh', kh + 'px');
    var width = C.keypad.clientWidth || 360;
    var cols = sci ? 5 : 4;
    var kw = (width - 24 - gap * (cols - 1)) / cols;
    var font = Math.max(17, Math.min(sci ? 24 : 32, Math.round(Math.min(kh * (sci ? .44 : .44), kw * .42))));
    root.style.setProperty('--kfont', font + 'px');
    fitDisplay();
  }

  function setMode(m) {
    if (prefs.mode === m) return;
    haptic('tap');
    prefs.mode = m; savePrefs();
    calc.second = false;
    buildKeypad();
    renderCalc();
    logScreen('calc_' + m);
  }
  function toggleAngle() {
    haptic('tap');
    prefs.angle = prefs.angle === 'deg' ? 'rad' : 'deg'; savePrefs();
    renderCalc();
  }

  /* ---------- expression editing ---------- */
  var OPS = '+−×÷^';
  var MULTI = ['asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'abs(', '√(', '∛(', 'Ans', '^(−1)', '^('];
  function lastChar() { return calc.expr.slice(-1); }
  function endsWithOperand() {
    var c = lastChar();
    return /[0-9.)!%πe]/.test(c) || /Ans$/.test(calc.expr);
  }
  function trailingNumber() { var m = /(\d+\.?\d*(?:E[−-]?\d*)?|\.\d*)$/.exec(calc.expr); return m ? m[0] : ''; }
  function unmatched() { var n = 0; for (var i = 0; i < calc.expr.length; i++) { if (calc.expr[i] === '(') n++; else if (calc.expr[i] === ')') n = Math.max(0, n - 1); } return n; }
  function startFresh() { if (calc.committed) { calc.expr = ''; calc.committed = false; calc.error = null; } }
  function continueFromResult() {
    if (calc.committed) {
      var s = calc.result != null ? E.toPlain(calc.result).replace(/-/g, '−') : '';
      calc.expr = calc.result < 0 ? '(' + s + ')' : s; // (−5)² is 25, not −25
      calc.committed = false; calc.error = null;
    }
  }
  function append(s) {
    if ((calc.expr + s).length > E.LIMITS.maxLength) { haptic('error'); toast('That’s the longest expression the calculator takes'); return false; }
    calc.expr += s; calc.error = null; return true;
  }

  function press(k) {
    var hk = 'tap';
    var was2nd = calc.second;
    if (/^[0-9]$/.test(k)) {
      startFresh();
      var num = trailingNumber();
      if (num === '0') calc.expr = calc.expr.slice(0, -1);
      else if (/[)!%πe]$/.test(calc.expr) || /Ans$/.test(calc.expr)) append('×');
      append(k);
    } else if (k === '.') {
      startFresh();
      var tn = trailingNumber();
      if (tn.indexOf('.') >= 0 || tn.indexOf('E') >= 0) { hk = 'error'; }
      else if (!tn) { if (endsWithOperand()) append('×'); append('0.'); }
      else append('.');
    } else if (OPS.indexOf(k) >= 0) {
      continueFromResult();
      var lc = lastChar();
      if (!calc.expr) { if (k === '−') append('−'); else if (calc.result != null && k !== '^') { calc.expr = '0'; append(k); } else hk = 'error'; }
      else if (lc === '(') { if (k === '−') append('−'); else hk = 'error'; }
      else if (OPS.indexOf(lc) >= 0) {
        if (k === '−' && '×÷^'.indexOf(lc) >= 0) append('−');
        else {
          // Replace the operator (and a dangling minus after × ÷ ^)
          calc.expr = calc.expr.replace(/[+−×÷^]+$/, '');
          if (calc.expr) append(k);
        }
      } else if (lc === 'E') { if (k === '−') append('−'); else hk = 'error'; }
      else append(k);
    } else if (k === '%' || k === '!' || k === 'fact') {
      continueFromResult();
      if (endsWithOperand()) append(k === 'fact' ? '!' : k); else hk = 'error';
    } else if (k === 'sq' || k === 'cube' || k === 'inv') {
      continueFromResult();
      if (endsWithOperand()) append(k === 'sq' ? '^2' : k === 'cube' ? '^3' : '^(−1)');
      else if (k === 'inv' && !calc.expr) append('1÷');
      else hk = 'error';
    } else if (k === 'pow') {
      continueFromResult();
      if (endsWithOperand()) append('^'); else hk = 'error';
    } else if (k === '(') {
      startFresh();
      if (endsWithOperand()) append('×');
      append('(');
    } else if (k === ')') {
      if (calc.committed || !unmatched() || !endsWithOperand()) hk = 'error'; else append(')');
    } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'abs', 'sqrt', 'cbrt'].indexOf(k) >= 0) {
      startFresh();
      if (endsWithOperand()) append('×');
      append(k === 'sqrt' ? '√(' : k === 'cbrt' ? '∛(' : k + '(');
    } else if (k === 'tenx' || k === 'ex') {
      startFresh();
      if (endsWithOperand()) append('×');
      append(k === 'tenx' ? '10^(' : 'e^(');
    } else if (k === 'π' || k === 'e' || k === 'ans') {
      startFresh();
      if (endsWithOperand()) append('×');
      if (k === 'ans') {
        if (calc.result == null && !history.length) hk = 'error';
        else append('Ans');
      } else append(k);
    } else if (k === 'EE') {
      startFresh();
      var t2 = trailingNumber();
      if (t2 && t2.indexOf('E') < 0 && !/\.$/.test(t2)) append('E'); else hk = 'error';
    } else if (k === '±') {
      toggleSign();
    } else if (k === 'AC') {
      calc.expr = ''; calc.committed = false; calc.error = null;
    } else if (k === 'back') {
      if (calc.committed) { continueFromResult(); }
      var removed = false;
      for (var i = 0; i < MULTI.length; i++) {
        if (calc.expr.slice(-MULTI[i].length) === MULTI[i]) { calc.expr = calc.expr.slice(0, -MULTI[i].length); removed = true; break; }
      }
      if (!removed) calc.expr = calc.expr.slice(0, -1);
      calc.error = null;
    } else if (k === '=') {
      equals(); return;
    } else if (k === '2nd') {
      calc.second = !calc.second;
      buildKeypad();
      haptic('tap');
      return;
    }
    if (was2nd && k !== '2nd' && KEYS[k] && KEYS[k].cls === 'fn') { calc.second = false; buildKeypad(); }
    haptic(hk);
    renderCalc();
    saveDraft();
  }

  function toggleSign() {
    continueFromResult();
    var m = /(\d+\.?\d*(?:E[−-]?\d+)?|\.\d+|π|e|Ans)$/.exec(calc.expr);
    if (!m) { append('(−'); return; }
    var i = calc.expr.length - m[0].length;
    if (calc.expr.slice(i - 2, i) === '(−') {
      var before = calc.expr.slice(0, i - 2);
      calc.expr = before + (/[0-9.)πe]$/.test(before) ? '(' : '') + m[0];
    } else {
      calc.expr = calc.expr.slice(0, i) + '(−' + m[0];
    }
  }

  function evalOpts() { return { angle: prefs.angle, ans: calc.result != null ? calc.result : (history[0] ? history[0].value : 0) }; }

  function equals() {
    if (calc.committed || !calc.expr) { haptic('tap'); return; }
    var expr = E.autoClose(calc.expr);
    var r = E.evaluate(expr, evalOpts());
    if (!r.ok) {
      calc.error = r.error || 'Check the expression';
      haptic('error');
      renderCalc();
      return;
    }
    haptic('confirm');
    var item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), expr: expr, value: r.value, mode: prefs.mode, angle: usesAngle(expr) ? prefs.angle : null, ts: Date.now() };
    if (!(history[0] && history[0].expr === item.expr && history[0].value === item.value)) {
      history.unshift(item);
      if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
      saveHistory();
    }
    calc.lastExpr = expr;
    calc.expr = expr;
    calc.result = r.value;
    calc.committed = true;
    calc.error = null;
    renderCalc(true);
    renderSideHistory();
    saveDraft();
  }
  function usesAngle(expr) { return /(sin|cos|tan)/.test(expr); }

  function memory(op) {
    if (op === 'MC') { prefs.memory = 0; savePrefs(); toast('Memory cleared'); }
    else if (op === 'MR') {
      startFresh();
      if (endsWithOperand()) append('×');
      var s = E.toPlain(prefs.memory).replace(/-/g, '−');
      append(prefs.memory < 0 ? '(' + s + ')' : s);
    } else {
      var v = currentValue();
      if (v == null) { toast('Enter a number or calculation first'); return; }
      prefs.memory += op === 'M+' ? v : -v; savePrefs();
      toast('Memory: ' + E.formatNumber(prefs.memory, { grouping: prefs.grouping }));
    }
    renderCalc();
    saveDraft();
  }
  function currentValue() {
    if (calc.committed) return calc.result;
    var r = E.evaluate(calc.expr, evalOpts());
    return r.ok ? r.value : null;
  }
  function copyCurrent() {
    var v = currentValue();
    if (v == null) { toast('Nothing to copy yet'); return; }
    copyText(E.toPlain(v));
  }

  /* ---------- display ---------- */
  var FN_DISPLAY = { asin: ['sin', '−1'], acos: ['cos', '−1'], atan: ['tan', '−1'] };
  function exprNodes(src, ghostCount) {
    var out = [], prevTok = '';
    var re = /(asin|acos|atan|sin|cos|tan|log|ln|abs|Ans|\^\(−1\)|\^2(?![0-9.])|\^3(?![0-9.])|\d+\.?\d*(?:E[−-]?\d*)?|\.\d*|[\s\S])/g;
    var m;
    while ((m = re.exec(src))) {
      var t = m[0];
      if (FN_DISPLAY[t]) out.push(h('span', { class: 'fn' }, FN_DISPLAY[t][0], h('sup', { text: FN_DISPLAY[t][1] })));
      else if (/^(sin|cos|tan|log|ln|abs|Ans)$/.test(t)) out.push(h('span', { class: 'fn', text: t }));
      else if (t === '^(−1)') out.push(h('sup', { text: '−1' }));
      else if (t === '^2' || t === '^3') out.push(h('sup', { text: t[1] }));
      else if (/^[\d.]/.test(t)) out.push(document.createTextNode(groupNum(t)));
      else if (t === '^') out.push(document.createTextNode('^'));
      else if ('+−×÷'.indexOf(t) >= 0 && !(t === '−' && (prevTok === '' || /[(+−×÷^E]$/.test(prevTok)))) out.push(document.createTextNode('\u2009' + t + '\u2009'));
      else out.push(document.createTextNode(t));
      prevTok = t;
    }
    if (ghostCount) out.push(h('span', { class: 'ghost', text: ')'.repeat(ghostCount) }));
    return out;
  }
  function groupNum(t) {
    if (!prefs.grouping) return t;
    var m = /^(\d*)(\.\d*)?(E.*)?$/.exec(t);
    if (!m) return t;
    return (m[1] ? m[1].replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '') + (m[2] || '') + (m[3] || '');
  }
  function fmt(v) { return E.formatNumber(v, { grouping: prefs.grouping }); }

  function renderCalc(justCommitted) {
    if (!calcBuilt) return;
    C.angle.textContent = prefs.angle === 'deg' ? 'DEG' : 'RAD';
    C.angle.setAttribute('aria-label', 'Angle unit: ' + (prefs.angle === 'deg' ? 'degrees' : 'radians') + '. Tap to switch.');
    C.memBadge.hidden = !prefs.memory;
    clear(C.expr); clear(C.result);
    C.expr.className = 'line expr'; C.result.className = 'line result';
    C.display.classList.toggle('committed', !!justCommitted);

    if (calc.committed) {
      C.prev.hidden = true;
      add(C.expr, exprNodes(calc.expr, 0));
      C.expr.classList.add('small');
      C.result.textContent = fmt(calc.result);
      C.result.classList.add('big');
    } else {
      var prev = history[0];
      C.prev.hidden = !prev;
      if (prev) { C.prev.textContent = displayExpr(prev.expr) + ' = ' + fmt(prev.value); C.prev.setAttribute('aria-label', 'Reuse last calculation ' + C.prev.textContent); }
      if (!calc.expr) C.expr.textContent = '0';
      else add(C.expr, exprNodes(calc.expr, unmatched()));
      C.expr.classList.add('big');
      if (calc.error) { C.result.textContent = calc.error; C.result.classList.add('error'); }
      else {
        var pv = preview();
        if (pv != null) C.result.textContent = '= ' + fmt(pv);
        C.result.classList.add('small');
      }
    }
    // On short screens the previous-calculation line gives its room to the main line
    if (!C.prev.hidden && C.display.clientHeight && C.display.clientHeight < (prefs.mode === 'scientific' ? 175 : 150)) C.prev.hidden = true;
    fitDisplay();
    C.copyBtn.disabled = currentValue() == null;
  }
  /** Plain-text form of an expression for history rows and labels. */
  function displayExpr(src) {
    return src
      .replace(/\^\(−1\)/g, '⁻¹').replace(/\^2(?![0-9.])/g, '²').replace(/\^3(?![0-9.])/g, '³')
      .replace(/a(sin|cos|tan)/g, '$1⁻¹')
      .replace(/([^(+−×÷^E])([+−×÷])/g, '$1 $2 ')
      .replace(/\d+\.?\d*(?:E[−-]?\d*)?/g, function (n) { return groupNum(n); });
  }
  function preview() {
    var e2 = calc.expr.replace(/[+−×÷^(E]+$/, '');
    if (!e2 || !/[+−×÷^!%(√∛a-zπ]/.test(e2.replace(/^−/, ''))) return null; // a lone number needs no preview
    var r = E.evaluate(e2, evalOpts());
    return r.ok ? r.value : null;
  }
  function fitDisplay() {
    if (!calcBuilt) return;
    var big = calc.committed ? C.result : C.expr;
    if (big.classList.contains('error')) return;
    var w = C.display.clientWidth - 40;
    if (w <= 0) return;
    var max = window.innerWidth >= 960 ? 60 : Math.min(60, Math.max(40, Math.round(window.innerHeight / 14)));
    var small = calc.committed ? C.expr : C.result;
    var room = C.display.clientHeight - 22 - (C.prev.hidden ? 0 : C.prev.offsetHeight + 4) - Math.max(small.offsetHeight, 26);
    if (room > 0) max = Math.max(28, Math.min(max, Math.floor(room / 1.18)));
    var size = max;
    big.style.setProperty('--big', size + 'px');
    while (big.scrollWidth > w && size > 30) { size -= 3; big.style.setProperty('--big', size + 'px'); }
    big.scrollLeft = big.scrollWidth;
  }

  function reuse(item) {
    calc.expr = item.expr; calc.committed = false; calc.error = null;
    if (item.mode === 'scientific' && prefs.mode !== 'scientific') { prefs.mode = 'scientific'; savePrefs(); if (calcBuilt) buildKeypad(); }
    if (item.angle && item.angle !== prefs.angle) { prefs.angle = item.angle; savePrefs(); }
    saveDraft();
    if (current.name !== 'calc') goTab('#/calc'); else renderCalc();
  }

  function renderSideHistory() {
    if (!C.side) return;
    clear(C.side);
    C.side.appendChild(h('h2', { text: 'History' }));
    var list = h('div', { class: 'list' });
    if (!history.length) list.appendChild(h('p', { class: 'hint', style: { padding: '0 10px' }, text: 'Finished calculations appear here.' }));
    history.slice(0, 50).forEach(function (x) { list.appendChild(historyRow(x, true)); });
    C.side.appendChild(list);
    screenEl('calc').classList.toggle('with-side', true);
  }

  /* ---------- keyboard and paste ---------- */
  document.addEventListener('keydown', function (e) {
    if (current.name !== 'calc' || e.altKey) return;
    var tg = e.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT')) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) { if (!String(window.getSelection())) { copyCurrent(); e.preventDefault(); } return; }
    if (e.ctrlKey || e.metaKey) return;
    var map = { '*': '×', 'x': '×', '/': '÷', '-': '−', '+': '+', '^': 'pow', '(': '(', ')': ')', '%': '%', '!': '!', '.': '.', ',': '.', 'Enter': '=', '=': '=', 'Backspace': 'back', 'Escape': 'AC', 'Delete': 'AC', 'p': 'π' };
    var k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
    if (!k) return;
    if (k === 'pow' || k === 'π') { if (prefs.mode !== 'scientific' && k === 'π') return; }
    e.preventDefault();
    press(k);
    var btn = C.keypad && C.keypad.querySelector('[data-k="' + (k === '!' ? 'fact' : k) + '"]');
    if (btn) { btn.classList.add('pressed'); setTimeout(function () { btn.classList.remove('pressed'); }, 110); }
  });
  document.addEventListener('paste', function (e) {
    if (current.name !== 'calc') return;
    var tg = e.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
    var text = (e.clipboardData && e.clipboardData.getData('text')) || '';
    text = text.trim().slice(0, E.LIMITS.maxLength).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/,/g, '');
    e.preventDefault();
    try { E.tokenize(text); } catch (err) { toast('That can’t be pasted as a calculation'); return; }
    startFresh();
    if (append(text)) { renderCalc(); saveDraft(); }
  });

  /* ================================================================== */
  /* Tools list                                                          */
  /* ================================================================== */
  var toolQuery = '';
  function renderTools() {
    var el = screenEl('tools');
    var keepFocus = document.activeElement && document.activeElement.id === 'tool-search';
    clear(el);
    var page = h('div', { class: 'page' });
    page.appendChild(h('div', { class: 'page-head' }, menuButton(), h('h1', { text: 'Tools' })));
    var input = h('input', { id: 'tool-search', type: 'search', placeholder: 'Search calculators', 'aria-label': 'Search calculators', autocomplete: 'off', enterkeyhint: 'search', value: toolQuery });
    input.addEventListener('input', function () { toolQuery = input.value; renderToolResults(results); });
    page.appendChild(h('label', { class: 'search' }, icon('search'), input));
    var results = h('div');
    page.appendChild(results);
    el.appendChild(page);
    renderToolResults(results);
    if (keepFocus) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }
  function visibleTools() { return T.list.filter(function (t) { return !remote.disabled[t.id]; }); }
  function renderToolResults(box) {
    clear(box);
    var q = toolQuery.trim().toLowerCase();
    var tools = visibleTools();
    if (q) {
      var words = q.split(/\s+/);
      var hits = tools.filter(function (t) {
        var hay = (t.name + ' ' + t.desc + ' ' + t.keywords).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) >= 0; });
      });
      box.appendChild(h('div', { class: 'section-title' }, 'Results', h('span', { class: 'count', text: String(hits.length) })));
      if (!hits.length) { box.appendChild(h('p', { class: 'hint', text: 'No calculator matches “' + toolQuery.trim() + '”. Try a shorter word, like “loan” or “days”.' })); return; }
      box.appendChild(toolGroup(hits));
      return;
    }
    var pins = pinned.filter(function (id) { return !remote.disabled[id]; });
    box.appendChild(h('div', { class: 'section-title', text: 'Pinned' }));
    if (pins.length) {
      box.appendChild(h('div', { class: 'pins' }, pins.map(function (id) {
        var t = T.byId[id];
        return h('button', { type: 'button', class: 'pin-card', onclick: function () { openTool(id); } }, h('span', { class: 'tile ' + t.cat }, icon(t.cat)), t.name);
      })));
    } else box.appendChild(h('p', { class: 'hint', text: 'Tap the star on any calculator to keep it here.' }));
    T.categories.forEach(function (c) {
      var list = tools.filter(function (t) { return t.cat === c.id; });
      if (!list.length) return;
      box.appendChild(h('div', { class: 'section-title' }, c.name, h('span', { class: 'count', text: String(list.length) })));
      box.appendChild(toolGroup(list));
    });
  }
  function toolGroup(list) {
    var g = h('div', { class: 'group' });
    list.forEach(function (t) {
      var isPinned = pinned.indexOf(t.id) >= 0;
      var row = h('div', { class: 'row-wrap' },
        h('button', { type: 'button', class: 'row', onclick: function () { openTool(t.id); } },
          h('span', { class: 'tile ' + t.cat }, icon(t.cat)),
          h('span', { class: 'txt' }, h('span', { class: 'name', text: t.name }), h('span', { class: 'desc', text: t.desc }))),
        h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': String(isPinned), 'aria-label': (isPinned ? 'Unpin ' : 'Pin ') + t.name,
          onclick: function () { togglePin(t.id); renderTools(); } }, icon('star')));
      g.appendChild(row);
    });
    return g;
  }
  function togglePin(id) {
    var i = pinned.indexOf(id);
    if (i >= 0) { pinned.splice(i, 1); toast('Unpinned'); } else { pinned.unshift(id); toast('Pinned to Tools'); }
    savePinned();
    haptic('tap');
    buildSidebar();
    route();
  }

  /* ================================================================== */
  /* A single tool                                                       */
  /* ================================================================== */
  function todayISO() { return E.dates.todayISO(); }
  function parseNum(raw, f) {
    var s = String(raw == null ? '' : raw).replace(/[\s,]/g, '').replace(/−/g, '-');
    if (s === '') return { empty: true };
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return { error: 'Enter a number' };
    var n = Number(s);
    if (!isFinite(n)) return { error: 'This number is too large' };
    var min = f.min, max = f.max;
    if (min != null && n < min) return { error: min === 0 ? 'Enter 0 or more' : 'Enter at least ' + E.formatNumber(min) };
    if (max != null && n > max) return { error: 'Enter at most ' + E.formatNumber(max) };
    if (f.int && Math.floor(n) !== n) return { error: 'Enter a whole number' };
    return { value: n };
  }

  function renderTool(id) {
    var tool = T.byId[id];
    var el = clear(screenEl('tool'));
    var page = h('div', { class: 'page wide' });
    var isPinned = pinned.indexOf(id) >= 0;
    var star = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': String(isPinned), 'aria-label': isPinned ? 'Unpin' : 'Pin to Tools',
      onclick: function () { togglePin(id); var p = pinned.indexOf(id) >= 0; star.setAttribute('aria-pressed', String(p)); star.setAttribute('aria-label', p ? 'Unpin' : 'Pin to Tools'); } }, icon('star'));
    page.appendChild(h('div', { class: 'page-head' },
      h('button', { type: 'button', class: 'icon-btn back', 'aria-label': 'Back', onclick: function () { goBack('#/tools'); } }, icon('back')),
      h('h1', { text: tool.type === 'converter' ? tool.name + ' converter' : tool.name + (/(calculator|converter)$/i.test(tool.name) ? '' : ' calculator') }), star));
    page.appendChild(h('p', { class: 'lede', text: tool.desc + '.' }));
    if (remote.disabled[id]) {
      page.appendChild(h('div', { class: 'empty' }, icon('info'), h('strong', { text: 'This calculator is switched off for now' }), h('p', { text: 'It will be back in an update. Every other calculator still works.' })));
      el.appendChild(page);
      return;
    }
    if (tool.type === 'converter') renderConverter(tool, page); else renderForm(tool, page);
    el.appendChild(page);
  }

  var saveInputsTimer = null;
  function saveInputs() { clearTimeout(saveInputsTimer); saveInputsTimer = setTimeout(function () { Store.set(K.inputs, inputs); }, 400); }

  function renderForm(tool, page) {
    var saved = inputs[tool.id] || {};
    var vals = {}; // raw values by field id
    var fieldEls = {};
    tool.fields.forEach(function (f) {
      var def = f.default === 'today' ? todayISO() : f.default;
      vals[f.id] = f.id in saved && f.default !== 'today' ? saved[f.id] : (def != null ? def : (f.type === 'switch' ? false : ''));
      if (f.unitSelect) vals[f.unitSelect.id] = f.unitSelect.id in saved ? saved[f.unitSelect.id] : f.unitSelect.default;
    });
    var form = h('div', { class: 'form' });
    var results = h('div', { class: 'results', 'aria-live': 'polite' });
    var tableOpen = false;

    var noKeep = {};
    tool.fields.forEach(function (f) { if (f.default === 'today') noKeep[f.id] = true; });
    // "Today" fields always open on today's date rather than the date last typed
    function persist() { var o = {}; for (var k in vals) if (!noKeep[k]) o[k] = vals[k]; inputs[tool.id] = o; saveInputs(); }

    tool.fields.forEach(function (f) {
      var wrap = h('div', { class: 'field' });
      var fid = 'f-' + tool.id + '-' + f.id;
      var label = h(f.type === 'seg' || f.type === 'switch' ? 'span' : 'label', { class: 'label', for: f.type === 'seg' || f.type === 'switch' ? null : fid, text: f.label });
      var err = h('div', { class: 'err', hidden: true, id: fid + '-err' });
      var unitEl = null;
      if (f.type === 'seg') {
        var seg = h('div', { class: 'seg full', role: 'group', 'aria-label': f.label });
        f.options.forEach(function (o) {
          seg.appendChild(h('button', { type: 'button', 'aria-pressed': String(vals[f.id] === o[0]), text: o[1], onclick: function () {
            vals[f.id] = o[0];
            Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-pressed', String(f.options[i][0] === o[0])); });
            changed();
          } }));
        });
        wrap.appendChild(label); wrap.appendChild(seg);
      } else if (f.type === 'switch') {
        var sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!vals[f.id]), 'aria-label': f.label, onclick: function () {
          vals[f.id] = !vals[f.id]; sw.setAttribute('aria-checked', String(vals[f.id])); changed();
        } });
        wrap.appendChild(h('div', { class: 'switch-row' }, h('span', { class: 'txt', text: f.label }), sw));
      } else if (f.type === 'select') {
        var sel = h('select', { id: fid });
        f.options.forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: o[1] })); });
        sel.value = vals[f.id];
        sel.addEventListener('change', function () { vals[f.id] = sel.value; changed(); });
        wrap.appendChild(label); wrap.appendChild(h('div', { class: 'input' }, sel, icon('chevron', 'chev')));
      } else {
        var type = f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text';
        var inp = h('input', { id: fid, type: type, value: vals[f.id], placeholder: f.placeholder || '', autocomplete: 'off', 'aria-describedby': fid + '-err',
          inputmode: f.type === 'number' ? (f.int && f.min >= 0 ? 'numeric' : 'decimal') : null, enterkeyhint: type === 'text' ? 'done' : null,
          dir: f.dir || null, maxlength: f.type === 'text' ? '80' : null, spellcheck: f.type === 'text' ? 'false' : null });
        inp.addEventListener('input', function () { vals[f.id] = inp.value; changed(); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
        var box = h('div', { class: 'input' }, inp);
        unitEl = h('span', { class: 'unit' });
        box.appendChild(unitEl);
        if (f.unitSelect) {
          var us = h('select', { 'aria-label': f.label + ' unit', style: { flex: '0 0 auto', width: 'auto', 'font-size': '15px', 'font-weight': '650' } });
          f.unitSelect.options.forEach(function (o) { us.appendChild(h('option', { value: o[0], text: o[1] })); });
          us.value = vals[f.unitSelect.id];
          us.addEventListener('change', function () { vals[f.unitSelect.id] = us.value; changed(); });
          box.appendChild(us); box.appendChild(icon('chevron', 'chev'));
        }
        wrap.appendChild(label); wrap.appendChild(box);
        if (f.chips) {
          var chips = h('div', { class: 'chips' });
          f.chips.forEach(function (c) {
            chips.appendChild(h('button', { type: 'button', class: 'chip', 'data-v': String(c), text: c + (f.unit === '%' ? '%' : ''), onclick: function () { inp.value = String(c); vals[f.id] = String(c); changed(); } }));
          });
          wrap.appendChild(chips);
          fieldEls[f.id + ':chips'] = chips;
        }
        fieldEls[f.id + ':box'] = box;
        fieldEls[f.id + ':input'] = inp;
      }
      if (f.help) wrap.appendChild(h('div', { class: 'help', text: f.help }));
      wrap.appendChild(err);
      fieldEls[f.id] = { wrap: wrap, label: label, err: err, unit: unitEl };
      form.appendChild(wrap);
    });

    var raf = 0;
    function changed() { persist(); cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }

    function update() {
      var v = {};
      var hasError = false;
      tool.fields.forEach(function (f) {
        var fe = fieldEls[f.id];
        var visible = !f.showIf || f.showIf(vals);
        fe.wrap.hidden = !visible;
        if (f.labelFn) fe.label.textContent = f.labelFn(vals);
        if (fe.unit) fe.unit.textContent = f.unitFn ? f.unitFn(vals) : (f.unit || '');
        if (fieldEls[f.id + ':chips']) Array.prototype.forEach.call(fieldEls[f.id + ':chips'].children, function (c) { c.setAttribute('aria-pressed', String(String(vals[f.id]).trim() === c.getAttribute('data-v'))); });
        if (!visible) { v[f.id] = null; return; }
        if (f.type === 'number') {
          var p = parseNum(vals[f.id], f);
          fe.err.hidden = !p.error; fe.err.textContent = p.error || '';
          if (fieldEls[f.id + ':box']) fieldEls[f.id + ':box'].classList.toggle('invalid', !!p.error);
          if (fieldEls[f.id + ':input']) fieldEls[f.id + ':input'].setAttribute('aria-invalid', String(!!p.error));
          if (p.error) hasError = true;
          v[f.id] = p.value != null ? p.value : null;
        } else if (f.type === 'date' || f.type === 'time') {
          v[f.id] = vals[f.id] || null;
        } else v[f.id] = vals[f.id];
        if (f.unitSelect) v[f.unitSelect.id] = vals[f.unitSelect.id];
      });
      clear(results);
      if (hasError) { results.appendChild(h('p', { class: 'placeholder', text: 'Fix the highlighted field to see the result.' })); return; }
      var r;
      try { r = tool.compute(v); } catch (e) { r = { error: 'Something in these numbers can’t be calculated. Check them and try again.' }; }
      drawResult(results, r, tool, function () { tableOpen = !tableOpen; return tableOpen; }, function () { return tableOpen; });
    }

    var grid = h('div', { class: 'tool-grid' }, form, results);
    page.appendChild(grid);
    page.appendChild(h('div', { style: { 'margin-top': '18px' } },
      h('button', { type: 'button', class: 'text-btn', text: 'Clear inputs', onclick: function () {
        delete inputs[tool.id]; saveInputs(); renderTool(tool.id);
      } })));
    update();
  }

  function drawResult(box, r, tool, toggleTable, isOpen) {
    if (!r) { box.appendChild(h('p', { class: 'placeholder', text: 'Fill in the fields to see the result.' })); return; }
    if (r.error) { box.appendChild(h('p', { class: 'result-error', role: 'alert', text: r.error })); return; }
    if (r.hero) {
      var copyBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Copy ' + r.hero.label, style: { float: 'right', 'margin': '-8px -8px 0 0' },
        onclick: function () { copyText(r.hero.copy != null ? r.hero.copy : String(r.hero.value).replace(/,/g, '').replace(/−/g, '-')); } }, icon('copy'));
      box.appendChild(copyBtn);
      box.appendChild(h('div', { class: 'hero-label', text: r.hero.label }));
      var hv = String(r.hero.value);
      box.appendChild(h('div', { class: 'hero-value' + (hv.length > 22 ? ' xl' : hv.length > 14 ? ' long' : ''), text: hv }));
      if (r.hero.sub) box.appendChild(h('div', { class: 'hero-sub', text: r.hero.sub }));
    }
    if (r.trio) box.appendChild(h('div', { class: 'hero-trio' }, r.trio.map(function (x) { return h('div', null, h('b', { text: x.v }), h('span', { text: x.l })); })));
    if (r.bar) {
      var total = r.bar.reduce(function (a, p) { return a + Math.max(0, p.value); }, 0);
      if (total > 0) {
        box.appendChild(h('div', { class: 'bar', role: 'img', 'aria-label': r.bar.map(function (p) { return p.label + ' ' + Math.round(p.value / total * 100) + '%'; }).join(', ') },
          r.bar.map(function (p) { return h('span', { style: { width: (Math.max(0, p.value) / total * 100).toFixed(2) + '%', background: p.color } }); })));
        box.appendChild(h('div', { class: 'legend' }, r.bar.map(function (p) {
          return h('span', null, h('i', { style: { background: p.color } }), p.label + ' ' + (Math.max(0, p.value) / total * 100).toFixed(1) + '%');
        })));
      }
    }
    if (r.stats && r.stats.length) box.appendChild(h('dl', { class: 'stats' }, r.stats.map(function (s) { return h('div', { class: 'stat' }, h('dt', { text: s[0] }), h('dd', { text: s[1] })); })));
    if (r.table) {
      var wrap = h('div', { class: 'table-wrap', hidden: !isOpen() });
      var btn = h('button', { type: 'button', class: 'btn secondary table-toggle', 'aria-expanded': String(isOpen()), text: (isOpen() ? 'Hide ' : 'Show ') + r.table.title });
      function fill() {
        if (wrap.firstChild) return;
        var tb = h('tbody');
        r.table.rows.forEach(function (row) { tb.appendChild(h('tr', null, row.map(function (c) { return h('td', { text: c }); }))); });
        wrap.appendChild(h('table', { class: 'data' }, h('thead', null, h('tr', null, r.table.head.map(function (c) { return h('th', { scope: 'col', text: c }); }))), tb));
      }
      if (isOpen()) fill();
      btn.addEventListener('click', function () {
        var open = toggleTable();
        if (open) fill();
        wrap.hidden = !open;
        btn.textContent = (open ? 'Hide ' : 'Show ') + r.table.title;
        btn.setAttribute('aria-expanded', String(open));
      });
      box.appendChild(btn); box.appendChild(wrap);
    }
    if (r.how && r.how.length) box.appendChild(h('div', { class: 'how' }, h('b', { text: 'How it’s worked out' }), r.how.map(function (l) { return h('p', { text: l }); })));
  }

  var CONV_DEFAULTS = { length: ['m', 'ft'], mass: ['kg', 'lb'], temperature: ['°C', '°F'], area: ['m²', 'ft²'], volume: ['L', 'gal'], speed: ['km/h', 'mph'], time: ['h', 'min'], data: ['GB', 'GiB'], energy: ['kcal', 'kJ'], pressure: ['bar', 'psi'] };
  function renderConverter(tool, page) {
    var cat = E.units[tool.category];
    var codes = cat.units.map(function (u) { return u[0]; });
    var saved = inputs[tool.id] || {};
    var st = {
      value: typeof saved.value === 'string' ? saved.value : '1',
      from: codes.indexOf(saved.from) >= 0 ? saved.from : CONV_DEFAULTS[tool.category][0],
      to: codes.indexOf(saved.to) >= 0 ? saved.to : CONV_DEFAULTS[tool.category][1]
    };
    function persist() { inputs[tool.id] = { value: st.value, from: st.from, to: st.to }; saveInputs(); }
    function unitSelect(which, label) {
      var s = h('select', { 'aria-label': label });
      cat.units.forEach(function (u) { s.appendChild(h('option', { value: u[0], text: u[1] + ' (' + u[0] + ')' })); });
      s.value = st[which];
      s.addEventListener('change', function () { st[which] = s.value; persist(); update(); });
      return s;
    }
    var inp = h('input', { id: 'conv-value', type: 'text', inputmode: 'decimal', value: st.value, autocomplete: 'off', enterkeyhint: 'done' });
    var fromSel = unitSelect('from', 'From unit'), toSel = unitSelect('to', 'To unit');
    var err = h('div', { class: 'err', hidden: true });
    inp.addEventListener('input', function () { st.value = inp.value; persist(); update(); });
    var swap = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Swap units', onclick: function () {
      var t = st.from; st.from = st.to; st.to = t; fromSel.value = st.from; toSel.value = st.to; persist(); update(); haptic('tap');
    } }, icon('swap'));
    var form = h('div', { class: 'form conv' },
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'conv-value', text: 'Value' }), h('div', { class: 'input' }, inp), err),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'From' }), h('div', { class: 'input' }, fromSel, icon('chevron', 'chev'))),
      h('div', { style: { display: 'flex', 'justify-content': 'center' } }, swap),
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'To' }), h('div', { class: 'input' }, toSel, icon('chevron', 'chev'))));
    var results = h('div', { class: 'results', 'aria-live': 'polite' });
    page.appendChild(h('div', { class: 'tool-grid' }, form, results));
    function cfmt(v) { return E.formatNumber(v, { grouping: prefs.grouping, sig: 12 }); }
    function update() {
      clear(results);
      var p = parseNum(st.value, {});
      err.hidden = !p.error; err.textContent = p.error || '';
      if (p.empty || p.error) { results.appendChild(h('p', { class: 'placeholder', text: 'Enter a value to convert.' })); return; }
      var out = E.convert(tool.category, p.value, st.from, st.to);
      var fromName = st.from, toName = st.to;
      if (tool.category === 'temperature' && ((st.from === 'K' && p.value < 0) || (st.from === '°C' && p.value < -273.15) || (st.from === '°F' && p.value < -459.67))) {
        results.appendChild(h('p', { class: 'result-error', text: 'That’s below absolute zero (−273.15 °C), the lowest temperature possible.' }));
        return;
      }
      drawResult(results, { hero: { label: cfmt(p.value) + ' ' + fromName + ' =', value: cfmt(out) + ' ' + toName, copy: E.toPlain(Number(out.toPrecision(12))) } }, tool, function () { return false; }, function () { return false; });
      var dl = h('dl', { class: 'stats conv-all' });
      cat.units.forEach(function (u) {
        var v = E.convert(tool.category, p.value, st.from, u[0]);
        dl.appendChild(h('div', { class: 'stat' + (u[0] === st.to ? ' current' : '') }, h('dt', { text: u[1] }), h('dd', { text: cfmt(v) + ' ' + u[0] })));
      });
      results.appendChild(h('div', { class: 'section-title', style: { margin: '18px 0 4px' }, text: 'In every unit' }));
      results.appendChild(dl);
      if (tool.category === 'data') results.appendChild(h('div', { class: 'how' }, h('p', { text: 'kB, MB, GB use 1000. KiB, MiB, GiB use 1024, which is how many operating systems report file sizes.' })));
      if (tool.category === 'time') results.appendChild(h('div', { class: 'how' }, h('p', { text: 'Months and years are averages of the Gregorian calendar (365.2425 days a year).' })));
    }
    update();
  }

  /* ================================================================== */
  /* History                                                             */
  /* ================================================================== */
  function historyRow(x, compact) {
    var when = new Date(x.ts);
    var main = h('button', { type: 'button', class: 'h-main', 'aria-label': 'Use again: ' + displayExpr(x.expr) + ' equals ' + fmt(x.value), onclick: function () { reuse(x); } },
      h('span', { class: 'h-expr', text: displayExpr(x.expr) + ' =' }),
      h('span', { class: 'h-res', text: fmt(x.value) }),
      compact ? null : h('span', { class: 'h-meta', text: (x.mode === 'scientific' ? 'Scientific' : 'Standard') + (x.angle ? ', ' + x.angle.toUpperCase() : '') + ', ' + pad(when.getHours()) + ':' + pad(when.getMinutes()) }));
    var actions = h('div', { class: 'h-actions' },
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Copy result', onclick: function () { copyText(E.toPlain(x.value)); } }, icon('copy')),
      compact ? null : h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Delete', onclick: function () { deleteHistory(x.id); } }, icon('trash')));
    return h('div', { class: 'h-item' }, main, actions);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayLabel(ts) {
    var d = new Date(ts), now = new Date();
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var diff = Math.round((b - a) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  }
  function deleteHistory(id) {
    var idx = -1;
    for (var i = 0; i < history.length; i++) if (history[i].id === id) { idx = i; break; }
    if (idx < 0) return;
    var removed = history.splice(idx, 1)[0];
    saveHistory(); renderHistory(); renderSideHistory();
    toast('Deleted', { label: 'Undo', run: function () { history.splice(Math.min(idx, history.length), 0, removed); saveHistory(); renderHistory(); renderSideHistory(); } });
  }
  function renderHistory() {
    var el = clear(screenEl('history'));
    var page = h('div', { class: 'page' });
    var head = h('div', { class: 'page-head' }, menuButton(), h('h1', { text: 'History' }));
    if (history.length) head.appendChild(h('button', { type: 'button', class: 'text-btn', text: 'Clear all', onclick: function () {
      var backup = history.slice();
      history.length = 0; saveHistory(); renderHistory(); renderSideHistory();
      toast('History cleared', { label: 'Undo', run: function () { history = backup; saveHistory(); renderHistory(); renderSideHistory(); } });
    } }));
    page.appendChild(head);
    if (!history.length) {
      page.appendChild(h('div', { class: 'empty' }, icon('history'), h('strong', { text: 'No calculations yet' }),
        h('p', { text: 'Calculations you finish with = appear here. They stay on this device and are never uploaded.' }),
        h('button', { type: 'button', class: 'btn secondary', text: 'Open the calculator', onclick: function () { goTab('#/calc'); } })));
    } else {
      page.appendChild(h('p', { class: 'lede', text: 'Tap a calculation to use it again. Kept on this device only.' }));
      var lastDay = null, group = null;
      history.forEach(function (x) {
        var dl = dayLabel(x.ts);
        if (dl !== lastDay) { lastDay = dl; page.appendChild(h('div', { class: 'day', text: dl })); group = h('div', { class: 'group' }); page.appendChild(group); }
        group.appendChild(historyRow(x, false));
      });
    }
    el.appendChild(page);
  }

  /* ================================================================== */
  /* Settings                                                            */
  /* ================================================================== */
  function segControl(label, options, value, onPick) {
    var seg = h('div', { class: 'seg full', role: 'group', 'aria-label': label });
    options.forEach(function (o) {
      seg.appendChild(h('button', { type: 'button', 'aria-pressed': String(o[0] === value), text: o[1], onclick: function () {
        Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-pressed', String(options[i][0] === o[0])); });
        onPick(o[0]);
      } }));
    });
    return seg;
  }
  function switchRow(title, sub, checked, onChange) {
    var sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(checked), 'aria-label': title, onclick: function () {
      var v = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(v));
      onChange(v);
    } });
    return h('div', { class: 'switch-row set-item' }, h('div', { class: 'txt' }, title, sub ? h('span', { text: sub }) : null), sw);
  }
  function renderSettings() {
    var el = clear(screenEl('settings'));
    var page = h('div', { class: 'page' });
    page.appendChild(h('div', { class: 'page-head' }, menuButton(), h('h1', { text: 'Settings' })));

    page.appendChild(h('div', { class: 'section-title', text: 'Appearance' }));
    page.appendChild(h('div', { class: 'set-group' },
      h('div', { class: 'set-item' }, h('span', { class: 'label', text: 'Theme' }),
        segControl('Theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], prefs.theme, function (v) { prefs.theme = v; savePrefs(); applyTheme(); })),
      h('div', { class: 'set-item' }, h('span', { class: 'label', text: 'Keypad size' }),
        segControl('Keypad size', [['comfortable', 'Comfortable'], ['large', 'Large'], ['xl', 'Extra large']], prefs.keypad, function (v) { prefs.keypad = v; savePrefs(); toast('Keypad size saved'); }))));

    page.appendChild(h('div', { class: 'section-title', text: 'Calculator' }));
    var calcGroup = h('div', { class: 'set-group' },
      switchRow('Thousands separators', 'Show 1,234,567 instead of 1234567', prefs.grouping, function (v) { prefs.grouping = v; savePrefs(); }));
    if (Native.has) calcGroup.appendChild(switchRow('Vibrate on key press', 'Follows your phone’s touch feedback setting', prefs.haptics, function (v) { prefs.haptics = v; savePrefs(); }));
    page.appendChild(calcGroup);

    page.appendChild(h('div', { class: 'section-title', text: 'Privacy and data' }));
    var priv = h('div', { class: 'set-group' });
    if (Native.has) {
      var analyticsOn = Native.call('isAnalyticsEnabled');
      priv.appendChild(switchRow('Share anonymous usage statistics',
        'Which screens are opened and app performance, through Google Analytics for Firebase. Your calculations and inputs are never included.',
        analyticsOn !== false, function (v) { Native.call('setAnalyticsEnabled', v); toast(v ? 'Usage statistics on' : 'Usage statistics off'); }));
    }
    var storedOpen = false;
    var storedBox = h('div', { hidden: true },
      h('ul', { class: 'stored-list' },
        h('li', { text: 'Your settings: theme, keypad size, separators, vibration, angle unit and memory value' }),
        h('li', { text: 'Calculation history (up to ' + HISTORY_MAX + ' entries)' }),
        h('li', { text: 'Pinned calculators and the values last typed into each calculator' }),
        h('li', { text: 'The calculation currently on screen, so it survives the app closing' })),
      h('p', { class: 'hint', text: 'All of this stays in the app’s private storage on this device and is removed when you uninstall. It is kept when the app updates.' }));
    priv.appendChild(h('button', { type: 'button', class: 'set-link', 'aria-expanded': 'false', onclick: function (e) {
      storedOpen = !storedOpen; storedBox.hidden = !storedOpen; e.currentTarget.setAttribute('aria-expanded', String(storedOpen));
    } }, icon('shield'), h('span', { class: 'txt' }, 'What’s stored on this device', h('span', { text: 'Nothing here leaves your phone' })), icon('chevron')));
    priv.appendChild(storedBox);
    priv.appendChild(h('button', { type: 'button', class: 'set-link', onclick: function () {
      if (!history.length) { toast('History is already empty'); return; }
      var backup = history.slice(); history.length = 0; saveHistory(); renderSideHistory();
      toast('History deleted', { label: 'Undo', run: function () { history = backup; saveHistory(); renderSideHistory(); } });
    } }, icon('trash'), h('span', { class: 'txt' }, 'Delete calculation history', h('span', { text: history.length ? history.length + ' saved' : 'Empty' }))));
    var resetArmed = false;
    var resetBtn = h('button', { type: 'button', class: 'set-link danger', onclick: function () {
      if (!resetArmed) { resetArmed = true; resetLabel.textContent = 'Tap again to delete everything'; setTimeout(function () { resetArmed = false; resetLabel.textContent = 'Reset app and delete all data'; }, 4000); return; }
      frozen = true;
      clearTimeout(draftTimer); clearTimeout(saveInputsTimer);
      Store.keys().forEach(function (k) { if (k && (k.indexOf('cs.') === 0 || k === K.legacyTheme)) Store.remove(k); });
      mem = {};
      location.replace(location.pathname + '#/calc');
      location.reload();
    } }, icon('trash'));
    var resetLabel = h('span', { class: 'txt', text: 'Reset app and delete all data' });
    resetBtn.appendChild(resetLabel);
    priv.appendChild(resetBtn);
    page.appendChild(priv);

    page.appendChild(h('div', { class: 'section-title', text: 'Help' }));
    var help = h('div', { class: 'set-group' },
      h('button', { type: 'button', class: 'set-link', onclick: function () { push('#/settings/feedback'); } }, icon('message'),
        h('span', { class: 'txt' }, 'Send feedback', h('span', { text: 'Report a problem or suggest a calculator' })), icon('right')));
    if (Native.has) {
      help.appendChild(h('button', { type: 'button', class: 'set-link', onclick: function () { Native.call('openExternal', 'play'); } }, icon('star'),
        h('span', { class: 'txt' }, 'Rate on Google Play', updateAvailable() ? h('span', { text: 'An update is available' }) : null), icon('external')));
      help.appendChild(h('button', { type: 'button', class: 'set-link', onclick: function () { Native.call('openExternal', 'privacy'); } }, icon('shield'),
        h('span', { class: 'txt', text: 'Privacy policy' }), icon('external')));
    }
    page.appendChild(help);

    page.appendChild(h('p', { class: 'about', style: { margin: '24px 4px 0' } },
      h('b', { text: APP_NAME }), ' version ' + appInfo.versionName, h('br'), '© ' + new Date().getFullYear() + ' ' + PUBLISHER));
    el.appendChild(page);
  }

  /* ---------- feedback ---------- */
  var feedbackPending = {};
  function renderFeedback() {
    var el = clear(screenEl('feedback'));
    var page = h('div', { class: 'page' });
    page.appendChild(h('div', { class: 'page-head' },
      h('button', { type: 'button', class: 'icon-btn back', 'aria-label': 'Back', onclick: function () { goBack('#/settings'); } }, icon('back')),
      h('h1', { text: 'Send feedback' })));
    var canSend = Native.has && Native.call('canSendFeedback') === true;
    if (!canSend) {
      page.appendChild(h('div', { class: 'empty' }, icon('message'), h('strong', { text: 'Feedback can’t be sent from here yet' }),
        h('p', { text: Native.has ? 'Leave a review on Google Play and we’ll read it there.' : 'Open Calc Suit on Android, or leave a review on Google Play.' }),
        Native.has ? h('button', { type: 'button', class: 'btn secondary', text: 'Open Google Play', onclick: function () { Native.call('openExternal', 'play'); } }) : null));
      el.appendChild(page);
      return;
    }
    var st = { kind: 'problem' };
    var msg = h('textarea', { id: 'fb-msg', maxlength: '1000', rows: '6', placeholder: 'What happened, or what would you like to see?' });
    var count = h('div', { class: 'help', text: '0 / 1000' });
    msg.addEventListener('input', function () { count.textContent = msg.value.length + ' / 1000'; send.disabled = msg.value.trim().length < 5; });
    var email = h('input', { id: 'fb-email', type: 'email', inputmode: 'email', autocomplete: 'email', maxlength: '254', placeholder: 'Optional' });
    var status = h('p', { class: 'hint', role: 'status' });
    var send = h('button', { type: 'button', class: 'btn', text: 'Send feedback', disabled: true, onclick: function () {
      var em = email.value.trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { status.textContent = 'Check the email address, or leave it empty.'; return; }
      var id = 'fb' + Date.now();
      feedbackPending[id] = function (ok, text) {
        send.disabled = false; send.textContent = 'Send feedback';
        if (ok) { msg.value = ''; email.value = ''; count.textContent = '0 / 1000'; send.disabled = true; status.textContent = 'Thanks. Your feedback was sent.'; toast('Feedback sent'); }
        else status.textContent = text || 'Couldn’t send. Check your connection and try again.';
      };
      send.disabled = true; send.textContent = 'Sending…'; status.textContent = '';
      Native.call('sendFeedback', JSON.stringify({ kind: st.kind, message: msg.value.trim().slice(0, 1000), email: em }), id);
    } });
    page.appendChild(h('div', { class: 'form' },
      h('div', { class: 'field' }, h('span', { class: 'label', text: 'Type' }), segControl('Type', [['problem', 'Problem'], ['idea', 'Idea'], ['other', 'Other']], st.kind, function (v) { st.kind = v; })),
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'fb-msg', text: 'Message' }), h('div', { class: 'input' }, msg), count),
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'fb-email', text: 'Email for a reply' }), h('div', { class: 'input' }, email)),
      h('p', { class: 'hint', text: 'Sends your message, the email if you add one, the app version and the Android version to ' + PUBLISHER + '. Calculations and history are never attached. Don’t include passwords or card numbers.' }),
      send, status));
    el.appendChild(page);
  }

  /* ================================================================== */
  /* Callbacks the Android wrapper can call                              */
  /* ================================================================== */
  window.CalcSuit = {
    onRemoteConfig: function (json) { applyRemoteConfig(json); },
    onFeedbackResult: function (id, ok, text) { var cb = feedbackPending[id]; if (cb) { delete feedbackPending[id]; cb(!!ok, typeof text === 'string' ? text.slice(0, 200) : ''); } },
    onSystemThemeChanged: function () { if (prefs.theme === 'system') applyTheme(); },
    /** Android back button: close the menu first. Returns true when it handled the press. */
    onBack: function () { if (drawerOpen) { closeDrawer(); return true; } return false; },
    onPause: function () { Store.set(K.draft, { expr: calc.expr, committed: calc.committed, result: calc.result, lastExpr: calc.lastExpr }); }
  };

  /* ================================================================== */
  /* Keyboard-open detection (hide the tab bar while typing)             */
  /* ================================================================== */
  var baseH = window.innerHeight;
  function checkKb() {
    var a = document.activeElement;
    var typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.type !== 'button';
    if (!typing && window.innerHeight > baseH) baseH = window.innerHeight;
    document.body.classList.toggle('kb-open', !!typing && window.innerHeight < baseH - 120);
  }
  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () { checkKb(); layoutKeypad(); });
  });
  window.addEventListener('orientationchange', function () { baseH = 0; setTimeout(function () { baseH = window.innerHeight; checkKb(); layoutKeypad(); }, 300); });
  document.addEventListener('focusin', checkKb);
  document.addEventListener('focusout', function () { setTimeout(checkKb, 50); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) window.CalcSuit.onPause(); });

  /* ================================================================== */
  /* Start                                                               */
  /* ================================================================== */
  buildTabbar();
  buildSidebar();
  var startCfg = Native.call('getRemoteConfig');
  if (startCfg) applyRemoteConfig(startCfg);
  Native.call('refreshRemoteConfig');
  if (!window.history.state) window.history.replaceState({ d: 0 }, '', location.hash && parseRoute(location.hash).name !== 'calc' ? location.hash : '#/calc');
  route();
  renderNotice();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})();
