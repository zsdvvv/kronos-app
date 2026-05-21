import { authRouter } from "./auth-router";
import { localAuthRouter } from "./local-auth-router";
import { scheduleRouter } from "./schedule-router";
import { categoryRouter } from "./category-router";
import { dashboardRouter } from "./dashboard-router";
import { settingsRouter } from "./settings-router";
import { importRouter } from "./import-router";
import { guruRouter } from "./guru-router";
import { inviteRouter } from "./invite-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  schedule: scheduleRouter,
  category: categoryRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
  import: importRouter,
  guru: guruRouter,
  invite: inviteRouter,
});

export type AppRouter = typeof appRouter;
