import express, { type ErrorRequestHandler, type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import {
  MAX_SYMBOLS_PER_REQUEST,
  SymbolSchema,
  TimeWindowSchema,
  type ErrorCode,
  type ErrorResponse,
} from '../shared/schemas.ts';
import { HTTP_STATUS_BY_CODE, MarketDataError, PUBLIC_MESSAGE_BY_CODE } from './errors.ts';
import { logError } from './logger.ts';
import type { MarketDataService } from './services/marketDataService.ts';

const QuotesQuerySchema = z.object({
  symbols: z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(SymbolSchema).min(1).max(MAX_SYMBOLS_PER_REQUEST)),
});

const HistoryQuerySchema = z.object({
  symbol: SymbolSchema,
  window: TimeWindowSchema,
});

function sendError(res: express.Response, code: ErrorCode): void {
  const body: ErrorResponse = { error: { code, message: PUBLIC_MESSAGE_BY_CODE[code] } };
  res.status(HTTP_STATUS_BY_CODE[code]).json(body);
}

export interface AppOptions {
  service: MarketDataService;
  /** Requests allowed per client per minute. */
  rateLimitPerMinute?: number;
}

export function createApp({ service, rateLimitPerMinute = 120 }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => sendError(res, 'RATE_LIMITED'),
    }),
  );

  app.get('/api/quotes', async (req, res) => {
    const query = QuotesQuerySchema.parse(req.query);
    res.json({ quotes: await service.getQuotes(query.symbols) });
  });

  app.get('/api/history', async (req, res) => {
    const query = HistoryQuerySchema.parse(req.query);
    res.json(await service.getHistory(query.symbol, query.window));
  });

  app.use('/api', (_req, res) => sendError(res, 'BAD_REQUEST'));

  // Express 5 forwards rejected async handlers here. Details are logged; clients get generic text.
  const onError: ErrorRequestHandler = (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof z.ZodError) {
      sendError(res, 'BAD_REQUEST');
      return;
    }
    if (error instanceof MarketDataError) {
      logError('market_data_error', error.cause ?? error, { code: error.code, path: req.path });
      sendError(res, error.code);
      return;
    }
    logError('unhandled_error', error, { path: req.path });
    sendError(res, 'INTERNAL_ERROR');
  };
  app.use(onError);

  return app;
}
