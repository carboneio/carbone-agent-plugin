#!/usr/bin/env node
// Sets the shared version in every plugin manifest and in SKILL.md metadata.version.
// Edits are surgical: only the version value changes, every other byte is kept.
//
// Usage: node scripts/bump-version.mjs <version>     (for example 2.1.0)

import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { ROOT, SEMVER_RE, SKILL_MD, VERSION_JSON_FILES, parseFrontMatter } from './lib.mjs';

const version = process.argv[2];
if (!version || process.argv.length > 3) {
  console.error('Usage: node scripts/bump-version.mjs <version>   (for example 2.1.0)');
  process.exit(2);
}
if (!SEMVER_RE.test(version)) {
  console.error(`"${version}" is not a semver version (MAJOR.MINOR.PATCH, without a leading "v").`);
  process.exit(2);
}

const planned = []; // [file, oldText, newText, oldVersion]

for (const file of VERSION_JSON_FILES) {
  const text = readFileSync(path.join(ROOT, file), 'utf8');
  const data = JSON.parse(text);
  if (typeof data.version !== 'string') fatal(`${file}: no root "version" string`);
  // The root "version" key is the one indented by exactly one level (the file's indent unit).
  const indent = /\n([ \t]+)"/.exec(text)?.[1];
  if (!indent) fatal(`${file}: cannot detect indentation`);
  const re = new RegExp(`(\\n${indent}"version"\\s*:\\s*")((?:[^"\\\\]|\\\\.)*)(")`, 'g');
  const hits = [...text.matchAll(re)];
  if (hits.length !== 1) fatal(`${file}: expected one root "version" line, found ${hits.length}`);
  const updated = text.replace(re, (_, a, _old, c) => a + version + c);
  const check = JSON.parse(updated);
  if (check.version !== version || !isDeepStrictEqual({ ...check, version: data.version }, data))
    fatal(`${file}: the edit changed more than the version; nothing written`);
  planned.push([file, text, updated, data.version]);
}

{
  const file = SKILL_MD;
  const text = readFileSync(path.join(ROOT, file), 'utf8');
  const { data, lines, end } = parseFrontMatter(text);
  const old = data.metadata?.version;
  if (typeof old !== 'string') fatal(`${file}: no metadata.version`);
  const metaStart = lines.findIndex((l, i) => i < end && /^metadata:\s*$/.test(l));
  if (metaStart === -1) fatal(`${file}: no "metadata:" block`);
  let idx = -1;
  for (let i = metaStart + 1; i < end && (lines[i] === '' || /^\s/.test(lines[i])); i++)
    if (/^\s+version:\s/.test(lines[i])) idx = i;
  if (idx === -1) fatal(`${file}: no "version:" line under metadata`);
  const m = /^(\s+version:\s+)(["']?)([^"']*)\2(\s*)$/.exec(lines[idx]);
  if (!m) fatal(`${file}: unexpected metadata.version line: ${lines[idx]}`);
  const quote = m[2] || '"'; // keep the quotes so YAML reads a string, never a number
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const newLines = [...lines];
  newLines[idx] = `${m[1]}${quote}${version}${quote}${m[4]}`;
  const updated = newLines.join(eol);
  const after = parseFrontMatter(updated).data;
  if (after.metadata.version !== version || !isDeepStrictEqual({ ...after, metadata: { ...after.metadata, version: old } }, data))
    fatal(`${file}: the edit changed more than metadata.version; nothing written`);
  if (updated.slice(updated.indexOf(`${eol}---`, 4)) !== text.slice(text.indexOf(`${eol}---`, 4)))
    fatal(`${file}: the edit touched the body; nothing written`);
  planned.push([file, text, updated, old]);
}

let changed = 0;
for (const [file, oldText, newText, oldVersion] of planned) {
  if (oldText === newText) {
    console.log(`  unchanged  ${file} (${oldVersion})`);
    continue;
  }
  writeFileSync(path.join(ROOT, file), newText);
  changed++;
  console.log(`  updated    ${file}: ${oldVersion} -> ${version}`);
}
console.log(changed ? `\nVersion set to ${version} in ${changed} file(s).` : `\nEverything is already at ${version}; no file changed.`);
console.log(`
Before tagging v${version}:
  1. Add a ${version} entry to CHANGELOG.md.
  2. Update extensions.com.openai.publication.release_notes in plugin.json (shown to ChatGPT reviewers and users).
  3. Run npm --prefix scripts run validate (or node scripts/validate.mjs).`);

function fatal(msg) {
  console.error(`bump-version: ${msg}`);
  process.exit(1);
}
