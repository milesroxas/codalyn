import { readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import * as esbuild from 'esbuild';

// Config output
const BUILD_DIRECTORY = 'dist';
const PRODUCTION = process.env.NODE_ENV === 'production';

// Config entrypoint files
const ENTRY_POINTS = ['src/index.ts'];

// Config dev serving
const LIVE_RELOAD = !PRODUCTION;
const SERVE_PORT = 3005;
const SERVE_ORIGIN = `http://localhost:${SERVE_PORT}`;

// Create context
const context = await esbuild.context({
  bundle: true,
  entryPoints: ENTRY_POINTS,
  outdir: BUILD_DIRECTORY,
  minify: PRODUCTION,
  sourcemap: !PRODUCTION,
  target: PRODUCTION ? 'es2020' : 'esnext',
  inject: LIVE_RELOAD ? ['./bin/live-reload.js'] : undefined,
  define: {
    SERVE_ORIGIN: JSON.stringify(SERVE_ORIGIN),
  },
  splitting: true,
  format: 'esm',
  chunkNames: 'chunks/[name]-[hash]',
});

// Build files in prod
if (PRODUCTION) {
  await context.rebuild();
  context.dispose();
}

// Watch and serve files in dev
else {
  await context.watch();
  await context
    .serve({
      servedir: BUILD_DIRECTORY,
      port: SERVE_PORT,
    })
    .then(logServedFiles);
}

/**
 * Logs information about the files that are being served during local development.
 */
function logServedFiles() {
  /**
   * Recursively gets all files in a directory.
   * @param {string} dirPath
   * @returns {string[]} An array of file paths.
   */
  const getFiles = (dirPath) => {
    const files = readdirSync(dirPath, { withFileTypes: true }).map((dirent) => {
      const path = join(dirPath, dirent.name);
      return dirent.isDirectory() ? getFiles(path) : path;
    });

    return files.flat();
  };

  const files = getFiles(BUILD_DIRECTORY);

  const cssFiles = [];
  const jsFiles = [];

  files.forEach((file) => {
    if (file.endsWith('.map')) return;

    const paths = file.split(sep);
    paths[0] = SERVE_ORIGIN;
    const location = paths.join('/');

    if (location.includes('/chunks/')) return;

    if (location.endsWith('.css')) {
      cssFiles.push(location);
    } else {
      jsFiles.push(location);
    }
  });

  // Generate CSS snippet for <head>
  const cssSnippet = `<script>
(function () {
  var forceLocal = /(^|[?&])useLocal=1(&|$)/.test(location.search) || 
                   localStorage.getItem('codalyn_useLocal') === '1';
  var isLocalHost = /^(localhost|127\\\\.0\\\\.0\\\\.1|::1)$/.test(location.hostname);
  var useLocal = forceLocal || isLocalHost;

  function loadCSS(local, cdn) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    var cacheBuster = useLocal ? '?t=' + Date.now() : '';
    link.href = useLocal ? local + cacheBuster : cdn;
    link.onerror = function () {
      if (this.href.indexOf(local) === 0) {
        console.warn('[codalyn] CSS localhost failed, using CDN:', cdn);
        this.onerror = null;
        this.href = cdn;
      } else {
        console.error('[codalyn] CSS failed from CDN:', cdn);
      }
    };
    document.head.appendChild(link);
  }

${cssFiles
  .map((localUrl) => {
    const cdnUrl = localUrl.replace(
      SERVE_ORIGIN,
      'https://cdn.jsdelivr.net/npm/@codalyn/loadout@latest/dist'
    );
    return `  loadCSS('${localUrl}', '${cdnUrl}');`;
  })
  .join('\n')}
})();
</script>`;

  // Generate JS snippet for before </body>
  const jsSnippet = `<!-- Toggle (shows when localhost dev server is reachable) -->
<script>
(function () {
  var KEY = 'codalyn_useLocal';

  // Check if localhost dev server is running
  fetch('${SERVE_ORIGIN}/index.js?t=' + Date.now(), { method: 'HEAD', mode: 'no-cors' })
    .then(function() {
      // Localhost is running, show toggle button
      var current = localStorage.getItem(KEY) === '1';

      console.log('[codalyn] Toggle init. useLocal =', current ? 'ON (localhost)' : 'OFF (CDN)');

      var btn = document.createElement('button');
      btn.textContent = current ? 'Codalyn: Local' : 'Codalyn: CDN';
      Object.assign(btn.style, {
        position: 'fixed', right: '12px', bottom: '12px', zIndex: 99999,
        padding: '6px 10px', font: '12px system-ui', border: '1px solid #ccc',
        borderRadius: '8px', background: '#fff', cursor: 'pointer'
      });

      btn.onclick = function () {
        var isOn = localStorage.getItem(KEY) === '1';
        if (isOn) {
          localStorage.removeItem(KEY);
          console.log('[codalyn] Switching to CDN, reloading...');
        } else {
          localStorage.setItem(KEY, '1');
          console.log('[codalyn] Switching to localhost, reloading...');
        }
        location.reload();
      };

      document.body.appendChild(btn);
    })
    .catch(function() {
      // Localhost not running, don't show toggle
      console.log('[codalyn] Localhost dev server not detected');
    });
})();
</script>

<!-- Loader (works on all domains) -->
<script>
(function () {
  function loadScript(src, onSuccess, onError) {
    var script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.onload = onSuccess;
    script.onerror = onError;
    document.body.appendChild(script);
  }

  var host = location.hostname;
  var forceLocal = /(^|[?&])useLocal=1(&|$)/.test(location.search) ||
                   localStorage.getItem('codalyn_useLocal') === '1';
  var isLocalHost = /^(localhost|127\\\\.0\\\\.0\\\\.1|::1)$/.test(host);
  var useLocal = forceLocal || isLocalHost;

  console.log('[codalyn] Loading JS with useLocal:', useLocal);

  // Cache busting for localhost (dev) - always fresh
  var cacheBuster = useLocal ? '?t=' + Date.now() : '';
${jsFiles
  .map((localUrl) => {
    const cdnUrl = localUrl.replace(
      SERVE_ORIGIN,
      'https://cdn.jsdelivr.net/npm/@codalyn/loadout@latest/dist'
    );
    return `
  loadScript(
    useLocal ? '${localUrl}' + cacheBuster : '${cdnUrl}',
    function () { console.log('[codalyn] JS loaded OK'); },
    function () {
      if (useLocal) {
        console.warn('[codalyn] Localhost failed, trying CDN:', '${cdnUrl}');
        loadScript(
          '${cdnUrl}',
          function () { console.log('[codalyn] JS loaded from CDN after fallback'); },
          function () { console.error('[codalyn] JS failed from CDN as well'); }
        );
      } else {
        console.error('[codalyn] JS failed from CDN');
      }
    }
  );`;
  })
  .join('')}
})();
</script>`;

  // ANSI color codes for styling
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    dim: '\x1b[2m',
  };

  const separator = `${colors.dim}${'─'.repeat(80)}${colors.reset}`;

  console.log(`\n${separator}`);
  console.log(
    `${colors.bright}${colors.cyan}📦 Development server running on${colors.reset}`,
    `${colors.bright}${SERVE_ORIGIN}${colors.reset}`
  );
  console.log(`${separator}\n`);

  console.log(`${colors.bright}${colors.green}🔗 Add to <head>:${colors.reset}`);
  console.log(separator);
  console.log(`${colors.yellow}${cssSnippet}${colors.reset}`);
  console.log(`${separator}\n`);

  console.log(`${colors.bright}${colors.green}📜 Add before </body>:${colors.reset}`);
  console.log(separator);
  console.log(`${colors.yellow}${jsSnippet}${colors.reset}`);
  console.log(`${separator}\n`);
}
