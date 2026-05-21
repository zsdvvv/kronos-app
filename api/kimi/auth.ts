// Kimi OAuth 제거됨 - Google OAuth로 대체
// 하위 호환성을 위해 빈 export 유지
export function createOAuthCallbackHandler() {
  return async (c: any) => c.redirect("/", 302);
}
