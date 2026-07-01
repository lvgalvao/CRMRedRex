// Env dummy para os testes unitários: permite importar módulos de serviço
// (que avaliam publicEnv no load) sem conectar a nada. As funções testadas são puras.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
