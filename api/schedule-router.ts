import { z } from "zod";
import { eq, and, gte, lte, like, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { schedules, categories } from "@db/schema";

export const scheduleRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        categoryId: z.number().optional(),
        search: z.string().optional(),
        view: z.enum(["day", "week", "month"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [];

      if (ctx.user) {
        conditions.push(eq(schedules.userId, ctx.user.id));
        conditions.push(eq(schedules.userType, "oauth"));
      } else {
        // Anonymous user - use a default anonymous ID
        conditions.push(eq(schedules.userId, 0));
      }

      if (input?.startDate) {
        conditions.push(gte(schedules.startTime, new Date(input.startDate)));
      }
      if (input?.endDate) {
        // startTime 기준으로 필터 (endTime이 범위 밖이어도 표시)
        conditions.push(lte(schedules.startTime, new Date(input.endDate)));
      }
      if (input?.categoryId) {
        conditions.push(eq(schedules.categoryId, input.categoryId));
      }
      if (input?.search) {
        conditions.push(like(schedules.title, `%${input.search}%`));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          id: schedules.id,
          title: schedules.title,
          description: schedules.description,
          startTime: schedules.startTime,
          endTime: schedules.endTime,
          timezone: schedules.timezone,
          categoryId: schedules.categoryId,
          color: schedules.color,
          isRepeating: schedules.isRepeating,
          repeatPattern: schedules.repeatPattern,
          alarmMinutes: schedules.alarmMinutes,
          isCompleted: schedules.isCompleted,
          source: schedules.source,
          createdAt: schedules.createdAt,
          updatedAt: schedules.updatedAt,
          categoryName: categories.label,
          categoryIcon: categories.icon,
          categoryColor: categories.color,
        })
        .from(schedules)
        .leftJoin(categories, eq(schedules.categoryId, categories.id))
        .where(where)
        .orderBy(desc(schedules.startTime));

      return result;
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(schedules)
        .leftJoin(categories, eq(schedules.categoryId, categories.id))
        .where(eq(schedules.id, input.id))
        .limit(1);
      return result[0] ?? null;
    }),

  create: publicQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        timezone: z.string().optional(),
        categoryId: z.number().optional(),
        color: z.string().optional(),
        isRepeating: z.boolean().optional(),
        repeatPattern: z.object({
          type: z.enum(["hourly", "daily", "weekly", "monthly", "custom"]),
          interval: z.number().optional(),
          daysOfWeek: z.array(z.number()).optional(),
          endDate: z.string().optional(),
          occurrences: z.number().optional(),
        }).optional(),
        alarmMinutes: z.number().optional(),
        source: z.enum(["manual", "excel", "notion", "markdown", "text"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const userType = "oauth" as const;

      // Auto-detect category from title if not provided
      let categoryId = input.categoryId;
      if (!categoryId && input.title) {
        const allCats = await db.select().from(categories).where(eq(categories.isSystem, 1 as any));
        const lowerTitle = input.title.toLowerCase();
        for (const cat of allCats) {
          if (lowerTitle.includes(cat.name) || lowerTitle.includes(cat.label)) {
            categoryId = cat.id;
            break;
          }
        }
      }

      const result = await db.insert(schedules).values({
        userId,
        userType,
        title: input.title,
        description: input.description,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        timezone: input.timezone || "local",
        categoryId,
        color: input.color || "#fffefa",
        isRepeating: input.isRepeating || false,
        repeatPattern: input.repeatPattern,
        alarmMinutes: input.alarmMinutes ?? 15,
        source: input.source || "manual",
      });

      return { id: Number(result[0].insertId), ...input, categoryId };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        timezone: z.string().optional(),
        categoryId: z.number().optional(),
        color: z.string().optional(),
        isRepeating: z.boolean().optional(),
        repeatPattern: z.any().optional(),
        alarmMinutes: z.number().optional(),
        isCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;

      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
      if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
      if (data.timezone !== undefined) updateData.timezone = data.timezone;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.isRepeating !== undefined) updateData.isRepeating = data.isRepeating;
      if (data.repeatPattern !== undefined) updateData.repeatPattern = data.repeatPattern;
      if (data.alarmMinutes !== undefined) updateData.alarmMinutes = data.alarmMinutes;
      if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;

      await db.update(schedules).set(updateData).where(eq(schedules.id, id));
      return { id, ...data };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(schedules).where(eq(schedules.id, input.id));
      return { success: true };
    }),

  complete: publicQuery
    .input(z.object({ id: z.number(), isCompleted: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(schedules)
        .set({ isCompleted: input.isCompleted })
        .where(eq(schedules.id, input.id));
      return { success: true };
    }),

  // 미완료 일정 전체 목록 (일정모음용 - 날짜 제한 없음)
  upcoming: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const conditions = [
      eq(schedules.isCompleted, 0 as any),
    ];
    if (ctx.user) {
      conditions.push(eq(schedules.userId, ctx.user.id));
    } else {
      conditions.push(eq(schedules.userId, 0));
    }

    const result = await db
      .select({
        id: schedules.id,
        title: schedules.title,
        description: schedules.description,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        color: schedules.color,
        categoryId: schedules.categoryId,
        isCompleted: schedules.isCompleted,
        isRepeating: schedules.isRepeating,
        alarmMinutes: schedules.alarmMinutes,
      })
      .from(schedules)
      .where(and(...conditions))
      .orderBy(schedules.startTime)
      .limit(100);

    return result;
  }),

  batchCreate: publicQuery
    .input(
      z.array(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          startTime: z.string(),
          endTime: z.string(),
          categoryId: z.number().optional(),
          color: z.string().optional(),
          alarmMinutes: z.number().optional(),
          source: z.enum(["manual", "excel", "notion", "markdown", "text"]).optional(),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const userType = "oauth" as const;

      const values = input.map((item) => ({
        userId,
        userType,
        title: item.title,
        description: item.description,
        startTime: new Date(item.startTime),
        endTime: new Date(item.endTime),
        timezone: "local",
        categoryId: item.categoryId,
        color: item.color || "#fffefa",
        alarmMinutes: item.alarmMinutes ?? 15,
        source: item.source || "manual",
      }));

      const result = await db.insert(schedules).values(values);
      return { inserted: values.length, firstId: Number(result[0].insertId) };
    }),

  detectRepeats: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user?.id ?? 0;

    // Find schedules with similar titles from last 30 days
    const recentSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.userId, userId),
          eq(schedules.isRepeating, false),
          gte(schedules.startTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(schedules.startTime));

    // Group by title similarity
    const groups: Record<string, typeof recentSchedules> = {};
    for (const s of recentSchedules) {
      const key = s.title.toLowerCase().trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }

    const suggestions: Array<{
      title: string;
      pattern: string;
      count: number;
      scheduleIds: number[];
    }> = [];

    for (const [title, items] of Object.entries(groups)) {
      if (items.length >= 2) {
        // Check if they occur at similar intervals
        const timestamps = items.map((i) => new Date(i.startTime).getTime()).sort((a, b) => a - b);
        const diffs: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
          diffs.push(timestamps[i] - timestamps[i - 1]);
        }

        const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        let pattern = "custom";
        if (avgDiff >= oneDay * 0.9 && avgDiff <= oneDay * 1.1) pattern = "daily";
        else if (avgDiff >= oneWeek * 0.9 && avgDiff <= oneWeek * 1.1) pattern = "weekly";

        suggestions.push({
          title,
          pattern,
          count: items.length,
          scheduleIds: items.map((i) => i.id),
        });
      }
    }

    return suggestions;
  }),
});
