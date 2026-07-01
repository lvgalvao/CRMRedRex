import "server-only";

import crypto from "node:crypto";

// Verificação de assinatura de webhooks com comparação em tempo constante (D6, Princípio IV).
// Usado por tl;dv e pelo webhook opcional do Calendly antes de tocar o banco.

/** Compara dois valores em tempo constante (evita timing attack). */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Calcula HMAC-SHA256 (hex) do payload com o segredo informado. */
export function hmacSha256Hex(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Verifica a assinatura HMAC-SHA256 de um payload.
 * @param rawBody corpo cru da requisição (string exata recebida)
 * @param signature assinatura recebida no header
 * @param secret segredo compartilhado
 */
export function verifyHmacSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!signature || !secret) return false;
  const expected = hmacSha256Hex(rawBody, secret);
  // Aceita "sha256=<hex>" ou "<hex>".
  const received = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  return timingSafeEqual(expected, received);
}
