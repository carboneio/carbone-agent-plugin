#!/usr/bin/env node
// Validates the Carbone agent plugin before a pull request is merged or a release is built.
// See AGENT_PLUGIN_PLAN.md section 8 for the list of checks.
//
// Usage: node scripts/validate.mjs [--offline] [--require-claude]
//   --offline         skip check 8 (listing URLs answer 200); for local use only, CI never passes it
//   --require-claude  fail check 10 when the `claude` CLI is missing instead of skipping it (CI passes it)

import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  MARKETPLACE_FILES,
  MCP_URL,
  ROOT,
  SEMVER_RE,
  SKILL_MD,
  VERSION_JSON_FILES,
  isHidden,
  listIndexModes,
  listRepoFiles,
  parseFrontMatter,
} from './lib.mjs';

const args = new Set(process.argv.slice(2));
for (const a of args) {
  if (!['--offline', '--require-claude'].includes(a)) {
    console.error(`Unknown option: ${a}\nUsage: node scripts/validate.mjs [--offline] [--require-claude]`);
    process.exit(2);
  }
}
const OFFLINE = args.has('--offline');
const REQUIRE_CLAUDE = args.has('--require-claude');

const KIB = 1024;
const MAX_FILE_BYTES = 256 * KIB;
const MAX_FILES = 512;
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.avif']);
const FRONT_MATTER_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];

const rel = (p) => path.join(ROOT, p);
const read = (p) => readFileSync(rel(p), 'utf8');
const len = (s) => [...s].length; // characters (code points), not UTF-16 units
const files = listRepoFiles();
const json = {}; // parsed JSON by path, filled by check 1

const results = [];
async function check(title, fn) {
  const errors = [];
  const notes = [];
  let skipped = null;
  try {
    await fn({
      fail: (msg) => errors.push(msg),
      note: (msg) => notes.push(msg),
      skip: (msg) => {
        skipped = msg;
      },
    });
  } catch (e) {
    errors.push(`unexpected error: ${e.stack || e}`);
  }
  const status = errors.length ? 'FAIL' : skipped ? 'SKIP' : 'PASS';
  results.push({ title, status });
  console.log(`\n[${status}] ${title}`);
  for (const n of notes) console.log(`       ${n}`);
  if (skipped) console.log(`       WARNING: ${skipped}`);
  for (const e of errors) console.log(`   x   ${e}`);
}

function get(obj, fieldPath, fail, label) {
  let cur = obj;
  for (const k of fieldPath) {
    if (cur == null || typeof cur !== 'object' || !Object.hasOwn(cur, k)) {
      fail(`${label}: missing key path ${fieldPath.map((x) => JSON.stringify(x)).join(' > ')}`);
      return undefined;
    }
    cur = cur[k];
  }
  return cur;
}

// ---------------------------------------------------------------------------------------------
await check('1. Every JSON manifest parses', ({ fail, note }) => {
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  for (const f of jsonFiles) {
    try {
      json[f] = JSON.parse(read(f));
    } catch (e) {
      fail(`${f}: ${e.message}`);
    }
  }
  const required = [
    'plugin.json',
    'mcp.json',
    '.mcp.json',
    'mcp_config.json',
    'gemini-extension.json',
    ...VERSION_JSON_FILES,
    ...MARKETPLACE_FILES,
  ];
  for (const f of new Set(required)) if (!jsonFiles.includes(f)) fail(`${f}: missing (or ignored by git)`);
  note(`${jsonFiles.length} JSON files parsed`);
});

// ---------------------------------------------------------------------------------------------
await check('2. plugin.json and mcp.json match the Agent Plugins 1.0.0 schemas', ({ fail, note }) => {
  const require = createRequire(import.meta.url);
  let Ajv2020;
  try {
    Ajv2020 = require('ajv/dist/2020').default;
  } catch {
    fail('ajv is not installed: run `npm --prefix scripts ci` first');
    return;
  }
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const [file, schemaFile] of [
    ['plugin.json', 'scripts/schemas/plugin.schema.json'],
    ['mcp.json', 'scripts/schemas/mcp.schema.json'],
  ]) {
    const schema = JSON.parse(read(schemaFile));
    const data = json[file];
    if (!data) {
      fail(`${file}: not parsed`);
      continue;
    }
    if (data.$schema !== schema.$id) fail(`${file}: "$schema" is ${JSON.stringify(data.$schema)}, expected ${schema.$id}`);
    const validate = ajv.compile(schema);
    if (!validate(data)) {
      const seen = new Set();
      for (const e of validate.errors) {
        const extra = e.params?.additionalProperty ? ` ("${e.params.additionalProperty}")` : '';
        const msg = `${file}${e.instancePath || ''}: ${e.message}${extra}`;
        if (!seen.has(msg)) fail(msg);
        seen.add(msg);
      }
    } else {
      note(`${file}: valid against ${schema.$id}`);
    }
  }
  const hasExtensions = (o) =>
    o && typeof o === 'object' && Object.entries(o).some(([k, v]) => k === 'extensions' || hasExtensions(v));
  if (hasExtensions(json['mcp.json']))
    fail('mcp.json: has an "extensions" key; the ChatGPT auth block is added only in the built ZIP (scripts/build-zips.mjs)');
});

