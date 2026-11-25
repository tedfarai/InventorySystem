import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { InventoryBackend, verifyUser } from './server/inventoryBackend.ts';
import type { AdminUser } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_MODEL = 'gemini-4-hydrogen';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 45_000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getHttpStatusFromGeminiError(error: unknown): { status: number; message: string } {
  const rawMessage = error instanceof Error ? error.message : String(error || 'Unknown Gemini API error');
  const lower = rawMessage.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API authentication failed. Verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API rate limit or quota reached. Wait a moment and retry.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: `Requested Gemini model (${GEMINI_MODEL}) was unavailable.`,
    };
  }
  if (lower.includes('invalid_argument') || lower.includes('400')) {
    return {
      status: 400,
      message: 'The forecast request payload could not be processed by Gemini.',
    };
  }
  return {
    status: 502,
    message: rawMessage || 'Upstream Gemini AI service failed to generate forecast.',
  };
}

async function generateWithRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
      const isTransient =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('unavailable') ||
        msg.includes('timeout') ||
        msg.includes('econnreset');
      if (!isTransient || attempt >= maxRetries) {
        throw error;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }
  throw lastError;
}

interface SanitizedCategoryPayload {
  category: string;
  skuCount: number;
  totalCurrentStock: number;
  totalReorderLevel: number;
  itemsBelowThreshold: number;
  outOfStockCount: number;
  totalIssuedUnits: number;
  totalReceivedUnits: number;
  issueTransactionCount: number;
  deliveryCount: number;
  avgDailyBurnRate: number;
  recentHalfDailyBurn: number;
  priorHalfDailyBurn: number;
  velocityMomentum: string;
  peakWeekday: string;
  peakSingleDayIssue: number;
  estimatedCoverDays: number | null;
  estimatedDaysUntilReorder: number | null;
  baselineOptimalReorderDate: string | null;
  recommendedBaselineQty: number;
  hasSufficientHistory: boolean;
  topPriorityItems: Array<{
    itemID: string;
    itemName: string;
    currentQty: number;
    reorderLevel: number;
    unit: string;
    avgDailyBurn: number;
    daysUntilThreshold: number | null;
  }>;
  recentDailySeries: Array<{
    dateIso: string;
    issuedQty: number;
    receivedQty: number;
  }>;
}

function sanitizeNumber(value: unknown, fallback = 0, min = -1_000_000, max = 10_000_000): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function sanitizeCategoryPayload(raw: unknown): SanitizedCategoryPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const category = typeof obj.category === 'string' ? obj.category.trim().slice(0, 64) : '';
  if (!category) return null;

  const rawItems = Array.isArray(obj.topPriorityItems) ? obj.topPriorityItems.slice(0, 8) : [];
  const topPriorityItems = rawItems
    .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
    .map((it) => ({
      itemID: String(it.itemID || '').slice(0, 32),
      itemName: String(it.itemName || '').slice(0, 100),
      currentQty: sanitizeNumber(it.currentQty, 0, 0),
      reorderLevel: sanitizeNumber(it.reorderLevel, 0, 0),
      unit: String(it.unit || 'Units').slice(0, 24),
      avgDailyBurn: sanitizeNumber(it.avgDailyBurn, 0, 0),
      daysUntilThreshold:
        it.daysUntilThreshold === null || it.daysUntilThreshold === undefined
          ? null
          : sanitizeNumber(it.daysUntilThreshold, 0, 0, 3650),
    }));

  const rawSeries = Array.isArray(obj.recentDailySeries) ? obj.recentDailySeries.slice(-25) : [];
  const recentDailySeries = rawSeries
    .filter((pt): pt is Record<string, unknown> => Boolean(pt && typeof pt === 'object'))
    .map((pt) => ({
      dateIso: String(pt.dateIso || '').slice(0, 16),
      issuedQty: sanitizeNumber(pt.issuedQty, 0, 0),
      receivedQty: sanitizeNumber(pt.receivedQty, 0, 0),
    }));

  return {
    category,
    skuCount: sanitizeNumber(obj.skuCount, 0, 0, 10000),
    totalCurrentStock: sanitizeNumber(obj.totalCurrentStock, 0, 0),
    totalReorderLevel: sanitizeNumber(obj.totalReorderLevel, 0, 0),
    itemsBelowThreshold: sanitizeNumber(obj.itemsBelowThreshold, 0, 0, 10000),
    outOfStockCount: sanitizeNumber(obj.outOfStockCount, 0, 0, 10000),
    totalIssuedUnits: sanitizeNumber(obj.totalIssuedUnits, 0, 0),
    totalReceivedUnits: sanitizeNumber(obj.totalReceivedUnits, 0, 0),
    issueTransactionCount: sanitizeNumber(obj.issueTransactionCount, 0, 0),
    deliveryCount: sanitizeNumber(obj.deliveryCount, 0, 0),
    avgDailyBurnRate: sanitizeNumber(obj.avgDailyBurnRate, 0, 0),
    recentHalfDailyBurn: sanitizeNumber(obj.recentHalfDailyBurn, 0, 0),
    priorHalfDailyBurn: sanitizeNumber(obj.priorHalfDailyBurn, 0, 0),
    velocityMomentum: String(obj.velocityMomentum || 'Steady').slice(0, 24),
    peakWeekday: String(obj.peakWeekday || 'N/A').slice(0, 24),
    peakSingleDayIssue: sanitizeNumber(obj.peakSingleDayIssue, 0, 0),
    estimatedCoverDays:
      obj.estimatedCoverDays === null || obj.estimatedCoverDays === undefined
        ? null
        : sanitizeNumber(obj.estimatedCoverDays, 0, 0, 3650),
    estimatedDaysUntilReorder:
      obj.estimatedDaysUntilReorder === null || obj.estimatedDaysUntilReorder === undefined
        ? null
        : sanitizeNumber(obj.estimatedDaysUntilReorder, 0, 0, 3650),
    baselineOptimalReorderDate:
      typeof obj.baselineOptimalReorderDate === 'string'
        ? obj.baselineOptimalReorderDate.slice(0, 16)
        : null,
    recommendedBaselineQty: sanitizeNumber(obj.recommendedBaselineQty, 0, 0),
    hasSufficientHistory: Boolean(obj.hasSufficientHistory),
    topPriorityItems,
    recentDailySeries,
  };
}

