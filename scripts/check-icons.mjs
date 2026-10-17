#!/usr/bin/env node
/**
 * Vérifie que toute icône Ionicons référencée par son nom dans l'application
 * est bien enregistrée dans `src/app/core/icons.ts` (APP_ICONS).
 *
 * Sont détectés : `name="…"`, `iconName="…"` / `[iconName]="'…'"` dans les gabarits, et les
 * littéraux `'…-outline'` / `'…-sharp'` dans le code TypeScript. Les icônes enregistrées mais
 * inutilisées sont signalées en avertissement (elles alourdissent inutilement le bundle).
 * Code de sortie 1 si une icône utilisée n'est pas enregistrée.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const appDir = join(root, 'src/app');

const iconsSource = readFileSync(join(appDir, 'core/icons.ts'), 'utf8');
const mapBody = iconsSource.slice(iconsSource.indexOf('export const APP_ICONS'), iconsSource.indexOf('};', iconsSource.indexOf('export const APP_ICONS')));
const registered = new Set(
  [...mapBody.matchAll(/^\s*(?:'([a-z0-9-]+)'|([a-z][A-Za-z0-9]*))(?::\s*[A-Za-z0-9]+)?,\s*$/gm)].map((m) => m[1] ?? m[2]),
);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const used = new Map();
const remember = (name, file) => used.set(name, [...(used.get(name) ?? []), file.replace(`${root}/`, '')]);

for (const file of walk(appDir).filter((f) => /\.(html|ts)$/.test(f) && !f.endsWith('.spec.ts') && !f.endsWith('core/icons.ts'))) {
  const content = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    for (const [, name] of content.matchAll(/<ion-icon[^>]*?\sname="([a-z0-9-]+)"/g)) remember(name, file);
    for (const [, name] of content.matchAll(/\siconName="([a-z0-9-]+)"/g)) remember(name, file);
  }
  for (const [, name] of content.matchAll(/['"]([a-z0-9]+(?:-[a-z0-9]+)*-(?:outline|sharp))['"]/g)) remember(name, file);
  // Noms choisis dynamiquement dans le code (ex. 'star' | 'star-half') : tout littéral égal à une icône enregistrée compte.
  if (file.endsWith('.ts')) for (const name of registered) if (new RegExp(`['"]${name}['"]`).test(content)) remember(name, file);
}

const missing = [...used].filter(([name]) => !registered.has(name));
const unused = [...registered].filter((name) => !used.has(name));

if (unused.length) console.warn(`Avertissement — icônes enregistrées mais non repérées dans le code : ${unused.join(', ')}`);

if (missing.length) {
  for (const [name, files] of missing) console.error(`Icône non enregistrée : "${name}" (${[...new Set(files)].join(', ')})`);
  process.exit(1);
}
console.log(`icônes OK — ${used.size} utilisées, ${registered.size} enregistrées.`);
