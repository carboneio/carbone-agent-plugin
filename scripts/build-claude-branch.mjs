#!/usr/bin/env node
// Builds the claude-directory branch: only the files Claude reads, for Anthropic's plugin directory.
//
// The directory scans the whole plugin folder (here the repository root) and, for organizations
// it has not verified, refuses scripts, package files and MCP fields Claude does not read. main
// keeps the tooling and the other assistants' manifests; the directory tracks this branch instead.
//
// Usage: node scripts/build-claude-branch.mjs [--ref <commit>] [--commit]
//   Writes the branch files of <ref> (default HEAD, so committed content only) to
//   dist/claude-directory/ and checks them against the directory's rules.
//   --commit also records them as a new commit on the local claude-directory branch, on top of
//   its last commit (or origin/claude-directory), without touching the working tree or the index.
//   Then publish it with: git push origin claude-directory

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const BRANCH = 'claude-directory';
const OUT = path.join(ROOT, 'dist', BRANCH);
const MANIFEST = '.claude-plugin/plugin.json';
const ROOT_FILES = [MANIFEST, '.mcp.json', 'README.md', 'LICENSE'];
const SKILLS = 'skills/';
const SKILLS_EXCLUDED = ['skills/carbone/agents/']; // OpenAI (Codex) metadata, not read by Claude

// The directory's rules for organizations it has not verified (portal wording, 2026-11).
const TEXT_EXT = new Set(['.md', '.txt', '.json', '.yaml', '.yml']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']);
const MCP_SERVER_KEYS = new Set(['type', 'url', 'headers', 'timeout', 'alwaysLoad', 'oauth', 'name', 'title', 'displayName', 'description']);
const MCP_OAUTH_KEYS = new Set(['clientId', 'callbackPort', 'authServerMetadataUrl', 'scopes']);

const args = process.argv.slice(2);
let ref = 'HEAD';
let commit = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--commit') commit = true;
  else if (args[i] === '--ref' && args[i + 1]) ref = args[++i];
  else fail(`unknown option ${args[i]}\nUsage: node scripts/build-claude-branch.mjs [--ref <commit>] [--commit]`);
}

const sha = git(['rev-parse', '--verify', `${ref}^{commit}`]).trim();

// Files of the commit, with their blob ids --------------------------------------------------------
const tree = new Map();
for (const entry of git(['ls-tree', '-r', '-z', '--full-tree', sha]).split('\0').filter(Boolean)) {
  const [meta, file] = entry.split('\t');
  const [mode, type, blob] = meta.split(' ');
  tree.set(file, { mode, type, blob });
}
const blobText = (file) => git(['cat-file', 'blob', tree.get(file).blob]);

const manifest = JSON.parse(blobText(MANIFEST));
const icon = manifest.icon ? path.posix.normalize(manifest.icon) : null;
const wanted = [...ROOT_FILES, ...(icon ? [icon] : [])];
for (const f of wanted) if (!tree.has(f)) fail(`${f} is not in ${ref}`);
const files = [
  ...wanted,
  ...[...tree.keys()].filter((f) => f.startsWith(SKILLS) && !SKILLS_EXCLUDED.some((d) => f.startsWith(d))),
].sort();

// Contents, with README links to files left on main made absolute --------------------------------
const repoUrl = String(manifest.repository ?? '').replace(/\.git$/, '');
if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(repoUrl)) fail(`${MANIFEST}: "repository" must be a https://github.com/<owner>/<repo> URL`);
const contents = new Map();
for (const f of files) {
  const { mode, type } = tree.get(f);
  if (type !== 'blob' || mode !== '100644') fail(`${f}: mode ${mode} (${type}); only regular, non-executable files are allowed`);
  contents.set(f, execFileSync('git', ['cat-file', 'blob', tree.get(f).blob], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }));
}
const readme = contents.get('README.md').toString('utf8');
const relinked = readme.replace(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g, (m, target) => {
  const file = path.posix.normalize(target.split('#')[0]);
  return files.includes(file) ? m : `](${repoUrl}/blob/main/${target})`;
});
if (relinked !== readme) contents.set('README.md', Buffer.from(relinked, 'utf8'));

