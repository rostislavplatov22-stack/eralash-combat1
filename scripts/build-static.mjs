import { mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
copyFileSync(resolve('index.html'), resolve(dist, 'index.html'));
console.log('Static build complete: dist/index.html');
