import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { ActionError } from './errors';
import { FileMapping } from './file-mapping';
import { Inputs } from './inputs';

const DOLOC_API_URL = 'https://api.doloc.io';

export interface TranslationRequest {
  mapping: FileMapping;
  inputs: Inputs;
  token: string;
}

export async function translateFile(request: TranslationRequest): Promise<Buffer> {
  const url = buildRequestUrl(request.inputs, request.mapping);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${request.token}`,
      Accept: 'application/octet-stream',
      'User-Agent': 'doloc-action/0.1.0',
      'X-Doloc-Client': 'github-action',
    },
    body: await createBody(request.mapping),
  });

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new ActionError(formatApiError(response.status, bytes.toString('utf8')));
  }

  return bytes;
}

function buildRequestUrl(inputs: Inputs, mapping: FileMapping): string {
  const url = new URL(DOLOC_API_URL);
  copyParams(inputs.options, url.searchParams);

  if (inputs.sourceLang) {
    url.searchParams.set('sourceLang', inputs.sourceLang);
  }

  const targetLang = mapping.targetLang || inputs.targetLang;
  if (targetLang) {
    url.searchParams.set('targetLang', targetLang);
  }

  return url.toString();
}

function copyParams(from: URLSearchParams, to: URLSearchParams): void {
  for (const [key, value] of from.entries()) {
    to.append(key, value);
  }
}

async function createBody(mapping: FileMapping): Promise<BodyInit> {
  const targetBytes = await readFile(mapping.targetPath);

  if (!mapping.sourcePath) {
    return targetBytes;
  }

  const sourceBytes = await readFile(mapping.sourcePath);
  const formData = new FormData();
  formData.append('source', new Blob([sourceBytes]), basename(mapping.sourcePath));
  formData.append('target', new Blob([targetBytes]), basename(mapping.targetPath));

  return formData;
}

function formatApiError(status: number, body: string): string {
  const message = body.trim();

  if (status === 401) {
    return 'doloc API authentication failed. Check that DOLOC_API_TOKEN is valid and passed as `token`.';
  }

  if (status === 429) {
    return `doloc API rate limit or quota exceeded.${message ? `\n\n${message}` : ''}`;
  }

  return `doloc API request failed with HTTP ${status}.${message ? `\n\n${message}` : ''}`;
}
