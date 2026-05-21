import "dotenv/config";

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  sessionSecret: optional("SESSION_SECRET", "dev-secret-change-in-production-min-32-chars"),
  databaseUrl: optional("DATABASE_URL", ""),
  googleClientId: optional("GOOGLE_CLIENT_ID", optional("VITE_GOOGLE_CLIENT_ID", "")),
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET", ""),
  ownerUnionId: optional("OWNER_UNION_ID", ""),
  ownerEmail: optional("OWNER_EMAIL", ""),
};
