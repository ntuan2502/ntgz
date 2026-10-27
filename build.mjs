import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function buildCss() {
  console.log('[Build] Compiling Tailwind CSS...');
  const inputCss = path.join(__dirname, 'src/styles/globals.css');
  const outputCss = path.join(distDir, 'tailwind.css');
  const compiledCss = path.join(__dirname, 'src/styles/tailwind.compiled.css');

  execSync(`pnpm exec tailwindcss -i "${inputCss}" -o "${outputCss}" -m`, {
    stdio: 'inherit',
    cwd: __dirname,
  });

  if (fs.existsSync(outputCss)) {
    fs.copyFileSync(outputCss, compiledCss);
    fs.copyFileSync(outputCss, path.join(distDir, 'popup.css'));
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyStaticFiles() {
  const staticFiles = [
    { src: 'manifest.json', dest: 'dist/manifest.json' },
    { src: 'src/popup/popup.html', dest: 'dist/popup.html' },
  ];

  for (const item of staticFiles) {
    const srcPath = path.join(__dirname, item.src);
    const destPath = path.join(__dirname, item.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  copyDirRecursive(path.join(__dirname, 'src/images'), path.join(distDir, 'images'));
}

const commonConfig = {
  bundle: true,
  target: 'es2022',
  sourcemap: true,
  loader: {
    '.css': 'text',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(isWatch ? 'development' : 'production'),
  },
};

const buildOptions = [
  {
    ...commonConfig,
    entryPoints: ['src/background/index.ts'],
    outfile: 'dist/background.js',
    format: 'esm',
  },
  {
    ...commonConfig,
    entryPoints: ['src/content/index.ts'],
    outfile: 'dist/content.js',
    format: 'iife',
  },
  {
    ...commonConfig,
    entryPoints: ['src/page-hook/index.ts'],
    outfile: 'dist/page-hook.js',
    format: 'iife',
  },
  {
    ...commonConfig,
    entryPoints: ['src/popup/index.tsx'],
    outfile: 'dist/popup.js',
    format: 'iife',
  },
];

async function run() {
  buildCss();
  copyStaticFiles();

  if (isWatch) {
    console.log('[Build] Starting watch mode...');
    const contexts = await Promise.all(
      buildOptions.map((opt) => esbuild.context(opt))
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('[Build] Watching for changes in src/ and manifest.json...');

    // Also watch static files and CSS
    fs.watch(path.join(__dirname, 'manifest.json'), () => copyStaticFiles());
    const popupDir = path.join(__dirname, 'src/popup');
    if (fs.existsSync(popupDir)) {
      fs.watch(popupDir, () => copyStaticFiles());
    }
    const imagesDir = path.join(__dirname, 'src/images');
    if (fs.existsSync(imagesDir)) {
      fs.watch(imagesDir, () => copyStaticFiles());
    }
    const stylesDir = path.join(__dirname, 'src/styles');
    if (fs.existsSync(stylesDir)) {
      fs.watch(stylesDir, () => {
        try {
          buildCss();
        } catch (e) {
          console.error('[CSS Build Error]:', e);
        }
      });
    }
  } else {
    console.log('[Build] Building extension bundles...');
    const startTime = Date.now();
    await Promise.all(buildOptions.map((opt) => esbuild.build(opt)));
    console.log(`[Build] Build completed in ${Date.now() - startTime}ms.`);
  }
}

run().catch((err) => {
  console.error('[Build Error]:', err);
  process.exit(1);
});
