import { existsSync } from 'node:fs';
import { ActionError } from './errors';
import { Inputs } from './inputs';

export interface FileMapping {
  sourcePath?: string;
  targetPath: string;
  targetLang?: string;
}

export function resolveFileMappings(inputs: Inputs): FileMapping[] {
  const mappings: FileMapping[] = [];

  if (inputs.target) {
    mappings.push({
      sourcePath: inputs.source,
      targetPath: inputs.target,
      targetLang: inputs.targetLang,
    });
  }

  mappings.push(...parseTargets(inputs.targets, inputs.source));

  if (mappings.length === 0) {
    throw new ActionError('No target file was configured. Provide `target` or `targets`.');
  }

  const seen = new Set<string>();
  for (const mapping of mappings) {
    if (seen.has(mapping.targetPath)) {
      throw new ActionError(`Target file is configured more than once: ${mapping.targetPath}`);
    }
    seen.add(mapping.targetPath);

    if (mapping.sourcePath && !existsSync(mapping.sourcePath)) {
      throw new ActionError(`Source file not found: ${mapping.sourcePath}. Configure the correct source path.`);
    }

    if (!existsSync(mapping.targetPath)) {
      throw new ActionError(`Target file not found: ${mapping.targetPath}. Create the file first, for example with {}, or configure the correct path.`);
    }
  }

  return mappings;
}

function parseTargets(targets: string, defaultSource?: string): FileMapping[] {
  return targets
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => parseTargetLine(line, defaultSource));
}

function parseTargetLine(line: string, defaultSource?: string): FileMapping {
  const [sourcePart, targetPart] = splitSourceAndTarget(line);
  const { path: targetPath, lang } = splitLanguage(targetPart);

  if (!targetPath) {
    throw new ActionError(`Invalid target mapping: ${line}`);
  }

  return {
    sourcePath: sourcePart || defaultSource,
    targetPath,
    targetLang: lang,
  };
}

function splitSourceAndTarget(line: string): [string | undefined, string] {
  const separator = line.indexOf('=>');
  if (separator === -1) {
    return [undefined, line.trim()];
  }

  const source = line.slice(0, separator).trim();
  const target = line.slice(separator + 2).trim();
  if (!source || !target) {
    throw new ActionError(`Invalid target mapping: ${line}`);
  }

  return [source, target];
}

function splitLanguage(value: string): { path: string; lang?: string } {
  const separator = value.lastIndexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    return { path: value.trim() };
  }

  return {
    path: value.slice(0, separator).trim(),
    lang: value.slice(separator + 1).trim(),
  };
}
