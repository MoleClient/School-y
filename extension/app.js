(async () => {
  const $ = id => document.getElementById(id);
  const setupScreen   = $('setup-screen');
  const browserScreen = $('browser-screen');
  const frame         = $('browser-frame');
  const homePage      = $('home-page');
  const urlBar        = $('url-bar');
  const lockIcon      = $('lock-icon');

  // ── Load UV config into page scope ──────────────────────────────────────
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  await loadScript('/uv/uv.bundle.js');
  await loadScript('/uv/uv.config.js');

  // ── Service Worker registration ──────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      if (reg.installing) {
        await new Promise(res => {
          reg.installing.addEventListener('statechange', function () {
            if (this.state === 'activated') res();
          });
        });
      }
    } catch (e) {
      console.warn('[SW] Registration failed:', e);
    }
  }

  // ── BareMux / Epoxy transport ────────────────────────────────────────────
  async function initTransport(wispUrl) {
    try {
      // Use same dynamic import approach as main app
      const importFn = new Function('url', 'return import(url)');
      const bareModule = await importFn('/baremux/index.mjs');
      const BareMuxConnection = bareModule.BareMuxConnection;
      if (!BareMuxConnection) throw new Error('BareMuxConnection not found');

      const conn = new BareMuxConnection('/baremux/worker.js');
      await conn.setTransport('/epoxy/index.mjs', [{ wisp: wispUrl }]);
      return true;
    } catch (e) {
      console.warn('[Transport] Init failed:', e);
      return false;
    }
  }

  // ── Storage helpers ──────────────────────────────────────────────────────
  function getWispUrl() {
    return new Promise(res => chrome.storage.local.get(['wispUrl'], r => res(r.wispUrl || null)));
  }
  function saveWispUrl(url) {
    return new Promise(res => chrome.storage.local.set({ wispUrl: url }, res));
  }

  // ── Show / hide screens ──────────────────────────────────────────────────
  function showSetup() {
    setupScreen.classList.remove('hidden');
    browserScreen.classList.add('hidden');
  }
  function showBrowser() {
    setupScreen.classList.add('hidden');
    browserScreen.classList.remove('hidden');
  }

  // ── URL helpers ───────────────────────────────────────────────────────────
  function toProxyUrl(raw) {
    let url = raw.trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) {
      // already a full URL
    } else if (/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}(\/.*)?$/i.test(url) && !url.includes(' ')) {
      url = 'https://' + url;
    } else {
      url = 'https://duckduckgo.com/?q=' + encodeURIComponent(url);
    }
    const cfg = window.__uv$config;
    return cfg ? cfg.prefix + cfg.encodeUrl(url) : url;
  }

  function getDisplayUrl() {
    try {
      const src = frame.contentWindow?.location?.href;
      if (!src) return null;
      const cfg = window.__uv$config;
      if (cfg && src.includes(cfg.prefix)) {
        const encoded = src.split(cfg.prefix)[1]?.split('?')[0];
        if (encoded) return cfg.decodeUrl(encoded);
      }
    } catch {}
    return null;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigate(input) {
    const proxyUrl = toProxyUrl(input);
    if (!proxyUrl) return;
    homePage.style.display = 'none';
    frame.classList.add('visible');
    frame.src = proxyUrl;

    const isHttps = /^https/i.test(input.trim()) || !/^http/i.test(input.trim());
    lockIcon.textContent = isHttps ? '🔒' : '🔓';
    urlBar.value = input.trim();
  }

  function goHome() {
    frame.classList.remove('visible');
    frame.src = 'about:blank';
    homePage.style.display = '';
    urlBar.value = '';
    lockIcon.textContent = '🔒';
  }

  // ── Toolbar events ────────────────────────────────────────────────────────
  $('btn-back').onclick    = () => frame.contentWindow?.history.back();
  $('btn-forward').onclick = () => frame.contentWindow?.history.forward();
  $('btn-reload').onclick  = () => {
    if (frame.src && frame.src !== 'about:blank') frame.contentWindow?.location.reload();
  };
  $('btn-home').onclick    = goHome;
  $('btn-settings').onclick = async () => {
    showSetup();
    const cur = await getWispUrl();
    if (cur) $('wisp-input').value = cur;
  };

  urlBar.addEventListener('keydown', e => {
    if (e.key === 'Enter') navigate(urlBar.value);
  });

  frame.addEventListener('load', () => {
    const display = getDisplayUrl();
    if (display) {
      urlBar.value = display;
      lockIcon.textContent = display.startsWith('https') ? '🔒' : '🔓';
    }
  });

  // ── Home page ─────────────────────────────────────────────────────────────
  $('search-form').addEventListener('submit', e => {
    e.preventDefault();
    const val = $('search-input').value.trim();
    if (val) { navigate(val); $('search-input').value = ''; }
  });

  document.querySelectorAll('.quick-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.url);
    });
  });

  // ── Setup screen ──────────────────────────────────────────────────────────
  $('save-setup').onclick = async () => {
    let url = $('wisp-input').value.trim();
    if (!url) { alert('Please enter a server URL.'); return; }
    if (!url.startsWith('ws')) { alert('URL must start with ws:// or wss://'); return; }
    if (!url.endsWith('/')) url += '/';
    await saveWispUrl(url);
    const ok = await initTransport(url);
    if (ok) {
      showBrowser();
    } else {
      alert('Could not connect to that server. Check the URL and try again.');
    }
  };

  $('try-local').onclick = async () => {
    const localUrl = 'ws://localhost:5000/wisp/';
    await saveWispUrl(localUrl);
    const ok = await initTransport(localUrl);
    if (ok) {
      showBrowser();
    } else {
      alert('No local server found at localhost:5000.\n\nMake sure School-y is running on your computer (double-click School-y.vbs or start.sh), or enter your deployed server URL instead.');
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  const wispUrl = await getWispUrl();
  if (!wispUrl) {
    showSetup();
  } else {
    const ok = await initTransport(wispUrl);
    if (ok) {
      showBrowser();
    } else {
      showSetup();
      $('wisp-input').value = wispUrl;
    }
  }
})();
