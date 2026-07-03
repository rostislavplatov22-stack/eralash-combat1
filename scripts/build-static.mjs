import { mkdirSync, copyFileSync, existsSync, rmSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
copyFileSync(resolve('index.html'), resolve(dist, 'index.html'));
if (existsSync(resolve('assets'))) cpSync(resolve('assets'), resolve(dist, 'assets'), { recursive: true });
console.log('Static build complete: dist/index.html + assets');
