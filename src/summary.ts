import * as core from '@actions/core';
import { ProcessResult } from './check-mode';

export async function writeSummary(results: ProcessResult[], mode: string, authMode: string): Promise<void> {
  const changedFiles = results.filter(result => result.changed).map(result => result.target);

  core.summary
    .addHeading('doloc translation summary', 2)
    .addRaw(`Mode: ${mode}\n`)
    .addRaw(`Processed files: ${results.length}\n`)
    .addRaw(`Changed files: ${changedFiles.length}\n\n`)
    .addTable([
      [
        { data: 'Source', header: true },
        { data: 'Target', header: true },
        { data: 'Language', header: true },
        { data: 'Status', header: true },
      ],
      ...results.map(result => [
        result.source || 'target only',
        result.target,
        result.targetLang || 'auto',
        result.changed ? 'changed' : 'unchanged',
      ]),
    ]);

  if (mode === 'update') {
    core.summary.addRaw('\nNext step: commit the changed files, inspect the diff, or use check mode in CI.\n');
  } else if (changedFiles.length > 0) {
    core.summary.addRaw('\nNext step: run doloc in update mode and commit the changed target files.\n');
  }

  await core.summary.write();
}

export function setOutputs(results: ProcessResult[], authMode: string): void {
  const changedFiles = results.filter(result => result.changed).map(result => result.target);
  core.setOutput('changed', changedFiles.length > 0 ? 'true' : 'false');
  core.setOutput('changed-files', changedFiles.join('\n'));
  core.setOutput('processed-files', String(results.length));
}
