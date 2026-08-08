import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { payments, stripePrices, stripeProducts, userSubscriptions, quotations } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const stripeRouter = router({
  // Get all active products and prices
  getProducts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const products = await db.select().from(stripeProducts).where(eq(stripeProducts.active, true));
    
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
          // Note: In Supabase, email is in auth.users, not profiles. 
          // We might need to fetch it or pass it from frontend.
          metadata: {
            userId: ctx.user.id,
          },
        });

        return { sessionId: session.id, url: session.url };
      } catch (error) {
        console.error("Stripe checkout error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create checkout session" });
      }
    }),

  // Create checkout session for a specific quotation
  createQuotationCheckoutSession: protectedProcedure
    .input(
      z.object({
        quotationId: z.string(),
        successUrl: z.string(),
        cancelUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      
      try {
        // Fetch quotation from new unified schema
        const quotationResult = await db.select().from(quotations).where(
          and(
            eq(quotations.id, input.quotationId),
            ctx.user.companyId ? eq(quotations.companyId, ctx.user.companyId) : eq(quotations.userId, ctx.user.id)
          )
        ).limit(1);

        if (quotationResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
        }

        const quotation = quotationResult[0];

        // Create Stripe checkout session for the quotation
        const session = await stripe!.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `Presupuesto: ${quotation.titulo}`,
                  description: quotation.numeroPresupuesto,
                },
                unit_amount: Math.round(Number(quotation.precioTotal) * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            userId: ctx.user.id,
            quotationId: quotation.id,
          },
        });

        // Update quotation with session ID
        await db.update(quotations)
          .set({ stripeSessionId: session.id })
          .where(eq(quotations.id, quotation.id));

        return { sessionId: session.id, url: session.url };
      } catch (error) {
        console.error("Stripe quotation checkout error:", error);
        if (error instanceof TRPCError) throw error;
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

    const userPayments = await db
      .select()
      .from(payments)
      .where(
        ctx.user.companyId 
          ? eq(payments.companyId, ctx.user.companyId) 
          : eq(payments.userId, ctx.user.id)
      );
    return userPayments;
  }),

  getUserInvoices: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const invoices = await db
      .select()
      .from(payments)
      .where(
        ctx.user.companyId 
          ? eq(payments.companyId, ctx.user.companyId) 
          : eq(payments.userId, ctx.user.id)
      )
      .orderBy(desc(payments.createdAt));

    return invoices.map((payment) => ({
      id: payment.id,
      invoiceNumber: payment.stripeInvoiceId,
      companyId: payment.companyId,
      companyName: null,
      clientId: payment.userId,
      clientName: null,
      projectId: null,
      projectName: null,
      status: payment.status,
      issueDate: payment.createdAt,
      dueDate: payment.dueDate,
      subtotal: null,
      tax: null,
      discount: null,
      total: payment.amount,
      currency: payment.currency,
      pdfUrl: null,
      stripeInvoiceId: payment.stripeInvoiceId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));
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
      if (!payment.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      // Check access: either by company or by user
      const hasAccess = ctx.user.companyId 
        ? payment[0].companyId === ctx.user.companyId 
        : payment[0].userId === ctx.user.id;

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver este pago" });
      }

      return payment[0];
    }),
});
