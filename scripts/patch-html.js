const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const pwaTags = `<link rel="icon" type="image/png" sizes="512x512" href="/pwa-512x512.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/pwa-192x192.png" />
<link rel="manifest" href="/manifest.json" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Spendie" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`;

html = html.replace(
  '<link rel="icon" href="/favicon.ico" /></head>',
  `${pwaTags}</head>`
);

fs.writeFileSync(htmlPath, html);
console.log('✓ PWA tags + Spendie icons injected into dist/index.html');
