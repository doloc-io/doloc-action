import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFileMappings } from '../src/file-mapping';
import { Inputs } from '../src/inputs';

test('resolves global source with multiline targets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'doloc-action-'));
  const langDirectory = join(directory, 'src/lang');
  await mkdir(langDirectory, { recursive: true });
  const source = join(langDirectory, 'en.json');
  const de = join(langDirectory, 'de.json');
  const fr = join(langDirectory, 'fr.json');
  await writeFile(source, '{}');
  await writeFile(de, '{}');
  await writeFile(fr, '{}');

  const mappings = resolveFileMappings({
    ...baseInputs(),
    source,
    targets: `${de}:de\n${fr}:fr`,
  });

  assert.deepEqual(mappings, [
    { sourcePath: source, targetPath: de, targetLang: 'de' },
    { sourcePath: source, targetPath: fr, targetLang: 'fr' },
  ]);
});

test('supports per-target source mapping', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'doloc-action-'));
  const source = join(directory, 'en.json');
  const target = join(directory, 'de.json');
  await writeFile(source, '{}');
  await writeFile(target, '{}');

  const mappings = resolveFileMappings({
    ...baseInputs(),
    targets: `${source} => ${target}:de`,
  });

  assert.deepEqual(mappings, [{ sourcePath: source, targetPath: target, targetLang: 'de' }]);
});

function baseInputs(): Inputs {
  return {
    token: 'token',
    targets: '',
    mode: 'update',
    options: new URLSearchParams(),
    failOnChange: false,
  };
}
