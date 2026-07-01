import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
        <h1 className="mb-1 text-2xl font-heavy text-primary">CRM RedRex</h1>
        <p className="mb-6 text-sm text-muted-foreground">Entre para ver o que fazer hoje.</p>

        {error ? (
          <p className="mb-4 rounded-md border border-danger/50 bg-danger/10 p-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <form action={login} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">E-mail</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Senha</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
