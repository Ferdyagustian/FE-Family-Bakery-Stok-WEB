function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config Error] Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  JWT_SECRET: requireEnv('JWT_SECRET'),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '', // Optional if some environments don't strictly require it at startup
  API_BASE: process.env.NEXT_PUBLIC_API_URL || '/api',
};
