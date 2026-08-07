import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { payments, stripePrices, stripeProducts, userSubscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const stripeRouter = router({
  // Get all active products and prices
  getProducts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const products = await db.select().from(stripeProducts).where(eq(stripeProducts.active, 1));
    
    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const prices = await db.select().from(stripePrices).where(eq(stripePrices.stripeProductId, product.stripeProductId));
        return { ...product, prices };
      })
    );

    return productsWithPrices;
  }),

  // Create checkout session
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        successUrl: z.string(),
        cancelUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get price details
      const priceDetails = await db.select().from(stripePrices).where(eq(stripePrices.stripePriceId, input.priceId));
      if (!priceDetails.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Price not found" });
      }

      const price = priceDetails[0];

      try {
        const session = await stripe!.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          mode: price.interval ? "subscription" : "payment",
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          customer_email: ctx.user.email || undefined,
          metadata: {
            userId: ctx.user.id.toString(),
          },
        });

        return { sessionId: session.id, url: session.url };
      } catch (error) {
        console.error("Stripe checkout error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create checkout session" });
      }
    }),

  // Create checkout session for a specific quotation
  createQuotationCheckoutSession: publicProcedure
    .input(
      z.object({
        quotationId: z.string(),
        successUrl: z.string(),
        cancelUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
      
      // Note: We would normally fetch the quotation from Supabase here
      // But since we are in a tRPC router and Supabase is handled separately,
      // we'll provide the logic that would be used.
      
      try {
        // This is a placeholder for the actual logic that will be implemented
        // in a separate serverless function or integrated backend.
        return { success: true, message: "Stripe integration ready for quotations" };
      } catch (error) {
        console.error("Stripe quotation checkout error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create quotation checkout session" });
      }
    }),

  // Get user subscriptions
  getUserSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const subs = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, ctx.user.id));
    
    const subsWithDetails = await Promise.all(
      subs.map(async (sub) => {
        const price = await db.select().from(stripePrices).where(eq(stripePrices.stripePriceId, sub.stripePriceId));
        const product = price.length ? await db.select().from(stripeProducts).where(eq(stripeProducts.stripeProductId, price[0].stripeProductId)) : [];
        return {
          ...sub,
          price: price[0],
          product: product[0],
        };
      })
    );

    return subsWithDetails;
  }),

  // Get user payments/invoices
  getUserPayments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const userPayments = await db.select().from(payments).where(eq(payments.userId, ctx.user.id));
    return userPayments;
  }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify subscription belongs to user
      const sub = await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeSubscriptionId, input.subscriptionId));
      if (!sub.length || sub[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Subscription not found" });
      }

      try {
        const canceled = await stripe!.subscriptions.update(input.subscriptionId, {
          cancel_at_period_end: true,
        });

        // Update database
        await db
          .update(userSubscriptions)
          .set({ status: canceled.status, canceledAt: new Date() })
          .where(eq(userSubscriptions.stripeSubscriptionId, input.subscriptionId));

        return { success: true };
      } catch (error) {
        console.error("Stripe cancel error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to cancel subscription" });
      }
    }),

  // Get payment details
  getPaymentDetails: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const payment = await db.select().from(payments).where(eq(payments.stripeInvoiceId, input.paymentId));
      if (!payment.length || payment[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Payment not found" });
      }

      return payment[0];
    }),
});
