import { createApp } from './app.ts';
import { createTtlCache } from './cache.ts';
import { createYahooProvider } from './providers/yahooProvider.ts';
import { createMarketDataService } from './services/marketDataService.ts';

// Loopback only: never bind to all interfaces.
const HOST = '127.0.0.1';
const DEFAULT_PORT = 8787;

function readPort(): number {
  const raw = process.env.PORT;
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

const service = createMarketDataService({
  provider: createYahooProvider(),
  cache: createTtlCache(),
});

const port = readPort();
const server = createApp({ service }).listen(port, HOST, () => {
  console.log(JSON.stringify({ level: 'info', event: 'server_listening', host: HOST, port }));
});

function shutdown(): void {
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
