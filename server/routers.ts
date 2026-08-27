import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { stripeRouter } from "./routers/stripe";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
