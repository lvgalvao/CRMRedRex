// Rate limiting simples (janela fixa, em memória) para rotas públicas (FR-029, Parte 3 PRD).
// Nota: em serverless multi-instância o estado não é compartilhado; para produção forte,
// trocar por Upstash/Redis. Suficiente como primeira barreira no MVP.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Extrai um identificador de cliente da requisição (IP). */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
