// Kimi OAuth는 Google OAuth로 대체됨
// 이 파일은 authenticateRequest만 유지 (session 검증용)
import * as cookie from "cookie";
import { env } from "../lib/env";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { verifySessionToken } from "./session";
import { findUserByUnionId } from "../queries/users";

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    console.warn("[auth] No session cookie found in request.");
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

// Google OAuth 콜백은 api/google/auth.ts 에서 처리
export function createOAuthCallbackHandler() {
  return async (c: any) => c.redirect("/", 302);
}
