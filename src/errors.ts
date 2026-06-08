export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

export function assertPresent(value: string, message: string): string {
  if (!value.trim()) {
    throw new ActionError(message);
  }

  return value.trim();
}
