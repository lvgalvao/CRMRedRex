import { z } from "zod";

// Validação centralizada e tipada das variáveis de ambiente (Constituição §Stack, D2).
// Públicas (NEXT_PUBLIC_*) podem ir ao client; as de servidor NUNCA.

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CALENDLY_TOKEN: z.string().min(1).optional(),
  CALENDLY_USER_URI: z.string().url().optional(),
  CALENDLY_EVENT_TYPE_URI: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  TLDV_WEBHOOK_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  GMAIL_CLIENT_ID: z.string().min(1).optional(),
  GMAIL_CLIENT_SECRET: z.string().min(1).optional(),
  GMAIL_REFRESH_TOKEN: z.string().min(1).optional(),
});

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, source: Record<string, unknown>): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`[env] Variáveis inválidas/ausentes: ${missing}`);
  }
  return result.data;
}

// Públicas: validadas sempre (client e servidor).
export const publicEnv = parseOrThrow(publicSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

// Servidor: validadas sob demanda (lazy) para não quebrar bundles client.
let _serverEnv: z.infer<typeof serverSchema> | null = null;
export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== "undefined") {
    throw new Error("[env] serverEnv() não pode ser chamado no client.");
  }
  if (!_serverEnv) {
    _serverEnv = parseOrThrow(serverSchema, {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      CALENDLY_TOKEN: process.env.CALENDLY_TOKEN,
      CALENDLY_USER_URI: process.env.CALENDLY_USER_URI,
      CALENDLY_EVENT_TYPE_URI: process.env.CALENDLY_EVENT_TYPE_URI,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      TLDV_WEBHOOK_SECRET: process.env.TLDV_WEBHOOK_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
    });
  }
  return _serverEnv;
}
