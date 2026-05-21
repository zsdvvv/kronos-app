import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { invitations, users } from "@db/schema";
import { TRPCError } from "@trpc/server";

export const inviteRouter = createRouter({
  // 초대 목록 조회 (관리자만)
  list: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "관리자만 접근 가능합니다." });
    }
    const db = getDb();
    return db.select().from(invitations).orderBy(invitations.createdAt);
  }),

  // 초대 추가 (관리자만)
  create: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "관리자만 접근 가능합니다." });
      }
      const db = getDb();
      await db.insert(invitations).values({
        email: input.email.toLowerCase().trim(),
        invitedBy: ctx.user.id,
        status: "pending",
      });
      return { success: true };
    }),

  // 초대 삭제 (관리자만)
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "관리자만 접근 가능합니다." });
      }
      const db = getDb();
      await db.delete(invitations).where(eq(invitations.id, input.id));
      return { success: true };
    }),

  // 가입된 사용자 목록 (관리자만)
  users: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "관리자만 접근 가능합니다." });
    }
    const db = getDb();
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      lastSignInAt: users.lastSignInAt,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);
  }),
});