async function startServer() {
  const inventory = await InventoryBackend.open();
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  const readSessionToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken) return bearerToken;
    }
    const cookieHeader = req.headers.cookie || '';
    const pair = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('inventory_session='));
    if (!pair) return null;
    try {
      return decodeURIComponent(pair.slice('inventory_session='.length));
    } catch {
      return null;
    }
  };
  const readAllSessionTokens = (req: Request): string[] => {
    const tokens = new Set<string>();
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken) tokens.add(bearerToken);
    }
    const cookieHeader = req.headers.cookie || '';
    const pair = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('inventory_session='));
    if (pair) {
      try {
        const cookieToken = decodeURIComponent(pair.slice('inventory_session='.length));
        if (cookieToken) tokens.add(cookieToken);
      } catch {
        // Ignore malformed cookie token.
      }
    }
    return Array.from(tokens);
  };
  const authenticatedUser = (req: Request): AdminUser | null => inventory.getSession(readSessionToken(req));
  const requireUser = (req: Request, res: Response): AdminUser | null => {
    const user = authenticatedUser(req);
    if (!verifyUser(user)) {
      res.status(401).json({ error: 'Authentication required.' });
      return null;
    }
    return user;
  };
  const requireSuperiorAdmin = (req: Request, res: Response): AdminUser | null => {
    const user = requireUser(req, res);
    if (!user) return null;
    if (user.IssuerID !== 'ADM001') {
      res.status(403).json({ error: 'Only the superior administrator may perform this action.' });
      return null;
    }
    return user;
  };
  const normalizeHost = (rawHost: string, isHttps: boolean): string => {
    const lower = rawHost.trim().toLowerCase();
    if (isHttps && lower.endsWith(':443')) return lower.slice(0, -4);
    if (!isHttps && lower.endsWith(':80')) return lower.slice(0, -3);
    return lower;
  };
  const isHttpsRequest = (req: Request): boolean => {
    if (req.secure) return true;
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    if (forwardedProto.split(',').some((part) => part.trim() === 'https')) return true;
    const origin = req.get('origin') || '';
    return origin.startsWith('https://');
  };
  const getAllowedHosts = (req: Request): Set<string> => {
    const https = isHttpsRequest(req);
    const hosts = new Set<string>();
    const addHeaderHosts = (raw?: string | string[]) => {
      if (!raw) return;
      const list = Array.isArray(raw) ? raw : [raw];
      for (const entry of list) {
        for (const part of entry.split(',')) {
          const normalized = normalizeHost(part, https);
          if (normalized) hosts.add(normalized);
        }
      }
    };
    addHeaderHosts(req.get('host'));
    addHeaderHosts(req.headers['x-forwarded-host']);
    return hosts;
  };
  const requireSameOrigin = (req: Request, res: Response): boolean => {
    const origin = req.get('origin');
    if (!origin) return true;
    try {
      const parsedOrigin = new URL(origin);
      const originHost = normalizeHost(parsedOrigin.host, parsedOrigin.protocol === 'https:');
      if (getAllowedHosts(req).has(originHost)) return true;
    } catch {
      // Reject malformed origins.
    }
    res.status(403).json({ error: 'Cross-origin request rejected.' });
    return false;
  };
  const sessionCookie = (req: Request, token: string, maxAgeSeconds: number) => {
    if (isHttpsRequest(req) || process.env.NODE_ENV === 'production') {
      return `inventory_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=${maxAgeSeconds}`;
    }
    return `inventory_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
  };

  app.get('/api/auth/users', (_req: Request, res: Response) => {
    res.json({
      users: inventory.listUsers().filter((user) => user.Active),
      needsSetup: inventory.needsInitialSetup(),
    });
  });

  app.post('/api/auth/setup', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    if (!inventory.needsInitialSetup()) {
      res.status(409).json({ error: 'Administrator account already exists. Please sign in.' });
      return;
    }
    const { issuerId, issuerName, role, password } = req.body || {};
    if (typeof issuerName !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Administrator name and password are required.' });
      return;
    }
    try {
      const session = await inventory.setupInitialAdmin({
        issuerId: typeof issuerId === 'string' ? issuerId : undefined,
        issuerName,
        role: typeof role === 'string' ? role : undefined,
        password,
      });
      res.setHeader('Set-Cookie', sessionCookie(req, session.token, 12 * 60 * 60));
      res.status(201).json({ user: session.user, token: session.token, expiresAt: session.expiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initial setup failed.';
      res.status(message.includes('already configured') ? 409 : 400).json({ error: message });
    }
  });

  app.get('/api/auth/session', (req: Request, res: Response) => {
    const user = authenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'No active session.' });
      return;
    }
    res.json({ user });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    const issuerId = typeof req.body?.issuerId === 'string' ? req.body.issuerId : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!issuerId || !password) {
      res.status(400).json({ error: 'User ID and password are required.' });
      return;
    }
    try {
      const session = await inventory.login(issuerId, password, req.ip || 'unknown');
      res.setHeader('Set-Cookie', sessionCookie(req, session.token, 12 * 60 * 60));
      res.json({ user: session.user, token: session.token, expiresAt: session.expiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed.';
      res.status(message.startsWith('Too many') ? 429 : 401).json({ error: message });
    }
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    for (const token of readAllSessionTokens(req)) {
      await inventory.logout(token);
    }
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    res.status(204).end();
  });

  app.post('/api/auth/password', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    const user = requireUser(req, res);
    if (!user) return;
    if (typeof req.body?.currentPassword !== 'string' || typeof req.body?.newPassword !== 'string') {
      res.status(400).json({ error: 'Current and new passwords are required.' });
      return;
    }
    try {
      await inventory.changePassword(user, req.body.currentPassword, req.body.newPassword);
      res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Password update failed.' });
    }
  });

  app.post('/api/admin/users', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    if (!requireSuperiorAdmin(req, res)) return;
    const { issuerId, issuerName, role, password } = req.body || {};
    if (![issuerId, issuerName, role, password].every((value) => typeof value === 'string' && value.trim())) {
      res.status(400).json({ error: 'User ID, name, role, and initial password are required.' });
      return;
    }
    const user: AdminUser = {
      IssuerID: issuerId.trim().toUpperCase(),
      IssuerName: issuerName.trim(),
      Role: role.trim(),
      Active: true,
    };
    try {
      await inventory.addUser(user, password);
      res.status(201).json({ user });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Could not create user.' });
    }
  });

  app.patch('/api/admin/users/:issuerId', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    if (!requireSuperiorAdmin(req, res)) return;
    const { issuerName, role, active } = req.body || {};
    if (typeof issuerName !== 'string' || typeof role !== 'string' || typeof active !== 'boolean') {
      res.status(400).json({ error: 'Name, role, and active status are required.' });
      return;
    }
    try {
      const user: AdminUser = {
        IssuerID: req.params.issuerId.toUpperCase(),
        IssuerName: issuerName.trim(),
        Role: role.trim(),
        Active: active,
      };
      await inventory.updateUser(user);
      const updated = inventory.getUser(user.IssuerID);
      if (!updated) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      res.json({ user: updated });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Could not update user.' });
    }
  });

  app.delete('/api/admin/users/:issuerId', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    if (!requireSuperiorAdmin(req, res)) return;
    try {
      await inventory.deleteUser(req.params.issuerId.toUpperCase());
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Could not delete user.' });
    }
  });

  app.post('/api/admin/users/:issuerId/password', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    if (!requireSuperiorAdmin(req, res)) return;
    if (typeof req.body?.password !== 'string') {
      res.status(400).json({ error: 'A new password is required.' });
      return;
    }
    try {
      await inventory.replacePassword(req.params.issuerId.toUpperCase(), req.body.password);
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Could not reset password.' });
    }
  });

  app.get('/api/state', (_req: Request, res: Response) => {
    res.json(inventory.getState());
  });

  app.put('/api/state', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const result = await inventory.commitState(user, req.body?.expectedRevision, req.body?.state);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not commit inventory state.';
      res.status(message.startsWith('Inventory changed') ? 409 : 403).json({ error: message });
    }
  });

  app.post('/api/state/import', async (req: Request, res: Response) => {
    if (!requireSameOrigin(req, res)) return;
    const user = requireSuperiorAdmin(req, res);
    if (!user) return;
    try {
      res.json(await inventory.importState(user, req.body?.state));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Import failed.' });
    }
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
      model: GEMINI_MODEL,
    });
  });

  app.post('/api/ai/category-reorder-forecast', async (req: Request, res: Response) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: 'MISSING_API_KEY',
        error:
          'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to run AI demand forecasting.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Request body must be a JSON object.' });
      return;
    }

    const referenceDateIso =
      typeof body.referenceDateIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.referenceDateIso)
        ? body.referenceDateIso
        : new Date().toISOString().slice(0, 10);

    const analysisWindowDays = sanitizeNumber(body.analysisWindowDays, 60, 7, 365);
    const leadTimeDays = sanitizeNumber(body.leadTimeDays, 5, 1, 60);
    const safetyBufferDays = sanitizeNumber(body.safetyBufferDays, 7, 0, 60);

    const rawCategories = Array.isArray(body.categories) ? body.categories.slice(0, 15) : [];
    const categories = rawCategories
      .map(sanitizeCategoryPayload)
      .filter((c): c is SanitizedCategoryPayload => c !== null);

    if (categories.length === 0) {
      res.status(400).json({
        error: 'At least one stock category with telemetry is required for forecasting.',
      });
      return;
    }

    const promptPayload = {
      referenceDateIso,
      analysisWindowDays,
      leadTimeDays,
      safetyBufferDays,
      categories,
    };

    try {
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents:
            'Analyze the following warehouse movement log summaries by stock category and determine optimal reorder dates, order window start dates, urgency levels, predicted 30-day demand, recommended reorder quantities, and concise pattern insights for each category.\n\n' +
            JSON.stringify(promptPayload),
          config: {
            systemInstruction:
              'You are an expert inventory demand planner for Paramount Exports (stationery, cleaning, and general supplies). ' +
              'Base every date and recommendation strictly on the provided historical movement log patterns, burn-rate momentum (recentHalfDailyBurn vs priorHalfDailyBurn), weekday peaks, current stock vs safety thresholds, supplier leadTimeDays, and safetyBufferDays relative to referenceDateIso. ' +
              'Return valid YYYY-MM-DD dates on or after referenceDateIso for optimalReorderDate and orderWindowStartDate (orderWindowStartDate should not be later than optimalReorderDate). ' +
              'If itemsBelowThreshold > 0 or outOfStockCount > 0, urgencyLevel must be IMMEDIATE and optimalReorderDate should equal referenceDateIso. ' +
              'If issueTransactionCount < 2 or totalIssuedUnits === 0, set urgencyLevel to INSUFFICIENT_DATA unless items are already below threshold, set confidenceLevel to LOW, and explain the limited log history clearly without fabricating fake demand spikes. ' +
              'Keep executiveSummary concise (2-3 sentences), forecastHorizonNote to 1 clear disclaimer sentence noting estimates depend on historical patterns, patternAnalysis to 1-2 sentences, keyDrivers to 2-3 short factual bullets, and actionRecommendation to 1 concrete procurement step.',
            responseMimeType: 'application/json',
            seed: 42,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                forecastHorizonNote: { type: Type.STRING },
                categoryForecasts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      optimalReorderDate: { type: Type.STRING },
                      orderWindowStartDate: { type: Type.STRING },
                      urgencyLevel: {
                        type: Type.STRING,
                        enum: ['IMMEDIATE', 'SOON', 'PLANNED', 'ADEQUATE', 'INSUFFICIENT_DATA'],
                      },
                      predictedNext30DayDemand: { type: Type.NUMBER },
                      recommendedOrderQty: { type: Type.NUMBER },
                      confidenceLevel: {
                        type: Type.STRING,
                        enum: ['HIGH', 'MEDIUM', 'LOW'],
                      },
                      patternAnalysis: { type: Type.STRING },
                      keyDrivers: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      actionRecommendation: { type: Type.STRING },
                    },
                    required: [
                      'category',
                      'optimalReorderDate',
                      'orderWindowStartDate',
                      'urgencyLevel',
                      'predictedNext30DayDemand',
                      'recommendedOrderQty',
                      'confidenceLevel',
                      'patternAnalysis',
                      'keyDrivers',
                      'actionRecommendation',
                    ],
                  },
                },
              },
              required: ['executiveSummary', 'forecastHorizonNote', 'categoryForecasts'],
            },
          },
        })
      );

      const text = (response.text || '').trim();
      if (!text) {
        res.status(502).json({ error: 'Gemini returned an empty forecast response.' });
        return;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        res.status(502).json({ error: 'Gemini response could not be parsed as structured JSON.' });
        return;
      }

      res.json({
        model: GEMINI_MODEL,
        generatedAt: new Date().toISOString(),
        referenceDateIso,
        executiveSummary: String(parsed.executiveSummary || ''),
        forecastHorizonNote: String(
          parsed.forecastHorizonNote ||
            'Forecast dates are estimates derived from historical movement logs and configured lead-time assumptions.'
        ),
        categoryForecasts: Array.isArray(parsed.categoryForecasts) ? parsed.categoryForecasts : [],
      });
    } catch (error) {
      console.error('[AI Category Reorder Forecast] Gemini API error:', error);
      const mapped = getHttpStatusFromGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/ai-insights', async (req: Request, res: Response) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: 'MISSING_API_KEY',
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid request body.' });
      return;
    }

    const criticalCount = sanitizeNumber(body.criticalCount, 0, 0, 10000);
    const totalItems = sanitizeNumber(body.totalItems, 0, 0, 100000);
    const sixMonthDemand = sanitizeNumber(body.sixMonthDemand, 0, 0);
    const topLowStock = Array.isArray(body.topLowStock) ? body.topLowStock.slice(0, 10) : [];

    try {
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents:
            'Generate a concise procurement executive memo from these inventory analytics:\n' +
            JSON.stringify({ criticalCount, totalItems, sixMonthDemand, topLowStock }),
          config: {
            systemInstruction:
              'You are a procurement operations advisor for Paramount Exports. Provide practical, concise replenishment guidance grounded only in the supplied figures.',
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                criticalRecommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                quarterlyBudgetNotes: { type: Type.STRING },
              },
              required: ['executiveSummary', 'criticalRecommendations', 'quarterlyBudgetNotes'],
            },
          },
        })
      );

      const text = (response.text || '').trim();
      const parsed = JSON.parse(text || '{}') as Record<string, unknown>;
      res.json({
        memo: {
          executiveSummary: String(parsed.executiveSummary || ''),
          criticalRecommendations: Array.isArray(parsed.criticalRecommendations)
            ? parsed.criticalRecommendations.map(String)
            : [],
          quarterlyBudgetNotes: String(parsed.quarterlyBudgetNotes || ''),
          generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      });
    } catch (error) {
      console.error('[AI Insights Memo] Gemini API error:', error);
      const mapped = getHttpStatusFromGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Paramount Exports server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
