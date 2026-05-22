import { isTauri } from "./utils";

export interface CloudModelsResult {
  models: string[];
}

export interface RecognitionResult {
  artist: string;
  album: string;
  confidence: number;
  source: string;
}

export interface RecognitionTransport {
  recognize(imageBase64: string, provider: string, model?: string): Promise<RecognitionResult>;
  getAvailableCloudModels(provider: string): Promise<string[]>;
  saveApiKey(provider: string, apiKey: string): Promise<void>;
  checkKeyConfigured(provider: string): Promise<boolean>;
  deleteApiKey(provider: string): Promise<void>;
  readSettings?(): Promise<{
    llm: { provider: string; cloudProvider: string; cloudModel: string; localMaxDim?: number; cloudMaxDim?: number };
  }>;
  writeSettings?(settings: unknown): Promise<void>;
  getOllamaModels?(): Promise<string[]>;
  logScanError?(message: string, context: string): Promise<void>;
  logScanSuccess?(artist: string, album: string, source: string): Promise<void>;
  getAccessToken?(): Promise<string | null>;
  spotifySearch?(query: string): Promise<{ albumId: string }>;
}

// ── Tauri (Desktop) Transport ──────────────────────────────────────────────────

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

class TauriRecognitionTransport implements RecognitionTransport {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async recognize(imageBase64: string, provider: string, _model?: string): Promise<RecognitionResult> {
    // Convert base64 to byte array for the Rust backend
    const binary = atob(imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const imageData = Array.from(bytes);

    const args: Record<string, unknown> = { imageData };
    if (provider && provider !== "auto") args.forceProvider = provider;
    return tauriInvoke<RecognitionResult>("recognize", args);
  }

  async getAvailableCloudModels(provider: string): Promise<string[]> {
    try {
      return await tauriInvoke<string[]>("get_available_cloud_models", { provider });
    } catch {
      return [];
    }
  }

  async saveApiKey(provider: string, apiKey: string): Promise<void> {
    await tauriInvoke("save_api_key", { provider, key: apiKey });
  }

  async checkKeyConfigured(provider: string): Promise<boolean> {
    try {
      return await tauriInvoke<boolean>("check_api_key", { provider });
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteApiKey(_provider: string): Promise<void> {
    // Desktop OS keyring — no explicit delete, overwrite via save instead
  }

  async readSettings(): Promise<{
    llm: { provider: string; cloudProvider: string; cloudModel: string; localMaxDim?: number; cloudMaxDim?: number };
  }> {
    return tauriInvoke("read_settings");
  }

  async writeSettings(settings: unknown): Promise<void> {
    await tauriInvoke("write_settings", { settings });
  }

  async getOllamaModels(): Promise<string[]> {
    try {
      const result = await tauriInvoke<{ models: string[] }>("get_ollama_models");
      return result.models;
    } catch {
      return [];
    }
  }

  async logScanError(message: string, context: string): Promise<void> {
    await tauriInvoke("log_scan_error", { message, context });
  }

  async logScanSuccess(artist: string, album: string, source: string): Promise<void> {
    await tauriInvoke("log_scan_success", { artist, album, source });
  }

  async getAccessToken(): Promise<string | null> {
    return tauriInvoke<string | null>("get_access_token");
  }

  async spotifySearch(query: string): Promise<{ albumId: string }> {
    return tauriInvoke<{ albumId: string }>("spotify_search", { q: query });
  }
}

// ── Web (Browser) Transport ────────────────────────────────────────────────────

const CHECK_CACHE_TTL_MS = 30_000; // 30s cache for check-key results

class WebRecognitionTransport implements RecognitionTransport {
  private checkCache = new Map<string, { result: boolean; ts: number }>();

  private cachedCheck(provider: string): boolean | null {
    const entry = this.checkCache.get(provider);
    if (entry && Date.now() - entry.ts < CHECK_CACHE_TTL_MS) {
      return entry.result;
    }
    return null;
  }

  private setCachedCheck(provider: string, result: boolean): void {
    this.checkCache.set(provider, { result, ts: Date.now() });
  }

  private get apiUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL ?? "";
  }

  private async authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    // No credentials: "include" — POST requests with include + JSON
    // content-type trigger CORS preflight, which fails when the API
    // server's ALLOWED_ORIGINS don't include localhost. The API uses
    // Bearer token auth (Authorization header), not cookies.
    return fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  async recognize(imageBase64: string, provider: string, model?: string): Promise<RecognitionResult> {
    const res = await this.authFetch("/api/ai/recognize", {
      method: "POST",
      body: JSON.stringify({ imageBase64, provider, model }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Recognition failed" }));
      throw new Error(err.error ?? "Recognition failed");
    }

    return res.json();
  }

  async getAvailableCloudModels(provider: string): Promise<string[]> {
    try {
      const res = await this.authFetch("/api/ai/models", {
        method: "POST",
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.models ?? [];
    } catch {
      return [];
    }
  }

  async saveApiKey(provider: string, apiKey: string): Promise<void> {
    const res = await this.authFetch("/api/ai/save-key", {
      method: "POST",
      body: JSON.stringify({ provider, apiKey }),
    });
    if (!res.ok) throw new Error("Failed to save API key");
    this.checkCache.delete(provider); // invalidate cache on save
  }

  async checkKeyConfigured(provider: string): Promise<boolean> {
    const cached = this.cachedCheck(provider);
    if (cached !== null) return cached;

    try {
      const res = await this.authFetch("/api/ai/check-key", {
        method: "POST",
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const result = data.configured ?? false;
      this.setCachedCheck(provider, result);
      return result;
    } catch {
      return false;
    }
  }

  async deleteApiKey(provider: string): Promise<void> {
    await this.authFetch("/api/ai/delete-key", {
      method: "DELETE",
      body: JSON.stringify({ provider }),
    });
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────────

let _transport: RecognitionTransport | null = null;

export function getRecognitionTransport(): RecognitionTransport {
  if (!_transport) {
    _transport = isTauri()
      ? new TauriRecognitionTransport()
      : new WebRecognitionTransport();
  }
  return _transport;
}

// For testing: override the transport
export function setRecognitionTransport(t: RecognitionTransport): void {
  _transport = t;
}
