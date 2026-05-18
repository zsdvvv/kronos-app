import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createGoogleOAuthCallbackHandler } from "./google/auth";
import { Paths } from "@contracts/constants";

const app = new Hono<{ Bindings: HttpBindings }>();

// ── CORS 설정 (Vercel 프론트엔드 허용) ─────────────────────
app.use("*", cors({
  origin: (origin) => {
    // vercel.app 도메인 전체 허용 + localhost
    if (!origin) return "*";
    if (origin.endsWith(".vercel.app")) return origin;
    if (origin.includes("localhost")) return origin;
    return origin;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-local-auth-token", "Cookie"],
  credentials: true,
  maxAge: 86400,
}));

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Google OAuth 콜백
app.get(Paths.googleOAuthCallback, createGoogleOAuthCallbackHandler());

// tRPC
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
