import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { categories } from "@db/schema";

export const categoryRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    // Get system categories + user-specific categories
    const result = await db
      .select()
      .from(categories)
      .where(
        or(
          eq(categories.isSystem, true),
          // 로그인 사용자: 본인 카테고리
          ctx.user
            ? and(eq(categories.userId, ctx.user.id), eq(categories.isSystem, false))
            // 비로그인 사용자: userId=0 으로 만든 카테고리도 표시
            : and(eq(categories.userId, 0), eq(categories.isSystem, false))
        )
      );
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
