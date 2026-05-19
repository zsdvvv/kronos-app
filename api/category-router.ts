import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { categories } from "@db/schema";

export const categoryRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    // Get system categories + user-specific categories
    // isSystem=1 인 카테고리 + 로그인 사용자의 개인 카테고리
    let result;
    if (ctx.user) {
      result = await db
        .select()
        .from(categories)
        .where(
          or(
            eq(categories.isSystem, 1 as any),
            eq(categories.userId, ctx.user.id)
          )
        );
    } else {
      // 비로그인: 시스템 카테고리만 표시
      result = await db
        .select()
        .from(categories)
        .where(eq(categories.isSystem, 1 as any));
    }
    return result;
  }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(50),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const userType = "oauth" as const;

      const result = await db.insert(categories).values({
        ...input,
        userId,
        userType,
        isSystem: false,
      });

      return { id: Number(result[0].insertId), ...input };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        label: z.string().min(1).max(50).optional(),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(categories).set(data).where(eq(categories.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),
});