// Checks: the directory's file rules ----------------------------------------------------------------
const utf8 = new TextDecoder('utf-8', { fatal: true });
for (const [f, buf] of contents) {
  const ext = path.posix.extname(f).toLowerCase();
  const isImage = IMAGE_EXT.has(ext);
  if (!(TEXT_EXT.has(ext) || isImage || f === 'LICENSE' || f === icon)) fail(`${f}: not a type the directory accepts (Markdown, text, JSON, YAML or a PNG, JPEG, GIF, WebP or ICO image)`);
  if (buf.subarray(0, 2).toString('latin1') === '#!') fail(`${f}: starts with #!`);
  if (!isImage) {
    if (buf.includes(0)) fail(`${f}: contains a NUL byte`);
    try {
      utf8.decode(buf);
    } catch {
      fail(`${f}: not valid UTF-8`);
    }
  }
}
const mcp = JSON.parse(contents.get('.mcp.json').toString('utf8'));
for (const [name, server] of Object.entries(mcp.mcpServers ?? {})) {
  for (const k of Object.keys(server)) if (!MCP_SERVER_KEYS.has(k)) fail(`.mcp.json: server "${name}" has the field "${k}", which the directory refuses`);
  if (!['http', 'sse'].includes(server.type)) fail(`.mcp.json: server "${name}" must be "type": "http" or "sse"`);
  for (const k of Object.keys(server.oauth ?? {})) if (!MCP_OAUTH_KEYS.has(k)) fail(`.mcp.json: server "${name}" has the oauth field "${k}", which the directory refuses`);
}

// dist/claude-directory/ ------------------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
for (const [f, buf] of contents) {
  mkdirSync(path.join(OUT, path.dirname(f)), { recursive: true });
  writeFileSync(path.join(OUT, f), buf);
}
console.log(`${path.relative(ROOT, OUT)}: ${files.length} files from ${sha.slice(0, 7)} (v${manifest.version})`);
for (const f of files) console.log(`  ${f}`);

// Commit on the claude-directory branch -----------------------------------------------------------------
if (commit) {
  if (git(['symbolic-ref', '-q', 'HEAD'], true).trim() === `refs/heads/${BRANCH}`) fail(`${BRANCH} is checked out; switch to main first`);
  const local = git(['rev-parse', '-q', '--verify', `refs/heads/${BRANCH}^{commit}`], true).trim();
  const parent = local || git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${BRANCH}^{commit}`], true).trim();

  const tmp = mkdtempSync(path.join(tmpdir(), 'claude-branch-'));
  try {
    const env = { ...process.env, GIT_INDEX_FILE: path.join(tmp, 'index') };
    const lines = files.map((f) => {
      const blob = f === 'README.md' && relinked !== readme ? git(['hash-object', '-w', '--stdin'], false, contents.get(f)).trim() : tree.get(f).blob;
      return `100644 ${blob}\t${f}`;
    });
    git(['read-tree', '--empty'], false, undefined, env);
    git(['update-index', '--add', '--index-info'], false, `${lines.join('\n')}\n`, env);
    const newTree = git(['write-tree'], false, undefined, env).trim();

    if (parent && git(['rev-parse', `${parent}^{tree}`]).trim() === newTree) {
      console.log(`${BRANCH}: no change from ${parent.slice(0, 7)}, nothing to commit`);
    } else {
      const message = `Carbone plugin v${manifest.version} for the Claude directory\n\nBuilt from ${sha} by scripts/build-claude-branch.mjs.\n`;
      const newCommit = git(['commit-tree', newTree, ...(parent ? ['-p', parent] : []), '-F', '-'], false, message).trim();
      // With the old value, update-ref refuses to move the branch if it changed meanwhile.
      git(['update-ref', `refs/heads/${BRANCH}`, newCommit, ...(local ? [local] : [])]);
      console.log(`${BRANCH}: ${newCommit.slice(0, 7)} on top of ${parent ? parent.slice(0, 7) : '(new branch)'}\nPublish it with: git push origin ${BRANCH}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------

function git(gitArgs, allowFail = false, input, env = process.env) {
  try {
    return execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8', input, env, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', allowFail ? 'ignore' : 'inherit'] });
  } catch (e) {
    if (allowFail) return '';
    fail(`git ${gitArgs.join(' ')} failed`);
  }
}

function fail(msg) {
  console.error(`build-claude-branch: ${msg}`);
  process.exit(1);
}
