// ==UserScript==
// @name         Kurakkum Patti Kadikkilla (Localhost)
// @namespace    kpk
// @version      0.1.0
// @description  Overlay loads on every site at startup; scans only allowed sites
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==
(function () {
    'use strict';
  
    // Local backend
    window.KPK_BACKEND_URL = 'http://localhost:8000';
  
    // Global allowlist storage (persists across sites)
    window.KPK_STORAGE = {
      getAllowedSites: function () {
        try { return JSON.parse(GM_getValue('KPK_ALLOWED_SITES', '[]')); } catch (e) { return []; }
      },
      setAllowedSites: function (list) {
        GM_setValue('KPK_ALLOWED_SITES', JSON.stringify(list || []));
      }
    };
  
    // Inline CSS (no external hosting needed)
    var css = "" +
      "#kpk-overlay-container{position:fixed;right:16px;bottom:16px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,\\\"Noto Sans\\\",\\\"Malayalam Sangam MN\\\",sans-serif}" +
      ".kpk-bubble{display:flex;align-items:center;gap:8px;background:rgba(20,20,20,.92);color:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.35);padding:10px 12px;max-width:320px}" +
      ".kpk-avatar{font-size:22px;line-height:1}" +
      ".kpk-text{font-size:14px;line-height:1.35;max-width:230px}" +
      ".kpk-play{border:none;background:#22c55e;color:#03150a;font-size:14px;border-radius:999px;width:34px;height:34px;cursor:pointer}" +
      ".kpk-play:disabled{background:#555;color:#999;cursor:not-allowed}" +
      ".kpk-open{border:none;background:#f59e0b;color:#2b1703;font-size:14px;border-radius:999px;width:34px;height:34px;cursor:pointer}" +
      ".kpk-gear{border:none;background:#3b82f6;color:#031233;font-size:14px;border-radius:999px;width:34px;height:34px;cursor:pointer}" +
      ".kpk-panel{position:fixed;right:16px;bottom:70px;background:#0b1020;color:#e8ecff;border:1px solid #1f2a44;box-shadow:0 6px 22px rgba(0,0,0,.45);border-radius:12px;padding:12px;width:320px;z-index:2147483647}" +
      ".kpk-panel-title{font-weight:600;margin-bottom:8px}" +
      ".kpk-row{display:flex;gap:8px;margin-top:8px}" +
      ".kpk-input{flex:1;padding:8px 10px;background:#0f1730;color:#e8ecff;border:1px solid #27365c;border-radius:8px}" +
      ".kpk-add,.kpk-quick{border:1px solid #27365c;background:#1a2a52;color:#e8ecff;padding:8px 10px;border-radius:8px;cursor:pointer}" +
      ".kpk-sites-list{display:flex;flex-direction:column;gap:6px;max-height:160px;overflow:auto;padding:6px 0}" +
      ".kpk-site-item{display:flex;align-items:center;justify-content:space-between;background:#0f1730;border:1px solid #27365c;border-radius:8px;padding:6px 8px}" +
      ".kpk-pill{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\\\"Liberation Mono\\\",\\\"Courier New\\\",monospace;font-size:12px;background:#15224a;padding:3px 6px;border-radius:6px}" +
      ".kpk-remove{border:none;background:transparent;color:#93a5d1;font-size:18px;cursor:pointer}.kpk-empty{color:#93a5d1}" +
      ".kpk-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;border:1px solid #27365c;padding:10px 14px;border-radius:10px;z-index:2147483647;box-shadow:0 10px 24px rgba(0,0,0,0.45);pointer-events:none;font-size:14px;display:none}";
    var style = document.createElement('style');
    style.id = 'kpk-overlay-styles';
    style.textContent = css;
    document.documentElement.appendChild(style);
  
    // Inline overlay
    (function () {
      'use strict';
  
      var BACKEND_URL = window.KPK_BACKEND_URL || 'http://localhost:8000';
      var POLL_INTERVAL_MS = 5000;
      var STORAGE_KEY = 'KPK_ALLOWED_SITES';
  
      var container = document.createElement('div');
      container.id = 'kpk-overlay-container';
      container.setAttribute('aria-live', 'polite');
      document.documentElement.appendChild(container);
  
      var bubble = document.createElement('div');
      bubble.className = 'kpk-bubble';
  
      var avatar = document.createElement('div');
      avatar.className = 'kpk-avatar';
      avatar.textContent = '🐶';
  
      var textEl = document.createElement('div');
      textEl.className = 'kpk-text';
      textEl.textContent = 'Disabled on this site. Click ⚙️ to enable.';
  
      var button = document.createElement('button');
      button.className = 'kpk-play';
      button.textContent = '▶️';
      button.disabled = true;
      var openBtn = document.createElement('button');
      openBtn.className = 'kpk-open';
      openBtn.title = 'Open audio in new tab';
      openBtn.textContent = '🔊';
      openBtn.disabled = true;
  
      var gear = document.createElement('button');
      gear.className = 'kpk-gear';
      gear.title = 'Settings';
      gear.textContent = '⚙️';
  
      var audio = new Audio();
      audio.preload = 'auto';
      var attemptedAuto = false;
      button.addEventListener('click', function () {
        if (audio.src) { audio.currentTime = 0; audio.play().catch(function () {}); }
      });
      openBtn.addEventListener('click', function(){ if (audio.src) { try { window.open(audio.src, '_blank', 'noopener'); } catch (_) {} } });
  
      bubble.appendChild(avatar);
      bubble.appendChild(textEl);
      bubble.appendChild(button);
      bubble.appendChild(openBtn);
      bubble.appendChild(gear);
      container.appendChild(bubble);
      // Toast helper only (no fullscreen overlays)
      var toast = document.createElement('div'); toast.className = 'kpk-toast'; toast.style.display = 'none'; container.appendChild(toast);
      var toastTimer = null; function showToast(msg){ toast.textContent = msg; toast.style.display = 'block'; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toast.style.display = 'none'; }, 3000); }
      function enterSpeaking(){} function exitSpeaking(){}
      audio.addEventListener('play', enterSpeaking);
      audio.addEventListener('ended', function(){ setTimeout(exitSpeaking, 250); });
      audio.addEventListener('pause', function(){ setTimeout(exitSpeaking, 250); });

  
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
        panel.hidden = !panel.hidden; if (!panel.hidden) renderSites();
      });
  
      function loadSites() {
        try {
          if (window.KPK_STORAGE && typeof window.KPK_STORAGE.getAllowedSites === 'function') {
            var g = window.KPK_STORAGE.getAllowedSites(); if (Array.isArray(g)) return g.slice();
          }
        } catch (_) {}
        try {
          var v = localStorage.getItem(STORAGE_KEY);
          if (!v && Array.isArray(window.KPK_ALLOWED_SITES)) return window.KPK_ALLOWED_SITES.slice();
          return v ? JSON.parse(v) : [];
        } catch (_) { return []; }
      }
      function saveSites(list) {
        try { if (window.KPK_STORAGE && typeof window.KPK_STORAGE.setAllowedSites === 'function') { window.KPK_STORAGE.setAllowedSites(list); } } catch (_) {}
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
      }
      function normalize(pattern) { return String(pattern || '').trim(); }
      function matches(hostname, pattern) {
        pattern = normalize(pattern); if (!pattern) return false;
        if (pattern.includes('/')) return (location.href.indexOf(pattern) !== -1);
        if (pattern.startsWith('*.')) { var suffix = pattern.slice(1); return hostname.endsWith(suffix); }
        return hostname === pattern || hostname.endsWith('.' + pattern);
      }
      function isAllowedHere() {
        var sites = loadSites(); var host = location.hostname;
        for (var i = 0; i < sites.length; i++) { if (matches(host, sites[i])) return true; }
        return false;
      }
      function renderSites() {
        var list = loadSites(); sitesList.innerHTML = '';
        if (!list.length) { var empty = document.createElement('div'); empty.className = 'kpk-empty'; empty.textContent = 'No sites added.'; sitesList.appendChild(empty); }
        else { list.forEach(function (p, idx) {
          var pill = document.createElement('span'); pill.className = 'kpk-pill'; pill.textContent = p;
          var x = document.createElement('button'); x.className = 'kpk-remove'; x.textContent = '×'; x.title = 'Remove';
          x.addEventListener('click', function () { var arr = loadSites(); arr.splice(idx, 1); saveSites(arr); renderSites(); updateEnabledState(); });
          var item = document.createElement('div'); item.className = 'kpk-site-item'; item.appendChild(pill); item.appendChild(x); sitesList.appendChild(item);
        }); }
      }
      addBtn.addEventListener('click', function () {
        var val = normalize(input.value); if (!val) return;
        var arr = loadSites(); if (arr.indexOf(val) === -1) { arr.push(val); saveSites(arr); input.value = ''; renderSites(); updateEnabledState(); }
      });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') addBtn.click(); });
      quickBtn.addEventListener('click', function () {
        var host = location.hostname; var wildcard = '*.' + host.split('.').slice(-2).join('.');
        var candidate = host.split('.').length > 2 ? wildcard : host;
        var arr = loadSites(); if (arr.indexOf(candidate) === -1) { arr.push(candidate); saveSites(arr); renderSites(); updateEnabledState(); }
      });
  
      var lastSentHash = '';
      var intervalId = null; var debounceTimer = null;
      function startPolling() {
        if (intervalId) return; textEl.textContent = 'സ്കാൻ ചെയ്യുന്നു…'; analyzeNow();
        intervalId = setInterval(analyzeNow, POLL_INTERVAL_MS);
        window.addEventListener('scroll', debouncedAnalyze, { passive: true });
        document.addEventListener('selectionchange', debouncedAnalyze);
      }
      function stopPolling() {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
        window.removeEventListener('scroll', debouncedAnalyze, { passive: true });
        document.removeEventListener('selectionchange', debouncedAnalyze);
      }
      function updateEnabledState() {
        if (isAllowedHere()) { startPolling(); }
        else { stopPolling(); textEl.textContent = 'Disabled on this site. Click ⚙️ to enable.'; button.disabled = true; }
      }
      function hashString(str) { var hash = 5381; for (var i = 0; i < str.length; i++) { hash = ((hash << 5) + hash) + str.charCodeAt(i); hash = hash & hash; } return String(hash); }
      function visibleText() { var t = (document.body && document.body.innerText) ? document.body.innerText : ''; t = t.replace(/\s+/g, ' ').trim(); if (t.length > 3000) t = t.slice(0, 3000); return t; }
      function analyzeNow() {
        var text = visibleText(); if (!text) return; var h = hashString(text); if (h === lastSentHash) return; lastSentHash = h;
        textEl.textContent = 'സ്കാൻ ചെയ്യുന്നു…'; button.disabled = true; openBtn.disabled = true;
        fetch(BACKEND_URL.replace(/\/$/, '') + '/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text }) })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data && data.dialogue) { textEl.textContent = data.dialogue + ' (' + Math.round(data.score) + ')'; } else { textEl.textContent = 'ഫലം ലഭ്യമല്ല'; }
            if (data && data.audio_url) {
              audio.src = data.audio_url; button.disabled = false; openBtn.disabled = false;
              if (location.protocol === 'http:' && isAllowedHere() && !attemptedAuto) {
                attemptedAuto = true; audio.currentTime = 0; audio.play().catch(function(){ showToast('🐶 Tap ▶️ or 🔊 to play'); });
              }
            } else { button.disabled = true; openBtn.disabled = true; }
          })
          .catch(function () { textEl.textContent = 'ബന്ധം പിഴച്ചു'; button.disabled = true; openBtn.disabled = true; });
      }
      function debouncedAnalyze() { if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(analyzeNow, 800); }
      updateEnabledState();
    })();
  })();