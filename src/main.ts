import * as core from '@actions/core';
import { applyTranslation, ProcessResult } from './check-mode';
import { translateFile } from './doloc-api';
import { ActionError } from './errors';
import { resolveFileMappings } from './file-mapping';
import { readInputs } from './inputs';
import { setOutputs, writeSummary } from './summary';

export async function run(): Promise<void> {
  const inputs = readInputs();
  const mappings = resolveFileMappings(inputs);
  const results: ProcessResult[] = [];

  for (const mapping of mappings) {
    core.info(`Translating ${mapping.targetPath}${mapping.targetLang ? ` (${mapping.targetLang})` : ''}`);
    const translated = await translateFile({ mapping, inputs, token: inputs.token });
    results.push(await applyTranslation(mapping, translated, inputs.mode));
  }

  setOutputs(results, 'token');
  await writeSummary(results, inputs.mode, 'token');

  const changedFiles = results.filter(result => result.changed).map(result => result.target);
  if (changedFiles.length > 0 && inputs.failOnChange) {
    throw new ActionError(`Translations are not up to date. Changed files:\n${changedFiles.join('\n')}`);
  }
}

run().catch(error => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
