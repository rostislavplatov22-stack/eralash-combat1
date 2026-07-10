#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATCH_ID = '31.4 FINAL COMBAT POLISH';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const patchRoot = path.dirname(fileURLToPath(import.meta.url));

function fail(message) {
  console.error('[31.4 ERROR]', message);
  process.exit(1);
}

function walk(dir, depth = 0) {
  if (depth > 9 || !fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel', 'dist', '.next', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, depth + 1));
    else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') files.push(full);
  }
  return files;
}

function pickIndex() {
  return walk(root)
    .map(file => {
      const text = fs.readFileSync(file, 'utf8');
      let score = Math.min(fs.statSync(file).size / 1000, 3000);
      if (/ERALASH\s*(COMBAT|KOMBAT)/i.test(text)) score += 5000;
      if (/hardCombat311|hard-combat-31-3-runtime|drawPremiumFighterArt|CHARACTER_SELECT_META/.test(text)) score += 12000;
      if (/fighter-ghlum|id:\s*['"]ghlum['"]|GHLUM/i.test(text)) score += 3000;
      return { file, text, score };
    })
    .sort((a, b) => b.score - a.score)
    .find(item => item.score > 5000) || null;
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) fail('Не найдена папка ассетов: ' + src);
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (path.resolve(from) !== path.resolve(to)) fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(root)) fail('Папка проекта не существует: ' + root);
const picked = pickIndex();
if (!picked) fail('Не найден игровой index.html EraLash Combat.');

const indexPath = picked.file;
const projectDir = path.dirname(indexPath);
let source = picked.text;

const backupPath = path.join(projectDir, 'index.before-final-polish-31.4.html');
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, source, 'utf8');

copyDir(path.join(patchRoot, 'assets', 'ghlum312'), path.join(projectDir, 'assets', 'ghlum312'));
fs.copyFileSync(path.join(patchRoot, 'hard-combat-31-4-runtime.js'), path.join(projectDir, 'hard-combat-31-4-runtime.js'));

if (!source.includes(PATCH_ID)) {
  const tag = `\n<!-- ${PATCH_ID} -->\n<script src="./hard-combat-31-4-runtime.js?v=314"></script>\n`;
  source = /<\/body>/i.test(source) ? source.replace(/<\/body>/i, tag + '</body>') : source + tag;
  fs.writeFileSync(indexPath, source, 'utf8');
}

fs.writeFileSync(
  path.join(projectDir, 'FINAL_COMBAT_POLISH_31_4_APPLIED.json'),
  JSON.stringify({ patch: PATCH_ID, index: path.relative(root, indexPath), appliedAt: new Date().toISOString() }, null, 2)
);

console.log('FINAL COMBAT POLISH 31.4 APPLIED');
console.log('index:', indexPath);
