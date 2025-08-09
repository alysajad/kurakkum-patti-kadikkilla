## Kurakkum Patti Kadikkilla — MVP

Tagline: “കുരയ്ക്കും പട്ടി കടിക്കില്ല” — The threat assessment bot that barks more than it bites.

A playful overlay chatbot that scans visible page text, assigns a tongue‑in‑cheek threat/noise score, replies with a funny Malayalam dialogue, and plays Malayalam TTS audio.

### Quickstart (Local)

- Backend: FastAPI + gTTS (Malayalam)
- Frontend: Minimal overlay injected on any page (or test via `frontend/index.html`)

#### 1) Backend

```powershell
cd kurakkum-patti-kadikkilla/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

- Health check: `http://localhost:8000/health`
- Audio served from: `http://localhost:8000/audio/...`

#### 2) Frontend (Local demo)

Open `frontend/index.html` in your browser, or serve the folder:

```powershell
cd ..\frontend
python -m http.server 5173
```

Visit `http://localhost:5173` and you should see the overlay in the bottom‑right.

### Allowlist Settings (Only run on selected sites)

- Click the ⚙️ button on the bubble to open settings.
- Add domains like `twitter.com`, `*.news.example` or paste any substring (e.g., `https://example.com/community`).
- Click "Enable on this site" for a quick add.
- The overlay will only scan when the current page matches your list.

### Run on every site without an extension (Userscript)

Use Tampermonkey/Violentmonkey to inject the overlay on every page at browser startup, while the allowlist limits scanning:

```javascript
// ==UserScript==
// @name         Kurakkum Patti Kadikkilla Overlay
// @namespace    kpk
// @version      0.1.0
// @description  Inject overlay on all pages; scan only allowed sites
// @match        *://*/*
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==
(function() {
  'use strict';
  // Configure your backend
  window.KPK_BACKEND_URL = 'https://YOUR_BACKEND';

  // Provide a global storage bridge so the allowlist persists across origins
  window.KPK_STORAGE = {
    getAllowedSites: function() {
      try { return JSON.parse(GM_getValue('KPK_ALLOWED_SITES', '[]')); } catch(e) { return []; }
    },
    setAllowedSites: function(list) {
      GM_setValue('KPK_ALLOWED_SITES', JSON.stringify(list || []));
    }
  };

  // Inject styles and script
  GM_addStyle('@import url("https://YOUR_HOST/styles.css");');
  var s = document.createElement('script');
  s.src = 'https://YOUR_HOST/overlay.js';
  document.documentElement.appendChild(s);
})();
```

Replace `YOUR_BACKEND` with your API URL and `YOUR_HOST` with where you host `overlay.js` and `styles.css`.

#### 3) Use as a Bookmarklet (optional)

Host `overlay.js` and `styles.css` somewhere, then create a bookmarklet that injects it:

```text
javascript:(function(){var s=document.createElement('link');s.rel='stylesheet';s.href='https://YOUR_HOST/styles.css';document.documentElement.appendChild(s);var j=document.createElement('script');j.src='https://YOUR_HOST/overlay.js';j.onload=function(){window.KPK_BACKEND_URL='https://YOUR_BACKEND';};document.documentElement.appendChild(j);})();
```

### API

- POST `/analyze` → `{ dialogue, audio_url, score, category, matched_keywords }`
- GET `/health` → `{ status: 'ok' }`

### Scoring Logic

- Start 30
- +15 per danger keyword occurrence (e.g., "ബോംബ്", "വെടിവെപ്പ്")
- -10 per noise keyword occurrence (e.g., "പൊളിച്ചു", "ബ്രേക്കിങ് ന്യൂസ്")
- -5 per drama unit (exclamation groups, elongated vowels, hype words)
- Clamp 0..100, categorize: low < 35, medium < 70, else high

### Notes

- Malayalam TTS uses `gTTS` (`lang=ml`). Files are written to `backend/audio/` and served at `/audio/...`.
- CORS is open so the overlay can call the backend from any site. Lock this down if deploying publicly.
- This is an entertainment project; do not rely on the score for real threat assessment.

### Deploy

- Backend: Render / Railway / Fly.io / Heroku
- Frontend: Any static host or embed via bookmarklet/Tampermonkey

## Push to GitHub

```powershell
cd C:\Users\alisa\OneDrive\Desktop\bot\kurakkum-patti-kadikkilla
git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kurakkum-patti-kadikkilla.git
git add .
git commit -m "feat: initial MVP (FastAPI, overlay, userscript, metrics)"
git push -u origin main
```

Recommended `.gitignore` (create at repo root):

```
.venv/
backend/.venv/
**/__pycache__/
*.pyc
backend/audio/
.DS_Store
Thumbs.db
.env
*.log
```


