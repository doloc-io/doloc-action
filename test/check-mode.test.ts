import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTranslation } from '../src/check-mode';

test('update mode writes changed target file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'doloc-action-'));
  const targetPath = join(directory, 'de.json');
  await writeFile(targetPath, '{}');

  const result = await applyTranslation({ targetPath }, Buffer.from('{"hello":"Hallo"}'), 'update');

  assert.equal(result.changed, true);
  assert.equal(await readFile(targetPath, 'utf8'), '{"hello":"Hallo"}');
});

test('check mode detects changes without writing target file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'doloc-action-'));
  const targetPath = join(directory, 'de.json');
  await writeFile(targetPath, '{}');

  const result = await applyTranslation({ targetPath }, Buffer.from('{"hello":"Hallo"}'), 'check');

  assert.equal(result.changed, true);
  assert.equal(await readFile(targetPath, 'utf8'), '{}');
});
