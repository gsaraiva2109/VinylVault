import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { userApiKeys } from '../db/schema';
import { encrypt, decrypt } from '../services/encryption';
import { requireWriteAccess } from '../middleware/requireWriteAccess';
import { logger } from '../logger';

const log = logger.child({ module: 'ai' });

// Rate limiting: 30 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const RATE_PRUNE_INTERVAL_MS = 300_000; // prune stale entries every 5 min

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key)
  }
}, RATE_PRUNE_INTERVAL_MS).unref()

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Validate the user is authenticated
function getUserId(req: Request): string {
  return req.user?.sub ?? '';
}

const router = Router();

// POST /api/ai/save-key — encrypt and store API key
router.post('/ai/save-key', requireWriteAccess, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { provider, apiKey } = req.body as { provider?: string; apiKey?: string };
    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'provider and apiKey are required' });
    }
    if (!['openai', 'gemini', 'spotify-client-id', 'spotify-client-secret'].includes(provider)) {
      return res.status(400).json({ error: 'provider must be "openai", "gemini", "spotify-client-id", or "spotify-client-secret"' });
    }

    const encrypted = encrypt(apiKey);

    // Upsert: delete existing key for this user+provider, then insert
    await db
      .delete(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)));

    await db.insert(userApiKeys).values({
      userId,
      provider,
      encryptedKey: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    });

    log.info({ userId, provider }, 'API key saved');
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'Failed to save API key');
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

// POST /api/ai/check-key — check if key is configured (never returns the key)
router.post('/ai/check-key', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { provider } = req.body as { provider?: string };
    if (!provider) {
      return res.status(400).json({ error: 'provider is required' });
    }

    const rows = await db
      .select()
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))
      .limit(1);

    res.json({ configured: rows.length > 0 });
  } catch (err) {
    log.error({ err }, 'Failed to check API key');
    res.status(500).json({ error: 'Failed to check API key' });
  }
});

// DELETE /api/ai/delete-key — remove key for a provider
router.delete('/ai/delete-key', requireWriteAccess, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { provider } = req.body as { provider?: string };
    if (!provider) {
      return res.status(400).json({ error: 'provider is required' });
    }

    await db
      .delete(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)));

    log.info({ userId, provider }, 'API key deleted');
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'Failed to delete API key');
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// POST /api/ai/recognize — decrypt key, proxy to cloud AI, return result
router.post('/ai/recognize', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
    }

    const { imageBase64, provider, model } = req.body as {
      imageBase64?: string;
      provider?: string;
      model?: string;
    };

    if (!imageBase64 || !provider) {
      return res.status(400).json({ error: 'imageBase64 and provider are required' });
    }
    if (!['openai', 'gemini'].includes(provider)) {
      return res.status(400).json({ error: 'provider must be "openai" or "gemini"' });
    }

    // Decrypt the user's API key
    const rows = await db
      .select()
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))
      .limit(1);

    if (rows.length === 0) {
      return res.status(400).json({ error: `No ${provider} API key configured. Add it in Settings.` });
    }

    let apiKey: string;
    try {
      apiKey = decrypt({
        ciphertext: rows[0].encryptedKey,
        iv: rows[0].iv,
        authTag: rows[0].authTag,
      });
    } catch {
      log.error({ userId, provider }, 'Failed to decrypt API key — ENCRYPTION_KEY may have changed');
      return res.status(500).json({ error: 'Failed to decrypt API key. Re-save it in Settings.' });
    }

    // Call the cloud AI vision API
    const result = provider === 'openai'
      ? await callOpenAi(apiKey, imageBase64, model)
      : await callGemini(apiKey, imageBase64, model);

    res.json(result);
  } catch (err) {
    log.error({ err }, 'Recognition failed');
    res.status(500).json({ error: 'Recognition failed' });
  }
});

// POST /api/ai/models — fetch available models from provider
router.post('/ai/models', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { provider } = req.body as { provider?: string };
    if (!provider || !['openai', 'gemini'].includes(provider)) {
      return res.status(400).json({ error: 'provider must be "openai" or "gemini"' });
    }

    const rows = await db
      .select()
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))
      .limit(1);

    if (rows.length === 0) {
      return res.json({ models: [] });
    }

    let apiKey: string;
    try {
      apiKey = decrypt({
        ciphertext: rows[0].encryptedKey,
        iv: rows[0].iv,
        authTag: rows[0].authTag,
      });
    } catch {
      return res.json({ models: [] });
    }

    const models = provider === 'openai'
      ? await fetchOpenAiModels(apiKey)
      : await fetchGeminiModels(apiKey);

    res.json({ models });
  } catch (err) {
    log.error({ err }, 'Failed to fetch models');
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

async function callOpenAi(apiKey: string, imageBase64: string, model?: string): Promise<{
  artist: string;
  album: string;
  confidence: number;
  source: string;
}> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identify the artist and album name of this vinyl record cover. Return ONLY a JSON object with keys "artist" and "album". If unsure, use "unknown" for that field.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} — ${err.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';

  // Parse the JSON from the response
  let parsed: { artist?: string; album?: string };
  try {
    // Strip markdown code fences if present
    const json = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(json);
  } catch {
    // Try to extract artist/album from text
    const artistMatch = content.match(/"artist"\s*:\s*"([^"]+)"/);
    const albumMatch = content.match(/"album"\s*:\s*"([^"]+)"/);
    parsed = {
      artist: artistMatch?.[1] ?? 'unknown',
      album: albumMatch?.[1] ?? 'unknown',
    };
  }

  return {
    artist: parsed.artist ?? 'unknown',
    album: parsed.album ?? 'unknown',
    confidence: 0.85,
    source: 'openai',
  };
}

async function callGemini(apiKey: string, imageBase64: string, model?: string): Promise<{
  artist: string;
  album: string;
  confidence: number;
  source: string;
}> {
  const geminiModel = model || 'gemini-2.0-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Identify the artist and album name of this vinyl record cover. Return ONLY a JSON object with keys "artist" and "album". If unsure, use "unknown" for that field.',
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${err.slice(0, 200)}`);
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let parsed: { artist?: string; album?: string };
  try {
    const json = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(json);
  } catch {
    const artistMatch = content.match(/"artist"\s*:\s*"([^"]+)"/);
    const albumMatch = content.match(/"album"\s*:\s*"([^"]+)"/);
    parsed = {
      artist: artistMatch?.[1] ?? 'unknown',
      album: albumMatch?.[1] ?? 'unknown',
    };
  }

  return {
    artist: parsed.artist ?? 'unknown',
    album: parsed.album ?? 'unknown',
    confidence: 0.85,
    source: 'gemini',
  };
}

async function fetchOpenAiModels(apiKey: string): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return ['gpt-4o', 'gpt-4o-mini'];
  const data = await response.json() as { data: Array<{ id: string }> };
  return data.data
    .filter((m) => m.id.startsWith('gpt-4'))
    .map((m) => m.id)
    .slice(0, 10);
}

async function fetchGeminiModels(_apiKey: string): Promise<string[]> {
  // Gemini models are well-known — no need to fetch dynamically
  return ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
}

export default router;
