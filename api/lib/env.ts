import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  sessionSecret: optional("SESSION_SECRET", "dev-secret-change-in-production"),
  databaseUrl: optional("TURSO_DATABASE_URL", optional("DATABASE_URL", "")),
  databaseAuthToken: optional("TURSO_AUTH_TOKEN", ""),
  googleClientId: optional("GOOGLE_CLIENT_ID", optional("VITE_GOOGLE_CLIENT_ID", "")),
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET", ""),
  ownerUnionId: optional("OWNER_UNION_ID", ""),
};
