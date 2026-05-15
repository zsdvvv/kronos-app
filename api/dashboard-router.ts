import { z } from "zod";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { schedules, categories } from "@db/schema";

export const dashboardRouter = createRouter({
  stats: publicQuery
    .input(
      z.object({
        period: z.enum(["week", "month", "year"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;
      const period = input?.period || "week";

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      if (period === "week") startDate.setDate(now.getDate() - 7);
      else if (period === "month") startDate.setMonth(now.getMonth() - 1);
      else startDate.setFullYear(now.getFullYear() - 1);

      // Total schedules
      const totalResult = await db
        .select({ count: count() })
        .from(schedules)
        .where(
          and(
            eq(schedules.userId, userId),
            gte(schedules.startTime, startDate),
            lte(schedules.startTime, now)
          )
        );

      // Completed schedules
      const completedResult = await db
        .select({ count: count() })
        .from(schedules)
        .where(
          and(
            eq(schedules.userId, userId),
            eq(schedules.isCompleted, true),
            gte(schedules.startTime, startDate),
            lte(schedules.startTime, now)
          )
        );

      // Repeating schedules
      const repeatingResult = await db
        .select({ count: count() })
        .from(schedules)
        .where(
          and(
            eq(schedules.userId, userId),
            eq(schedules.isRepeating, true)
          )
        );

      // Category breakdown
      const categoryBreakdown = await db
        .select({
          categoryId: schedules.categoryId,
          categoryName: categories.label,
          count: count(),
          color: categories.color,
        })
        .from(schedules)
        .leftJoin(categories, eq(schedules.categoryId, categories.id))
        .where(
          and(
            eq(schedules.userId, userId),
            gte(schedules.startTime, startDate),
            lte(schedules.startTime, now)
          )
        )
        .groupBy(schedules.categoryId);

      // Daily trend (last 7 days)
      const dailyTrend: Array<{ date: string; count: number; completed: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);

        const dayResult = await db
          .select({ count: count() })
          .from(schedules)
          .where(
            and(
              eq(schedules.userId, userId),
              gte(schedules.startTime, d),
              lte(schedules.startTime, nextD)
            )
          );

        const dayCompleted = await db
          .select({ count: count() })
          .from(schedules)
          .where(
            and(
              eq(schedules.userId, userId),
              eq(schedules.isCompleted, true),
              gte(schedules.startTime, d),
              lte(schedules.startTime, nextD)
            )
          );

        dailyTrend.push({
          date: d.toISOString().split("T")[0],
          count: dayResult[0]?.count ?? 0,
          completed: dayCompleted[0]?.count ?? 0,
        });
      }

      const total = totalResult[0]?.count ?? 0;
      const completed = completedResult[0]?.count ?? 0;

      return {
        totalSchedules: total,
        completedSchedules: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalHours: total * 1.5, // estimate
        repeatingSchedules: repeatingResult[0]?.count ?? 0,
        categoryBreakdown: categoryBreakdown.map((c) => ({
          categoryId: c.categoryId ?? 0,
          categoryName: c.categoryName || "미분류",
          count: c.count,
          color: c.color || "#7d8a74",
        })),
        dailyTrend,
      };
    }),

  weeklySummary: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user?.id ?? 0;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const result = await db
      .select()
      .from(schedules)
      .leftJoin(categories, eq(schedules.categoryId, categories.id))
      .where(
        and(
          eq(schedules.userId, userId),
          gte(schedules.startTime, weekStart),
          lte(schedules.startTime, weekEnd)
        )
      )
      .orderBy(desc(schedules.startTime));

    return result;
  }),
});
