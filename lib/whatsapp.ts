// WhatsApp click-to-send (B5, FR-015). Sem API, sem custo: monta link wa.me.

const E164 = /^\+[1-9]\d{7,14}$/;

/** Valida telefone no formato E.164 (ex.: +5511999998888). */
export function isValidPhone(phone: string | null | undefined): phone is string {
  return typeof phone === "string" && E164.test(phone.trim());
}

export type WhatsAppResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Monta o link wa.me com o texto preenchido, ou erro claro se o telefone for inválido. */
export function buildWhatsAppLink(phone: string | null | undefined, text: string): WhatsAppResult {
  if (!isValidPhone(phone)) {
    return {
      ok: false,
      error: "Telefone ausente ou fora do padrão internacional (E.164, ex.: +5511999998888).",
    };
  }
  const digits = phone.trim().replace(/^\+/, "");
  return { ok: true, url: `https://wa.me/${digits}?text=${encodeURIComponent(text)}` };
}
