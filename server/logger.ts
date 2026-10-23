const MAX_MESSAGE_LENGTH = 200;

/** Structured (JSON-lines) error log. Never pass secrets, tokens or full upstream payloads. */
export function logError(event: string, error: unknown, fields: Record<string, string | number> = {}): void {
  const name = error instanceof Error ? error.name : 'NonError';
  const message = error instanceof Error ? error.message.slice(0, MAX_MESSAGE_LENGTH) : '';
  console.error(JSON.stringify({ level: 'error', event, errorName: name, errorMessage: message, ...fields }));
}
