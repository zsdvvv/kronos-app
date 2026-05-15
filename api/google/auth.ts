import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "../lib/cookies";
import { signSessionToken } from "../kimi/session";
import { upsertUser } from "../queries/users";

export function createGoogleOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return error === "access_denied" ? c.redirect("/", 302) : c.json({ error }, 400);
    }

    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    try {
      const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
      const redirectUri = atob(state);

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }).toString(),
      });

      if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
      const tokenData = await tokenRes.json() as { access_token: string };

      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as { id: string; name?: string; picture?: string; email?: string };

      await upsertUser({
        unionId: `google_${profile.id}`,
        name: profile.name || profile.email || "Google User",
        avatar: profile.picture || null,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({ unionId: `google_${profile.id}`, clientId: clientId });
      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, { ...cookieOpts, maxAge: Session.maxAgeMs / 1000 });

      return c.redirect("/", 302);
    } catch (err) {
      console.error("[Google OAuth] Callback failed", err);
      return c.json({ error: "Google OAuth callback failed" }, 500);
    }
  };
}
