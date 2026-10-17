#!/usr/bin/env node
/**
 * Vérifie les fichiers de traduction (src/assets/i18n/*.json) :
 *  - toutes les langues ont exactement les mêmes clés que fr.json (référence) ;
 *  - les variables ({{x}}) et les structures ICU (plural) sont identiques ;
 *  - chaque clé littérale utilisée dans le code (src/app/**) existe dans fr.json.
 * Code de sortie 1 en cas d'erreur (utilisé par `npm run check:i18n` et la CI).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const i18nDir = join(root, 'src/assets/i18n');
const appDir = join(root, 'src/app');
const REFERENCE = 'fr';

const flatten = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    value !== null && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)]],
  );

const placeholders = (text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
const icuShape = (text) => [...text.matchAll(/\{(\w+),\s*plural,/g)].map((m) => m[1]).join(',') + '|' + [...text.matchAll(/(=\d+|other)\s*\{/g)].map((m) => m[1]).join(',');

const errors = [];
const load = (lang) => new Map(flatten(JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf8'))));

const reference = load(REFERENCE);
const langs = readdirSync(i18nDir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

for (const lang of langs) {
  if (lang === REFERENCE) continue;
  const current = load(lang);
  for (const key of reference.keys()) if (!current.has(key)) errors.push(`[${lang}] clé manquante : ${key}`);
  for (const key of current.keys()) if (!reference.has(key)) errors.push(`[${lang}] clé inconnue : ${key}`);
  for (const [key, value] of current) {
    const base = reference.get(key);
    if (base === undefined) continue;
    if (value.trim() === '') errors.push(`[${lang}] valeur vide : ${key}`);
    if (placeholders(value) !== placeholders(base)) errors.push(`[${lang}] variables {{…}} différentes : ${key}`);
    if (icuShape(value) !== icuShape(base)) errors.push(`[${lang}] structure plural différente : ${key}`);
  }
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const KEY = /['"]([A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)+)['"]/g;
for (const file of walk(appDir).filter((f) => /\.(ts|html)$/.test(f) && !f.endsWith('.spec.ts'))) {
  const content = readFileSync(file, 'utf8');
  for (const [, key] of content.matchAll(KEY)) {
    if (!reference.has(key) && ![...reference.keys()].some((k) => k.startsWith(`${key}.`))) {
      errors.push(`[code] clé absente de ${REFERENCE}.json : ${key} (${file.replace(root + '/', '')})`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problème(s) de traduction.`);
  process.exit(1);
}
console.log(`i18n OK — ${reference.size} clés × ${langs.length} langues (${langs.join(', ')}).`);
