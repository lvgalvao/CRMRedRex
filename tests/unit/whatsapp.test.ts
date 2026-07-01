import { describe, it, expect } from "vitest";
import { isValidPhone, buildWhatsAppLink } from "@/lib/whatsapp";

describe("WhatsApp click-to-send (FR-015)", () => {
  it("valida E.164", () => {
    expect(isValidPhone("+5511999998888")).toBe(true);
    expect(isValidPhone("11999998888")).toBe(false);
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });

  it("monta wa.me com texto URL-encoded", () => {
    const r = buildWhatsAppLink("+5511999998888", "Oi João, tudo bem?");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toBe("https://wa.me/5511999998888?text=Oi%20Jo%C3%A3o%2C%20tudo%20bem%3F");
    }
  });

  it("retorna erro claro quando telefone é inválido", () => {
    const r = buildWhatsAppLink(null, "texto");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Telefone");
  });
});
