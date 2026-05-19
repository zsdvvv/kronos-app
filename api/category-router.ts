import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { categories } from "@db/schema";

export const categoryRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    try {
      let result;
      if (ctx.user) {
        // 로그인: 시스템 카테고리 + 본인 카테고리
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
        // 비로그인: 시스템 카테고리만
        result = await db
          .select()
          .from(categories)
          .where(eq(categories.isSystem, 1 as any));
      }
      return result;
    } catch (e) {
      console.error("[category.list error]", e);
      throw e;
    }
  }),

  create: publicQuery
    .input(z.object({
      name: z.string().min(1).max(50),
      label: z.string().min(1).max(50),
      icon: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const result = await db.insert(categories).values({
        ...input,
        userId,
        userType: "oauth" as const,
        isSystem: false,
      });
      return { id: Number(result[0].insertId), ...input };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      label: z.string().min(1).max(50).optional(),
      icon: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }))
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
