import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { translateFile } from '../src/doloc-api';
import { Inputs } from '../src/inputs';

test('sends source and target as multipart request with token auth', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'doloc-action-'));
  const sourcePath = join(directory, 'en.json');
  const targetPath = join(directory, 'de.json');
  await writeFile(sourcePath, '{"hello":"Hello"}');
  await writeFile(targetPath, '{}');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.doloc.io');
    assert.equal(url.searchParams.get('sourceLang'), 'en');
    assert.equal(url.searchParams.get('targetLang'), 'de');
    assert.equal(url.searchParams.get('untranslated'), 'no-state,needs-translation');
    assert.equal(url.searchParams.get('newState'), 'translated');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer token');
    assert.ok(init?.body instanceof FormData);
    assert.deepEqual(
      Array.from((init.body as FormData).keys()),
      ['source', 'target'],
    );

    return new Response('translated', { status: 200 });
  };

  try {
    const translated = await translateFile({
      token: 'token',
      inputs: {
        ...baseInputs(),
        sourceLang: 'en',
        options: new URLSearchParams('untranslated=no-state%2Cneeds-translation&newState=translated'),
      },
      mapping: {
        sourcePath,
        targetPath,
        targetLang: 'de',
      },
    });

    assert.equal(translated.toString('utf8'), 'translated');
  } finally {
    globalThis.fetch = originalFetch;
  }
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
