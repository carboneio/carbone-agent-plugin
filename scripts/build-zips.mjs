#!/usr/bin/env node
// Builds the release artifacts into dist/:
//   dist/carbone.skill              the skills/carbone folder, its contents at the archive root
//   dist/carbone-chatgpt-plugin.zip plugin.json, mcp.json, assets/, skills/ at the archive root,
//                                   with the ChatGPT auth block added to the zipped mcp.json only
// Only files git would ship (tracked + untracked-not-ignored) are included; hidden files never are.
// Requires the `zip` and `unzip` command-line tools (present on macOS and ubuntu-latest).

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { ROOT, isHidden, listRepoFiles } from './lib.mjs';

const DIST = path.join(ROOT, 'dist');
const SKILL_DIR = 'skills/carbone';
const CHATGPT_ROOT_FILES = ['plugin.json', 'mcp.json'];
const CHATGPT_DIRS = ['assets/', 'skills/'];
const OPENAI_AUTH = { 'com.openai': { auth: { type: 'oauth' } } };

const files = listRepoFiles().filter((f) => !isHidden(f));
mkdirSync(DIST, { recursive: true });

// carbone.skill ------------------------------------------------------------------------------
const skillFiles = files.filter((f) => f.startsWith(`${SKILL_DIR}/`)).map((f) => path.posix.relative(SKILL_DIR, f));
if (!skillFiles.includes('SKILL.md')) fail(`${SKILL_DIR}/SKILL.md not found`);
const skillZip = path.join(DIST, 'carbone.skill');
zip(path.join(ROOT, SKILL_DIR), skillZip, skillFiles);

// carbone-chatgpt-plugin.zip -----------------------------------------------------------------
const pluginFiles = files.filter((f) => CHATGPT_ROOT_FILES.includes(f) || CHATGPT_DIRS.some((d) => f.startsWith(d)));
for (const f of CHATGPT_ROOT_FILES) if (!pluginFiles.includes(f)) fail(`${f} not found`);
const stage = mkdtempSync(path.join(tmpdir(), 'carbone-chatgpt-'));
try {
  for (const f of pluginFiles) {
    mkdirSync(path.join(stage, path.dirname(f)), { recursive: true });
    copyFileSync(path.join(ROOT, f), path.join(stage, f));
  }
  writeFileSync(path.join(stage, 'mcp.json'), withOpenAiAuth(readFileSync(path.join(ROOT, 'mcp.json'), 'utf8')));
  const pluginZip = path.join(DIST, 'carbone-chatgpt-plugin.zip');
  zip(stage, pluginZip, pluginFiles);
} finally {
  rmSync(stage, { recursive: true, force: true });
}

// Sanity checks on what was written -----------------------------------------------------------
for (const [archive, expected] of [
  [skillZip, skillFiles],
  [path.join(DIST, 'carbone-chatgpt-plugin.zip'), pluginFiles],
]) {
  const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const bad = entries.filter((e) => isHidden(e) || e.split('/').includes('__MACOSX') || e === 'package.json' || e.endsWith('/'));
  if (bad.length) fail(`${path.basename(archive)} has unexpected entries: ${bad.join(', ')}`);
  if (!isDeepStrictEqual([...entries].sort(), [...expected].sort())) fail(`${path.basename(archive)}: entries differ from the file list`);
  console.log(`${path.relative(ROOT, archive)}: ${entries.length} files`);
  for (const e of entries) console.log(`  ${e}`);
}

// ---------------------------------------------------------------------------------------------

function zip(cwd, archive, list) {
  rmSync(archive, { force: true });
  // -X: no extra file attributes; -D: no directory entries; -q: quiet; -@: names from stdin.
  execFileSync('zip', ['-X', '-D', '-q', archive, '-@'], { cwd, input: `${list.join('\n')}\n`, stdio: ['pipe', 'inherit', 'inherit'] });
}

/** Adds extensions.com.openai.auth to the carbone server, keeping the file's formatting. */
function withOpenAiAuth(text) {
  const data = JSON.parse(text);
  if (!data.mcpServers?.carbone) fail('mcp.json: no carbone server');
  if (data.mcpServers.carbone.extensions) fail('mcp.json: already has "extensions"; it must stay schema-clean in the repository');
  const expected = structuredClone(data);
  expected.mcpServers.carbone.extensions = OPENAI_AUTH;
  // Insert after the carbone server's "url" line, as in the ZIP validated by OpenAI.
  const m = /\n([ \t]+)"url"\s*:\s*"[^"]*"/.exec(text);
  if (m) {
    const ind = m[1];
    const unit = /\n([ \t]+)"/.exec(text)[1]; // the file's indent unit (first key's indentation)
    const block = [
      `,\n${ind}"extensions": {`,
      `${ind}${unit}"com.openai": {`,
      `${ind}${unit}${unit}"auth": { "type": "oauth" }`,
      `${ind}${unit}}`,
      `${ind}}`,
    ].join('\n');
    const at = m.index + m[0].length;
    const out = text.slice(0, at) + block + text.slice(at);
    try {
      if (isDeepStrictEqual(JSON.parse(out), expected)) return out;
    } catch {
      /* fall through */
    }
  }
  return `${JSON.stringify(expected, null, 2)}\n`;
}

function fail(msg) {
  console.error(`build-zips: ${msg}`);
  process.exit(1);
}
