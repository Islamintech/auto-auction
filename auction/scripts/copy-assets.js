/**
 * Copies non-TypeScript runtime assets into dist/ after `tsc`.
 *
 * `tsc` only emits compiled .js files, so the EJS `views/` and the static
 * `public/` folders never reach dist/. When the app runs from dist/ in
 * production, `path.join(__dirname, 'views' | 'public')` would point at
 * missing folders and the admin panel would fail to render. This script
 * mirrors those folders into dist/ so the production build is self-contained.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assets = ['views', 'public'];

for (const asset of assets) {
    const from = path.join(root, 'src', asset);
    const to = path.join(root, 'dist', asset);

    if (!fs.existsSync(from)) {
        console.warn(`[copy-assets] skip: ${from} does not exist`);
        continue;
    }

    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
    console.log(`[copy-assets] copied ${asset} -> dist/${asset}`);
}
