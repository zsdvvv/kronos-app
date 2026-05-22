import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { signSessionToken } from "../kimi/session";
import { upsertUser } from "../queries/users";
import { getDb } from "../queries/connection";
import { invitations } from "@db/schema";

export function createGoogleOAuthCallbackHandler() {
  return async (c: Context) => {
    const code  = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return error === "access_denied"
        ? c.redirect("/", 302)
        : c.json({ error }, 400);
    }
    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    try {
      const redirectUri = atob(state);

      // Google 토큰 교환
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
      const tokenData = await tokenRes.json() as { access_token: string };

      // 사용자 프로필 가져오기
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as {
        id: string; name?: string; picture?: string; email?: string;
      };

      // ── 초대 이메일 확인 ──────────────────────────────────
      const email = profile.email || "";
      const db = getDb();
      const invite = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, email))
        .limit(1);

      if (invite.length === 0) {
        // 초대받지 않은 이메일 → 거절 페이지로
        const frontendUrl2 = process.env.FRONTEND_URL || "https://wewill-three.vercel.app";
      return c.redirect(`${frontendUrl2}/login?error=not_invited`, 302);
      }
      // ─────────────────────────────────────────────────────

      // 사용자 저장/업데이트
      await upsertUser({
        unionId: `google_${profile.id}`,
        name: profile.name || email || "Google User",
        email,
        avatar: profile.picture || null,
        lastSignInAt: new Date(),
      });

      // 초대 상태를 accepted로 업데이트
      if (invite[0].status === "pending") {
        await db
          .update(invitations)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(eq(invitations.email, email));
      }

      // 세션 쿠키 발급
      const token = await signSessionToken({
        unionId: `google_${profile.id}`,
        clientId: env.googleClientId,
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      // 로그인 성공 후 프론트엔드로 이동
      const frontendUrl = process.env.FRONTEND_URL || "https://wewill-three.vercel.app";
      return c.redirect(frontendUrl, 302);
    } catch (err) {
      console.error("[Google OAuth] Callback failed", err);
      const frontendUrl3 = process.env.FRONTEND_URL || "https://wewill-three.vercel.app";
      return c.redirect(`${frontendUrl3}/login?error=server_error`, 302);
    }
  };
}
