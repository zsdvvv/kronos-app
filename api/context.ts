import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User, LocalUser } from "@db/schema";
import { verifySessionToken } from "./kimi/session";
import { findUserByUnionId } from "./queries/users";
import { verifyLocalToken } from "./local-auth-router";
import { Session } from "@contracts/constants";
import * as cookie from "cookie";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  localUser?: Omit<LocalUser, "passwordHash"> & { type: "local" };
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // 1. 세션 쿠키로 인증 (Google OAuth 또는 기타)
  try {
    const cookies = cookie.parse(opts.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (token) {
      const claim = await verifySessionToken(token);
      if (claim) {
        const user = await findUserByUnionId(claim.unionId);
        if (user) ctx.user = user;
      }
    }
  } catch {
    // 인증 실패 시 비로그인으로 처리
  }

  // 2. 로컬 인증 토큰
  if (!ctx.user) {
    try {
      const token = opts.req.headers.get("x-local-auth-token");
      if (token) {
        const localUser = await verifyLocalToken(token);
        if (localUser) {
          ctx.localUser = { ...localUser, type: "local" };
          ctx.user = {
            id: localUser.id,
            unionId: `local_${localUser.id}`,
            name: localUser.name,
            email: localUser.email,
            avatar: null,
            role: localUser.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignInAt: new Date(),
          };
        }
      }
    } catch {
      // 로컬 인증 실패 시 비로그인으로 처리
    }
  }

  return ctx;
}
