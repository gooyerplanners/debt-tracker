import { mkdir, copyFile } from 'node:fs/promises';
const files = ['index.html', 'style.css', 'app.js', 'model.js', 'sw.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png'];
await mkdir('dist/icons', { recursive: true });
await Promise.all(files.map(file => copyFile(file, `dist/${file}`)));
await copyFile('.nojekyll', 'dist/.nojekyll');
console.log('Built static website in dist/');
