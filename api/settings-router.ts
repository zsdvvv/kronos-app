import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appSettings } from "@db/schema";

export const settingsRouter = createRouter({
  get: publicQuery.query(async () => {
    const db = getDb();
    const result = await db.select().from(appSettings).limit(1);
    if (result.length === 0) {
      // Create default settings
      await db.insert(appSettings).values({});
      return { authEnabled: true, defaultTheme: "modern", guruEnabled: true, guruFreeMessages: 10 };
    }
    return result[0];
  }),

  update: publicQuery
    .input(
      z.object({
        authEnabled: z.boolean().optional(),
        defaultTheme: z.enum(["modern", "classic", "dark"]).optional(),
        guruEnabled: z.boolean().optional(),
        guruFreeMessages: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(appSettings).limit(1);

      if (existing.length === 0) {
        await db.insert(appSettings).values(input);
      } else {
        await db
          .update(appSettings)
          .set(input)
          .where(eq(appSettings.id, existing[0].id));
      }

      return { success: true };
    }),
});