// ---------------------------------------------------------------------------------------------
await check('3. One shared version in every manifest and SKILL.md', ({ fail, note }) => {
  const versions = {};
  for (const f of VERSION_JSON_FILES) {
    const v = json[f]?.version;
    if (typeof v !== 'string') fail(`${f}: no "version" string`);
    else versions[f] = v;
  }
  try {
    const { data } = parseFrontMatter(read(SKILL_MD));
    const v = data.metadata?.version;
    if (typeof v !== 'string') fail(`${SKILL_MD}: no metadata.version`);
    else versions[`${SKILL_MD} metadata.version`] = v;
  } catch (e) {
    fail(`${SKILL_MD}: ${e.message}`);
  }
  const distinct = new Set(Object.values(versions));
  if (distinct.size > 1) for (const [f, v] of Object.entries(versions)) fail(`${f}: ${v}`);
  for (const v of distinct) if (!SEMVER_RE.test(v)) fail(`"${v}" is not a semver version`);
  for (const f of MARKETPLACE_FILES) {
    const m = json[f];
    if (!m) continue;
    if ('version' in m) fail(`${f}: must not have a root "version" (set it only in the plugin manifests)`);
    if (m.metadata && 'version' in m.metadata) fail(`${f}: must not have "metadata.version"`);
    for (const [i, p] of (m.plugins ?? []).entries()) if ('version' in p) fail(`${f}: plugins[${i}] must not have a "version"`);
  }
  if (distinct.size === 1) note(`version ${[...distinct][0]} in ${Object.keys(versions).length} places; none in marketplace files`);
});

// ---------------------------------------------------------------------------------------------
await check(`4. The MCP server is "carbone" at exactly ${MCP_URL} in every MCP file`, ({ fail, note }) => {
  const specs = [
    { file: 'mcp.json', urlField: 'url', type: 'streamable-http' },
    { file: '.mcp.json', urlField: 'url', type: 'http' },
    { file: 'gemini-extension.json', urlField: 'httpUrl' },
    { file: 'mcp_config.json', urlField: 'serverUrl' },
  ];
  for (const { file, urlField, type } of specs) {
    const servers = json[file]?.mcpServers;
    if (!servers || typeof servers !== 'object') {
      fail(`${file}: no "mcpServers" object`);
      continue;
    }
    const names = Object.keys(servers);
    if (names.length !== 1 || names[0] !== 'carbone') fail(`${file}: servers are ${JSON.stringify(names)}, expected exactly ["carbone"]`);
    const s = servers.carbone;
    if (!s) continue;
    if (s[urlField] !== MCP_URL) fail(`${file}: mcpServers.carbone.${urlField} is ${JSON.stringify(s[urlField])}, expected "${MCP_URL}"`);
    for (const k of ['url', 'httpUrl', 'serverUrl'])
      if (k !== urlField && k in s) fail(`${file}: mcpServers.carbone has "${k}"; this client reads "${urlField}" only`);
    if (type && s.type !== type) fail(`${file}: mcpServers.carbone.type is ${JSON.stringify(s.type)}, expected "${type}"`);
    for (const k of ['headers', 'command', 'args', 'env']) if (k in s) fail(`${file}: mcpServers.carbone must not have "${k}"`);
    note(`${file}: carbone ${urlField} = ${s[urlField]}`);
  }
  const agy = json['.antigravity-plugin/plugin.json'];
  if (agy && agy.mcpServers !== './mcp_config.json')
    fail(`.antigravity-plugin/plugin.json: "mcpServers" is ${JSON.stringify(agy.mcpServers)}, expected "./mcp_config.json"`);
  if (json['.claude-plugin/plugin.json'] && 'mcpServers' in json['.claude-plugin/plugin.json'])
    fail('.claude-plugin/plugin.json: must not declare "mcpServers" (the server is read from .mcp.json)');
});

