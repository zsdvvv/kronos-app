import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User, LocalUser } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { verifyLocalToken } from "./local-auth-router";

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

  // Try OAuth first
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // OAuth not available
  }

  // Try local auth
  if (!ctx.user) {
    try {
      const token = opts.req.headers.get("x-local-auth-token");
      if (token) {
        const localUser = await verifyLocalToken(token);
        if (localUser) {
          ctx.localUser = { ...localUser, type: "local" };
          // Also set ctx.user for middleware compatibility
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
      // Local auth not available
    }
  }

  return ctx;
}
