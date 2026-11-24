import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { hasPinnedBatiScaffolder } from './check-docker-pin.mjs';

const checkerPath = fileURLToPath(new URL('./check-docker-pin.mjs', import.meta.url));

function runCli(t, dockerfile) {
  const dir = mkdtempSync(join(tmpdir(), 'check-docker-pin-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'scripts'));
  copyFileSync(checkerPath, join(dir, 'scripts', 'check-docker-pin.mjs'));
  writeFileSync(join(dir, 'Dockerfile'), dockerfile);
  const result = spawnSync(process.execPath, [realpathSync(join(dir, 'scripts', 'check-docker-pin.mjs'))], {
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return result;
}

test('accepts exactly pinned scaffolder commands', () => {
  assert.equal(hasPinnedBatiScaffolder('FROM node:22-alpine\nRUN npm create bati@0.0.343 app\n'), true);
  assert.equal(hasPinnedBatiScaffolder('RUN npm create bati@0.0.343 app -- --react --hono\n'), true);
});

test('rejects unpinned, tagged, ranged and missing scaffolders', () => {
  assert.equal(hasPinnedBatiScaffolder('RUN npm create bati app\n'), false);
  assert.equal(hasPinnedBatiScaffolder('RUN npm create bati@latest app\n'), false);
  assert.equal(hasPinnedBatiScaffolder('RUN npm create bati@^0.0.343 app\n'), false);
  assert.equal(hasPinnedBatiScaffolder('FROM node:22-alpine\nRUN npm ci\n'), false);
});

const failingDockerfiles = [
  ['unversioned npm create bati app', 'FROM node:22-alpine\nRUN npm create bati app\n'],
  ['ranged npm create bati@^0.0.343', 'FROM node:22-alpine\nRUN npm create bati@^0.0.343 app\n'],
  ['npm create bati@next', 'FROM node:22-alpine\nRUN npm create bati@next app\n'],
  ['missing scaffolder command', 'FROM node:22-alpine\n# npm create bati@0.0.343 app\nRUN npm ci\n'],
];

for (const [name, dockerfile] of failingDockerfiles) {
  test(`CLI: ${name} fails`, (t) => {
    const result = runCli(t, dockerfile);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /npm create bati with an exact version/);
  });
}

test('CLI: pinned command with line continuation and harmless comment passes', (t) => {
  const dockerfile = 'FROM node:22-alpine\n# npm create bati@latest\nRUN npm create bati@0.0.343 \\\n    app -- --react --hono\n';
  const result = runCli(t, dockerfile);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
