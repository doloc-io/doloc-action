import test from 'node:test';
import assert from 'node:assert/strict';
import { readInputs } from '../src/inputs';

test('requires a registered doloc API token', () => {
  const previousToken = process.env.INPUT_TOKEN;
  delete process.env.INPUT_TOKEN;

  try {
    assert.throws(() => readInputs(), /No doloc API token was provided/);
  } finally {
    restoreEnv('INPUT_TOKEN', previousToken);
  }
});

test('defaults fail-on-change to true in check mode only', () => {
  const previousToken = process.env.INPUT_TOKEN;
  const previousMode = process.env.INPUT_MODE;
  const previousFailOnChange = process.env['INPUT_FAIL-ON-CHANGE'];

  try {
    process.env.INPUT_TOKEN = 'token';
    process.env.INPUT_MODE = 'check';
    delete process.env['INPUT_FAIL-ON-CHANGE'];
    assert.equal(readInputs().failOnChange, true);

    process.env.INPUT_MODE = 'update';
    assert.equal(readInputs().failOnChange, false);
  } finally {
    restoreEnv('INPUT_TOKEN', previousToken);
    restoreEnv('INPUT_MODE', previousMode);
    restoreEnv('INPUT_FAIL-ON-CHANGE', previousFailOnChange);
  }
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