// ---------------------------------------------------------------------------------------------
await check('5. Skills follow the Agent Skills spec and their reference links resolve', ({ fail, note }) => {
  const skillDirs = readdirSync(rel('skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  if (!skillDirs.length) fail('skills/: no skill folder');
  for (const dir of skillDirs) {
    const skillPath = `skills/${dir}/SKILL.md`;
    if (!files.includes(skillPath)) {
      fail(`${skillPath}: missing`);
      continue;
    }
    const text = read(skillPath);
    let data;
    try {
      ({ data } = parseFrontMatter(text));
    } catch (e) {
      fail(`${skillPath}: ${e.message}`);
      continue;
    }
    for (const k of Object.keys(data)) if (!FRONT_MATTER_FIELDS.includes(k)) fail(`${skillPath}: front matter key "${k}" is not one of ${FRONT_MATTER_FIELDS.join(', ')}`);
    if (data.name !== dir) fail(`${skillPath}: name "${data.name}" does not match its folder "${dir}"`);
    if (typeof data.name !== 'string' || !/^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/.test(data.name))
      fail(`${skillPath}: name must be 1-64 lowercase letters, digits and single hyphens`);
    if (typeof data.description !== 'string' || !data.description.trim()) fail(`${skillPath}: description is missing`);
    else {
      const d = data.description.trim();
      if (len(d) > 1024) fail(`${skillPath}: description is ${len(d)} characters, max 1024`);
      else note(`${skillPath}: description ${len(d)}/1024 characters`);
    }
    if (data.metadata !== undefined && (typeof data.metadata !== 'object' || Object.values(data.metadata).some((v) => typeof v !== 'string')))
      fail(`${skillPath}: metadata must map keys to strings`);
    const lineCount = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    if (lineCount >= 500) fail(`${skillPath}: ${lineCount} lines, must be under 500`);
    else note(`${skillPath}: ${lineCount} lines (< 500)`);

    // Links: `references/x.md` anywhere resolves from the skill folder; a Markdown link
    // [..](x.md) resolves from the file that holds it; a bare `x.md` in a reference file
    // resolves from references/.
    const skillRoot = `skills/${dir}`;
    const mdFiles = files.filter((f) => f.startsWith(`${skillRoot}/`) && f.endsWith('.md'));
    let linkCount = 0;
    for (const f of mdFiles) {
      const body = read(f);
      const targets = new Set();
      for (const m of body.matchAll(/(?<![\w/.-])references\/[\w.-]+\.md/g)) targets.add(path.posix.join(skillRoot, m[0]));
      for (const m of body.matchAll(/\]\(([^)\s#]+\.md)(?:#[^)]*)?\)/g))
        if (!/^[a-z]+:/i.test(m[1])) targets.add(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1])));
      if (path.posix.dirname(f) === `${skillRoot}/references`)
        for (const m of body.matchAll(/`([\w-]+\.md)`/g)) targets.add(`${skillRoot}/references/${m[1]}`);
      for (const t of targets) {
        linkCount++;
        if (!files.includes(t)) fail(`${f}: link to ${path.posix.relative(skillRoot, t)} does not resolve`);
      }
    }
    note(`${skillRoot}: ${linkCount} distinct file links checked in ${mdFiles.length} Markdown files`);
  }
});

// ---------------------------------------------------------------------------------------------
await check('6. ChatGPT listing limits (plugin.json extensions.com.openai)', ({ fail, note }) => {
  const p = json['plugin.json'];
  if (!p) return fail('plugin.json: not parsed');
  const L = 'plugin.json';
  const base = ['extensions', 'com.openai'];
  const maxLen = (value, max, label) => {
    if (typeof value !== 'string' || !value.trim()) return fail(`${label}: missing or empty`);
    if (len(value) > max) fail(`${label}: ${len(value)} characters, max ${max}`);
  };
  const noTabs = (value, label) => {
    if (typeof value === 'string' && value.includes('\t')) fail(`${label}: contains a tab`);
  };
  const ui = [...base, 'interface'];
  maxLen(get(p, [...ui, 'displayName'], fail, L), 30, 'interface.displayName');
  maxLen(get(p, [...ui, 'shortDescription'], fail, L), 30, 'interface.shortDescription (subtitle)');
  maxLen(get(p, [...ui, 'longDescription'], fail, L), 4000, 'interface.longDescription (description)');
  const prompts = get(p, [...ui, 'defaultPrompt'], fail, L);
  if (prompts !== undefined) {
    if (!Array.isArray(prompts) || prompts.length !== 3) fail(`interface.defaultPrompt: expected 3 starter prompts, found ${Array.isArray(prompts) ? prompts.length : typeof prompts}`);
    else prompts.forEach((s, i) => maxLen(s, 128, `interface.defaultPrompt[${i}]`));
  }
  for (const k of ['displayName', 'shortDescription', 'longDescription']) noTabs(p.extensions?.['com.openai']?.interface?.[k], `interface.${k}`);

  const tr = get(p, [...base, 'publication', 'translations'], fail, L);
  if (tr !== undefined) {
    if (!tr || typeof tr !== 'object' || Array.isArray(tr)) fail('publication.translations: expected an object keyed by locale');
    else {
      for (const [loc, t] of Object.entries(tr)) {
        maxLen(t?.subtitle, 30, `publication.translations.${loc}.subtitle`);
        maxLen(t?.description, 4000, `publication.translations.${loc}.description`);
        if (t?.displayName !== undefined) maxLen(t.displayName, 30, `publication.translations.${loc}.displayName`);
        for (const [k, v] of Object.entries(t ?? {})) noTabs(v, `publication.translations.${loc}.${k}`);
      }
      note(`${Object.keys(tr).length} translations: ${Object.keys(tr).join(', ')}`);
    }
  }
  const notes = get(p, [...base, 'publication', 'release_notes'], fail, L);
  if (notes !== undefined && (typeof notes !== 'string' || !notes.trim())) fail('publication.release_notes: empty');

  const pos = get(p, [...base, 'review', 'test_cases', 'positive'], fail, L);
  const neg = get(p, [...base, 'review', 'test_cases', 'negative'], fail, L);
  if (pos !== undefined && (!Array.isArray(pos) || pos.length !== 5)) fail(`review.test_cases.positive: expected exactly 5, found ${pos?.length}`);
  if (neg !== undefined && (!Array.isArray(neg) || neg.length !== 3)) fail(`review.test_cases.negative: expected exactly 3, found ${neg?.length}`);
  if (!p.extensions?.['com.openai']?.review?.demo_recording_url)
    note('note: review.demo_recording_url is not set yet (needed before the ChatGPT submission, see plan 5.1)');
});

// ---------------------------------------------------------------------------------------------
await check('7. assets/icon.svg has a square viewBox of at least 48 and numeric width and height', ({ fail, note }) => {
  const icon = 'assets/icon.svg';
  if (!files.includes(icon)) return fail(`${icon}: missing`);
  // Only the root <svg> tag is checked (after an optional XML declaration and comments).
  const tag = /^\uFEFF?\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b([^>]*)>/.exec(read(icon));
  if (!tag) return fail(`${icon}: does not start with an <svg> tag`);
  const attrs = Object.fromEntries([...tag[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1], m[2] ?? m[3]]));
  const vb = (attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) fail(`${icon}: viewBox ${JSON.stringify(attrs.viewBox)} is not 4 numbers`);
  else if (vb[2] !== vb[3]) fail(`${icon}: viewBox is ${vb[2]} x ${vb[3]}, not square`);
  else if (vb[2] < 48) fail(`${icon}: viewBox is ${vb[2]} x ${vb[3]}, must be at least 48`);
  for (const k of ['width', 'height'])
    if (!/^\d+(\.\d+)?$/.test(attrs[k] ?? '')) fail(`${icon}: ${k} ${JSON.stringify(attrs[k])} is not a plain number`);
  if (attrs.width !== attrs.height) fail(`${icon}: width and height differ`);
  note(`${icon}: viewBox "${attrs.viewBox}", width ${attrs.width}, height ${attrs.height}`);

  // Every logo/icon path in a manifest points to a file in the repository.
  const refs = [
    ['plugin.json', ['extensions', 'com.openai', 'interface', 'logo']],
    ['plugin.json', ['extensions', 'com.openai', 'interface', 'composerIcon']],
    ['.claude-plugin/plugin.json', ['icon']],
    ['.cursor-plugin/plugin.json', ['logo']],
    ['.antigravity-plugin/plugin.json', ['logo']],
  ];
  for (const [f, kp] of refs) {
    const v = get(json[f], kp, fail, f);
    if (typeof v !== 'string') continue;
    const target = path.posix.normalize(v);
    if (!files.includes(target)) fail(`${f} ${kp.join('.')}: ${v} does not exist`);
  }
});

// ---------------------------------------------------------------------------------------------
await check('8. Listing URLs answer 200', async ({ fail, note, skip }) => {
  if (OFFLINE) return skip('skipped (--offline); CI runs it');
  const urls = new Map(); // url -> [where it is used]
  const add = (u, where) => {
    if (typeof u !== 'string' || !u) return;
    if (!u.startsWith('https://')) fail(`${where}: ${u} is not https`);
    urls.set(u, [...(urls.get(u) ?? []), where]);
  };
  const p = json['plugin.json'] ?? {};
  const ui = p.extensions?.['com.openai']?.interface ?? {};
  for (const k of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) add(ui[k], `plugin.json interface.${k}`);
  add(p.extensions?.['com.openai']?.review?.demo_recording_url, 'plugin.json review.demo_recording_url');
  for (const f of [...VERSION_JSON_FILES, ...MARKETPLACE_FILES]) {
    const m = json[f] ?? {};
    for (const k of ['homepage', 'repository', 'documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl'])
      add(typeof m[k] === 'object' ? m[k]?.url : m[k], `${f} ${k}`);
    add(m.author?.url, `${f} author.url`);
    for (const [i, pl] of (m.plugins ?? []).entries()) add(pl.homepage, `${f} plugins[${i}].homepage`);
  }
  try {
    const { data } = parseFrontMatter(read(SKILL_MD));
    add(data.metadata?.repository, `${SKILL_MD} metadata.repository`);
  } catch {
    /* reported by check 5 */
  }
  const answers = await Promise.all([...urls].map(async ([u, where]) => [u, where, await urlStatus(u)]));
  for (const [u, where, r] of answers) {
    if (r.status === 200) note(`200 ${u}${r.finalUrl !== u ? ` -> ${r.finalUrl}` : ''}`);
    else fail(`${u} answered ${r.status}${r.error ? ` (${r.error})` : ''}; used in: ${where.join(', ')}`);
  }
});

// ---------------------------------------------------------------------------------------------
await check('9. No forbidden content; size and file-count limits', ({ fail, note }) => {
  // Path rules, on every file git would ship.
  for (const f of files) {
    const base = path.posix.basename(f);
    const segs = f.split('/');
    if (base === '.DS_Store' || base === 'Thumbs.db' || base === 'desktop.ini') fail(`${f}: system file`);
    if (segs.includes('__MACOSX')) fail(`${f}: __MACOSX entry`);
    if (segs.slice(0, -1).includes('hooks') || base === 'hooks.json') fail(`${f}: hooks are not allowed`);
    if (base.endsWith('.app.json')) fail(`${f}: .app.json is not allowed`);
    if (segs[0] === 'bin' && segs.length > 1) fail(`${f}: bin/ is not allowed`);
    const st = lstatSync(rel(f));
    if (st.isSymbolicLink()) fail(`${f}: symbolic link`);
    else if (st.isFile() && !IMAGE_EXT.has(path.extname(f).toLowerCase()) && st.size >= MAX_FILE_BYTES)
      fail(`${f}: ${st.size} bytes, non-image files must be under ${MAX_FILE_BYTES} (256 KiB)`);
  }
  for (const { mode, file } of listIndexModes()) {
    if (mode === '120000') fail(`${file}: symbolic link (in the git index)`);
    if (mode === '160000') fail(`${file}: git submodule`);
  }
  if (existsSync(rel('.gitmodules'))) fail('.gitmodules: git submodules are not allowed');
  for (const f of ['package.json', 'package-lock.json'])
    if (files.includes(f) || existsSync(rel(f))) fail(`${f} at the root: the tooling package lives in scripts/ (a root package.json makes Claude Code install it on every user's machine)`);
  if (files.includes('CLAUDE.md') || existsSync(rel('CLAUDE.md'))) fail('CLAUDE.md at the root: `claude plugin validate --strict` warns about it (use RELEASING.md)');
  if (files.length >= MAX_FILES) fail(`${files.length} files, must be under ${MAX_FILES}`);
  else note(`${files.length} files (< ${MAX_FILES}), every non-image file < 256 KiB`);

  // Manifest keys that OpenAI or claude.ai reject.
  const cp = json['.claude-plugin/plugin.json'] ?? {};
  for (const k of ['hooks', 'userConfig']) if (k in cp) fail(`.claude-plugin/plugin.json: "${k}" is not allowed`);
  const findField = (o, names, trail = []) =>
    o && typeof o === 'object'
      ? Object.entries(o).flatMap(([k, v]) => [...(names.includes(k) ? [[...trail, k].join('.')] : []), ...findField(v, names, [...trail, k])])
      : [];
  for (const hit of findField(json['plugin.json'], ['apps', 'hooks', 'test_credentials', 'reviewer_instructions']))
    fail(`plugin.json: key "${hit}" is not allowed`);

  // Content scan for credentials and reviewer-only fields. Scope: every file that ships in a
  // plugin or ZIP (manifests, MCP files, skills/, assets/). Excluded on purpose: root Markdown
  // docs (README, CHANGELOG, RELEASING, CONTRIBUTING, AGENT_PLUGIN_PLAN), .github/ and scripts/,
  // which legitimately name these words to describe the rules, and are never read as plugin content.
  const scanned = files.filter(
    (f) =>
      !(/^[^/]+\.md$/.test(f) || f.startsWith('.github/') || f.startsWith('scripts/')) &&
      !IMAGE_EXT.has(path.extname(f).toLowerCase()) &&
      lstatSync(rel(f)).isFile(),
  );
  const forbidden = /client[_-]?secret|test_credentials|reviewer_instructions/i;
  for (const f of scanned) {
    const lines = read(f).split('\n');
    lines.forEach((l, i) => {
      const m = forbidden.exec(l);
      if (m) fail(`${f}:${i + 1}: contains "${m[0]}"`);
    });
  }
  note(`content scan for clientSecret / client_secret / test_credentials / reviewer_instructions: ${scanned.length} files`);
});

// ---------------------------------------------------------------------------------------------
await check('10. claude plugin validate --strict', ({ fail, note, skip }) => {
  const probe = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    if (REQUIRE_CLAUDE) return fail('the `claude` CLI is not on PATH (npm install -g @anthropic-ai/claude-code)');
    return skip('skipped: the `claude` CLI is not on PATH. Install it (npm install -g @anthropic-ai/claude-code) or run `npx -y @anthropic-ai/claude-code plugin validate . --strict`. CI runs it with --require-claude.');
  }
  note(`claude ${probe.stdout.trim()}`);
  // `.` validates the marketplace manifest (and the directory checks); the second run validates
  // the plugin manifest itself, which the first run does not report on when a marketplace exists.
  // Keeps the CLI from making non-essential network calls; the child inherits the environment.
  process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  for (const target of ['.', '.claude-plugin/plugin.json']) {
    const r = spawnSync('claude', ['plugin', 'validate', target, '--strict'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
    note(`$ claude plugin validate ${target} --strict  (exit ${r.status})`);
    for (const line of out.split('\n')) note(`  | ${line}`);
    if (r.status !== 0) fail(`claude plugin validate ${target} --strict exited with ${r.status}`);
  }
});

// ---------------------------------------------------------------------------------------------
const failed = results.filter((r) => r.status === 'FAIL');
const skippedChecks = results.filter((r) => r.status === 'SKIP');
console.log(
  `\n${failed.length ? 'FAILED' : 'PASSED'}: ${results.length - failed.length - skippedChecks.length} passed, ${failed.length} failed, ${skippedChecks.length} skipped`,
);
process.exit(failed.length ? 1 : 0);

// ---------------------------------------------------------------------------------------------
// Helpers

async function urlStatus(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': 'carbone-agent-plugin-validate (+https://github.com/carboneio/carbone-agent-plugin)' },
      });
      if (method === 'GET') await res.body?.cancel();
      return { status: res.status, finalUrl: res.url };
    } catch (e) {
      return { status: 'no answer', error: e.cause?.code || e.name || String(e) };
    } finally {
      clearTimeout(t);
    }
  };
  let r = await attempt('HEAD');
  if (r.status !== 200) r = await attempt('GET'); // some servers refuse HEAD
  if (r.status !== 200 && typeof r.status !== 'number') r = await attempt('GET'); // one retry on network errors
  return r;
}
