import * as core from '@actions/core';
import { ActionError, assertPresent } from './errors';

export type Mode = 'update' | 'check';

export interface Inputs {
  token: string;
  source?: string;
  target?: string;
  targets: string;
  sourceLang?: string;
  targetLang?: string;
  mode: Mode;
  options: URLSearchParams;
  failOnChange: boolean;
}

export function readInputs(): Inputs {
  const mode = readMode(core.getInput('mode') || 'update');
  const token = assertPresent(
    core.getInput('token'),
    'No doloc API token was provided. Please provide one using the "token" input. E.g. "token: ${{ secrets.DOLOC_API_TOKEN }}"',
  );

  core.setSecret(token);

  const failOnChangeInput = core.getInput('fail-on-change');
  const failOnChange = failOnChangeInput ? parseBoolean(failOnChangeInput, 'fail-on-change') : mode === 'check';

  return {
    token,
    source: optionalInput('source'),
    target: optionalInput('target'),
    targets: core.getInput('targets'),
    sourceLang: optionalInput('source-lang'),
    targetLang: optionalInput('target-lang'),
    mode,
    options: parseOptions(core.getInput('options')),
    failOnChange,
  };
}

function optionalInput(name: string): string | undefined {
  const value = core.getInput(name).trim();
  return value || undefined;
}

function readMode(value: string): Mode {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'update' || normalized === 'check') {
    return normalized;
  }

  throw new ActionError(`Invalid mode: ${value}. Use "update" or "check".`);
}

function parseBoolean(value: string, inputName: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  throw new ActionError(`Invalid ${inputName}: ${value}. Use true or false.`);
}

function parseOptions(options: string): URLSearchParams {
  const params = new URLSearchParams();

  for (const rawLine of options.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const withoutQuestionMark = line.startsWith('?') ? line.slice(1) : line;
    for (const part of withoutQuestionMark.split('&')) {
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }

      const separator = trimmed.indexOf('=');
      if (separator === -1) {
        params.append(trimmed, '');
      } else {
        params.append(trimmed.slice(0, separator), trimmed.slice(separator + 1));
      }
    }
  }

  return params;
}
