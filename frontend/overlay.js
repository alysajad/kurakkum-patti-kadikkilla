(function () {
  'use strict';

  // Configuration
  var BACKEND_URL = window.KPK_BACKEND_URL || 'http://localhost:8000';
  var POLL_INTERVAL_MS = 5000;
  var STORAGE_KEY = 'KPK_ALLOWED_SITES';

  // Create container
  var container = document.createElement('div');
  container.id = 'kpk-overlay-container';
  container.setAttribute('aria-live', 'polite');
  document.documentElement.appendChild(container);
  // ensure no fullscreen overlay class remains from prior loads
  try { container.classList.remove('kpk-speaking'); } catch (_) {}

  // Inject CSS if not present
  var stylePresent = document.getElementById('kpk-overlay-styles');
  if (!stylePresent) {
    var link = document.createElement('link');
    link.id = 'kpk-overlay-styles';
    link.rel = 'stylesheet';
    link.href = (window.KPK_STYLES_URL || './styles.css');
    document.documentElement.appendChild(link);
  }

  // Build UI
  var bubble = document.createElement('div');
  bubble.className = 'kpk-bubble';

  var avatar = document.createElement('div');
  avatar.className = 'kpk-avatar';
  avatar.textContent = '🐶';

  var textEl = document.createElement('div');
  textEl.className = 'kpk-text';
  textEl.textContent = 'Disabled on this site. Click ⚙️ to enable.';

  // Threat/Noise meter and stats
  var meter = document.createElement('div');
  meter.className = 'kpk-meter';
  var meterThreat = document.createElement('div');
  meterThreat.className = 'kpk-meter-threat';
  var meterNoise = document.createElement('div');
  meterNoise.className = 'kpk-meter-noise';
  meter.appendChild(meterThreat);
  meter.appendChild(meterNoise);
  var statsEl = document.createElement('div');
  statsEl.className = 'kpk-stats';
  statsEl.textContent = 'Threat 0% • Noise 0%';

  var button = document.createElement('button');
  button.className = 'kpk-play';
  button.textContent = '▶️';
  button.disabled = true;

  var gear = document.createElement('button');
  gear.className = 'kpk-gear';
  gear.title = 'Settings';
  gear.textContent = '⚙️';

  var openBtn = document.createElement('button');
  openBtn.className = 'kpk-open';
  openBtn.title = 'Open audio in new tab';
  openBtn.textContent = '🔊';
  openBtn.disabled = true;

  var audio = new Audio();
  audio.preload = 'auto';
  var attemptedAuto = false;

  button.addEventListener('click', function () {
    if (audio.src) {
      audio.currentTime = 0;
      audio.play().catch(function (err) {
        // Fallback hint if playback is blocked
        try { console.warn('[KPK] play() blocked:', err && err.message ? err.message : err); } catch (_) {}
        textEl.textContent = 'Audio blocked. Click 🔊 to open.';
      });
    }
  });

  openBtn.addEventListener('click', function () {
    if (audio.src) {
      try { window.open(audio.src, '_blank', 'noopener'); } catch (_) {}
    }
  });

  bubble.appendChild(avatar);
  bubble.appendChild(textEl);
  bubble.appendChild(meter);
  bubble.appendChild(statsEl);
  bubble.appendChild(button);
  bubble.appendChild(openBtn);
  bubble.appendChild(gear);
  container.appendChild(bubble);

  // Toast for brief notifications (no fullscreen overlays)
  var toast = document.createElement('div');
  toast.className = 'kpk-toast';
  toast.style.display = 'none';
  container.appendChild(toast);
  var toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.style.display = 'none'; }, 3000);
  }

  // speaking mode disabled (keep popup only)
  function enterSpeaking() {}
  function exitSpeaking() {}

  audio.addEventListener('play', function(){ enterSpeaking(); });
  audio.addEventListener('ended', function(){ setTimeout(exitSpeaking, 250); });
  audio.addEventListener('pause', function(){ setTimeout(exitSpeaking, 250); });

  // no gate click handler anymore (toast only)

  // Settings panel
  var panel = document.createElement('div');
  panel.className = 'kpk-panel';
  panel.hidden = true;

  var heading = document.createElement('div');
  heading.className = 'kpk-panel-title';
  heading.textContent = 'Allowed Sites';
  panel.appendChild(heading);

  var sitesList = document.createElement('div');
  sitesList.className = 'kpk-sites-list';
  panel.appendChild(sitesList);

  var row = document.createElement('div');
  row.className = 'kpk-row';
  var input = document.createElement('input');
  input.className = 'kpk-input';
  input.placeholder = 'e.g., example.com or *.example.com';
  var addBtn = document.createElement('button');
  addBtn.className = 'kpk-add';
  addBtn.textContent = 'Add';
  row.appendChild(input);
  row.appendChild(addBtn);
  panel.appendChild(row);

  var quickBtn = document.createElement('button');
  quickBtn.className = 'kpk-quick';
  quickBtn.textContent = 'Enable on this site';
  panel.appendChild(quickBtn);

  container.appendChild(panel);

  gear.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      renderSites();
    }
  });

  // Allowlist storage
  function loadSites() {
    try {
      // Prefer host-provided storage (e.g., userscript bridge)
      if (window.KPK_STORAGE && typeof window.KPK_STORAGE.getAllowedSites === 'function') {
        var g = window.KPK_STORAGE.getAllowedSites();
        if (Array.isArray(g)) return g.slice();
      }
    } catch (_) {}
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (!v && Array.isArray(window.KPK_ALLOWED_SITES)) return window.KPK_ALLOWED_SITES.slice();
      return v ? JSON.parse(v) : [];
    } catch (_) { return []; }
  }
  function saveSites(list) {
    try {
      if (window.KPK_STORAGE && typeof window.KPK_STORAGE.setAllowedSites === 'function') {
        window.KPK_STORAGE.setAllowedSites(list);
      }
    } catch (_) {}
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
  }

  function normalize(pattern) {
    return String(pattern || '').trim();
  }

  function matches(hostname, pattern) {
    pattern = normalize(pattern);
    if (!pattern) return false;
    if (pattern.includes('/')) {
      // Full URL/origin substring match
      return (location.href.indexOf(pattern) !== -1);
    }
    if (pattern.startsWith('*.')) {
      var suffix = pattern.slice(1); // '.example.com'
      return hostname.endsWith(suffix);
    }
    return hostname === pattern || hostname.endsWith('.' + pattern);
  }

  function isAllowedHere() {
    var sites = loadSites();
    var host = location.hostname;
    for (var i = 0; i < sites.length; i++) {
      if (matches(host, sites[i])) return true;
    }
    return false;
  }

  function renderSites() {
    var list = loadSites();
    sitesList.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'kpk-empty';
      empty.textContent = 'No sites added.';
      sitesList.appendChild(empty);
    } else {
      list.forEach(function (p, idx) {
        var pill = document.createElement('span');
        pill.className = 'kpk-pill';
        pill.textContent = p;
        var x = document.createElement('button');
        x.className = 'kpk-remove';
        x.textContent = '×';
        x.title = 'Remove';
        x.addEventListener('click', function () {
          var arr = loadSites();
          arr.splice(idx, 1);
          saveSites(arr);
          renderSites();
          updateEnabledState();
        });
        var item = document.createElement('div');
        item.className = 'kpk-site-item';
        item.appendChild(pill);
        item.appendChild(x);
        sitesList.appendChild(item);
      });
    }
  }

  addBtn.addEventListener('click', function () {
    var val = normalize(input.value);
    if (!val) return;
    var arr = loadSites();
    if (arr.indexOf(val) === -1) {
      arr.push(val);
      saveSites(arr);
      input.value = '';
      renderSites();
      updateEnabledState();
    }
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addBtn.click();
  });

  quickBtn.addEventListener('click', function () {
    var host = location.hostname;
    var wildcard = '*.' + host.split('.').slice(-2).join('.');
    var candidate = host.split('.').length > 2 ? wildcard : host;
    var arr = loadSites();
    if (arr.indexOf(candidate) === -1) {
      arr.push(candidate);
      saveSites(arr);
      renderSites();
      updateEnabledState();
    }
  });

  // Analyze flow with allowlist gating
  var lastSentHash = '';
  var intervalId = null;
  var debounceTimer = null;

  function startPolling() {
    if (intervalId) return;
    textEl.textContent = 'സ്കാൻ ചെയ്യുന്നു…';
    analyzeNow();
    intervalId = setInterval(analyzeNow, POLL_INTERVAL_MS);
    window.addEventListener('scroll', debouncedAnalyze, { passive: true });
    document.addEventListener('selectionchange', debouncedAnalyze);
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    window.removeEventListener('scroll', debouncedAnalyze, { passive: true });
    document.removeEventListener('selectionchange', debouncedAnalyze);
  }

  function updateEnabledState() {
    if (isAllowedHere()) {
      startPolling();
    } else {
      stopPolling();
      textEl.textContent = 'Disabled on this site. Click ⚙️ to enable.';
      button.disabled = true;
    }
  }

  function hashString(str) {
    // Simple DJB2 hash
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return String(hash);
  }

  function visibleText() {
    // MVP: body innerText, trimmed and limited
    var t = (document.body && document.body.innerText) ? document.body.innerText : '';
    t = t.replace(/\s+/g, ' ').trim();
    if (t.length > 3000) {
      t = t.slice(0, 3000);
    }
    return t;
  }

  function analyzeNow() {
    var text = visibleText();
    if (!text) return;

    var h = hashString(text);
    if (h === lastSentHash) return;
    lastSentHash = h;

    textEl.textContent = 'സ്കാൻ ചെയ്യുന്നു…';
    button.disabled = true;

    fetch(BACKEND_URL.replace(/\/$/, '') + '/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.dialogue) {
          textEl.textContent = data.dialogue + ' (' + Math.round(data.score) + ')';
        } else {
          textEl.textContent = 'ഫലം ലഭ്യമല്ല';
        }
        // Update metrics meter
        try {
          var m = (data && data.metrics) ? data.metrics : {};
          var tp = Math.max(0, Math.min(100, Math.round(m.threat_percent || 0)));
          var np = Math.max(0, Math.min(100, Math.round(m.noise_percent || (100 - tp))));
          meterThreat.style.width = tp + '%';
          meterNoise.style.width = np + '%';
          statsEl.textContent = 'Threat ' + tp + '% • Noise ' + np + '%';
          if (m.danger_count != null && m.noise_count != null && m.drama_units != null) {
            statsEl.title = 'danger=' + m.danger_count + ', noise=' + m.noise_count + ', drama=' + m.drama_units;
          }
        } catch (e) { /* ignore */ }
        if (data && data.audio_url) {
          audio.src = data.audio_url;
          button.disabled = false;
          openBtn.disabled = false;
          // Auto-speak on allowed HTTP pages; if blocked, show gate to get a gesture
          if (location.protocol === 'http:' && isAllowedHere() && !attemptedAuto) {
            attemptedAuto = true;
            audio.currentTime = 0;
            audio.play().catch(function(){ showToast('🐶 Tap ▶️ or 🔊 to play'); });
          }
        } else {
          button.disabled = true;
          openBtn.disabled = true;
        }
      })
      .catch(function () {
        textEl.textContent = 'ബന്ധം പിഴച്ചു';
        button.disabled = true;
        openBtn.disabled = true;
      });
  }

  function debouncedAnalyze() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(analyzeNow, 800);
  }

  // Initialize
  updateEnabledState();
})();


