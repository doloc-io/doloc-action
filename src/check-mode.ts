import { readFile, writeFile } from 'node:fs/promises';
import { FileMapping } from './file-mapping';

export interface ProcessResult {
  source?: string;
  target: string;
  targetLang?: string;
  changed: boolean;
}

export async function applyTranslation(mapping: FileMapping, translated: Buffer, mode: 'update' | 'check'): Promise<ProcessResult> {
  const current = await readFile(mapping.targetPath);
  const changed = !current.equals(translated);

  if (changed && mode === 'update') {
    await writeFile(mapping.targetPath, translated);
  }

  return {
    source: mapping.sourcePath,
    target: mapping.targetPath,
    targetLang: mapping.targetLang,
    changed,
  };
}
