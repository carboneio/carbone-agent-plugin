// Shared helpers for validate.mjs, bump-version.mjs and build-zips.mjs.

import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MCP_URL = 'https://mcp.carbone.io';

// Every file that carries the shared version. Marketplace files must NOT have one.
export const VERSION_JSON_FILES = [
  'plugin.json',
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.antigravity-plugin/plugin.json',
  'gemini-extension.json',
];
export const SKILL_MD = 'skills/carbone/SKILL.md';
export const MARKETPLACE_FILES = ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json'];

// Official semver 2.0.0 regex (semver.org).
export const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Files that would ship: tracked + untracked-not-ignored, as git sees them.
 * Never a filesystem walk (templates/, node_modules/ and .claude/ are ignored and huge).
 * Files deleted from the working tree are dropped.
 */
export function listRepoFiles() {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const files = [...new Set(out.split('\0').filter(Boolean))];
  return files
    .filter((f) => {
      try {
        lstatSync(path.join(ROOT, f));
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

/** Git index entries with their mode (120000 = symlink, 160000 = submodule). */
export function listIndexModes() {
  const out = execFileSync('git', ['ls-files', '-z', '--stage'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out
    .split('\0')
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split('\t');
      return { mode: meta.split(' ')[0], file };
    });
}

export function isHidden(relPath) {
  return relPath.split('/').some((seg) => seg.startsWith('.'));
}

/**
 * Parses SKILL.md front matter with the `yaml` package (duplicate keys are errors).
 * Returns { data, lines, end }: the parsed object, the file's lines and the index of the closing `---`.
 */
export function parseFrontMatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') throw new Error('SKILL.md must start with a "---" front matter fence');
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new Error('SKILL.md front matter has no closing "---" fence');
  const data = YAML.parse(lines.slice(1, end).join('\n'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('front matter is not a YAML mapping');
  return { data, lines, end };
}
