import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyStaticFiles() {
  const staticFiles = [
    { src: 'manifest.json', dest: 'dist/manifest.json' },
    { src: 'src/popup/popup.html', dest: 'dist/popup.html' },
    { src: 'src/popup/popup.css', dest: 'dist/popup.css' }
  ];

  for (const item of staticFiles) {
    const srcPath = path.join(__dirname, item.src);
    const destPath = path.join(__dirname, item.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const buildOptions = [
  {
    entryPoints: ['src/background/index.ts'],
    outfile: 'dist/background.js',
    bundle: true,
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
  },
  {
    entryPoints: ['src/content/index.ts'],
    outfile: 'dist/content.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
  },
  {
    entryPoints: ['src/page-hook/index.ts'],
    outfile: 'dist/page-hook.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
  },
  {
    entryPoints: ['src/popup/popup.ts'],
    outfile: 'dist/popup.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
  }
];

async function run() {
  copyStaticFiles();

  if (isWatch) {
    console.log('[Build] Starting watch mode...');
    const contexts = await Promise.all(
      buildOptions.map(opt => esbuild.context(opt))
    );
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('[Build] Watching for changes in src/ and manifest.json...');

    // Also watch static files
    fs.watch(path.join(__dirname, 'manifest.json'), () => copyStaticFiles());
    const popupDir = path.join(__dirname, 'src/popup');
    if (fs.existsSync(popupDir)) {
      fs.watch(popupDir, () => copyStaticFiles());
    }
  } else {
    console.log('[Build] Building extension bundles...');
    const startTime = Date.now();
    await Promise.all(buildOptions.map(opt => esbuild.build(opt)));
    console.log(`[Build] Build completed in ${Date.now() - startTime}ms.`);
  }
}

run().catch((err) => {
  console.error('[Build Error]:', err);
  process.exit(1);
});
