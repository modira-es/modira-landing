import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const stripeRouter = router({
  // Get all active products and prices
  getProducts: publicProcedure.query(async () => {
    const { data: products, error: productsError } = await supabase
      .from("stripe_products")
      .select("*")
      .eq("active", true);

    if (productsError) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error fetching products" });

    const productsWithPrices = await Promise.all(
      (products || []).map(async (product) => {
        const { data: prices, error: pricesError } = await supabase
          .from("stripe_prices")
          .select("*")
          .eq("stripe_product_id", product.stripe_product_id);
        
        if (pricesError) console.error("Error fetching prices for product", product.id, pricesError);
        return { 
          ...product, 
          stripeProductId: product.stripe_product_id, // Map for frontend compatibility
          prices: (prices || []).map(p => ({ ...p, stripePriceId: p.stripe_price_id })) 
        };
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

      // Get price details
      const { data: priceDetails, error: priceError } = await supabase
        .from("stripe_prices")
        .select("*")
        .eq("stripe_price_id", input.priceId)
        .single();

      if (priceError || !priceDetails) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Price not found" });
      }

      const price = priceDetails;

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
      
      try {
        // Fetch quotation from new unified schema
        let query = supabase
          .from("quotations")
          .select("*")
          .eq("id", input.quotationId);
        
        if (ctx.user.companyId) {
          query = query.eq("company_id", ctx.user.companyId);
        } else {
          query = query.eq("user_id", ctx.user.id);
        }

        const { data: quotation, error: quotationError } = await query.single();

        if (quotationError || !quotation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quotation not found" });
        }

        // Create Stripe checkout session for the quotation
        const session = await stripe!.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `Presupuesto: ${quotation.titulo}`,
                  description: quotation.numero_presupuesto,
                },
                unit_amount: Math.round(Number(quotation.precio_total) * 100),
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
        await supabase
          .from("quotations")
          .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
          .eq("id", quotation.id);

        return { sessionId: session.id, url: session.url };
      } catch (error) {
        console.error("Stripe quotation checkout error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create quotation checkout session" });
      }
    }),

  // Get user subscriptions
  getUserSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const { data: subs, error: subsError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", ctx.user.id);

    if (subsError) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error fetching subscriptions" });
    
    const subsWithDetails = await Promise.all(
      (subs || []).map(async (sub) => {
        const { data: price } = await supabase
          .from("stripe_prices")
          .select("*")
          .eq("stripe_price_id", sub.stripe_price_id)
          .single();
        
        const product = price ? await supabase
          .from("stripe_products")
          .select("*")
          .eq("stripe_product_id", price.stripe_product_id)
          .single() : { data: null };

        return {
          ...sub,
          stripeSubscriptionId: sub.stripe_subscription_id,
          stripePriceId: sub.stripe_price_id,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          canceledAt: sub.canceled_at,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at,
          price: price ? { ...price, stripePriceId: price.stripe_price_id } : null,
          product: product.data ? { ...product.data, stripeProductId: product.data.stripe_product_id } : null,
        };
      })
    );

    return subsWithDetails;
  }),

  // Get user payments/invoices
  getUserPayments: protectedProcedure.query(async ({ ctx }) => {
    let query = supabase
      .from("payments")
      .select("*");
    
    if (ctx.user.companyId) {
      query = query.eq("company_id", ctx.user.companyId);
    } else {
      query = query.eq("user_id", ctx.user.id);
    }

    const { data: userPayments, error } = await query;
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error fetching payments" });

    return (userPayments || []).map(p => ({
      ...p,
      userId: p.user_id,
      companyId: p.company_id,
      stripeInvoiceId: p.stripe_invoice_id,
      stripePaymentIntentId: p.stripe_payment_intent_id,
      paidAt: p.paid_at,
      dueDate: p.due_date,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  }),

  getUserInvoices: protectedProcedure.query(async ({ ctx }) => {
    let query = supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (ctx.user.companyId) {
      query = query.eq("company_id", ctx.user.companyId);
    } else {
      query = query.eq("user_id", ctx.user.id);
    }

    const { data: invoices, error } = await query;
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error fetching invoices" });

    return (invoices || []).map((payment) => ({
      id: payment.id,
      invoiceNumber: payment.stripe_invoice_id,
      companyId: payment.company_id,
      companyName: null,
      clientId: payment.user_id,
      clientName: null,
      projectId: null,
      projectName: null,
      status: payment.status,
      issueDate: payment.created_at,
      dueDate: payment.due_date,
      subtotal: null,
      tax: null,
      discount: null,
      total: payment.amount,
      currency: payment.currency,
      pdfUrl: null,
      stripeInvoiceId: payment.stripe_invoice_id,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    }));
  }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });

      // Verify subscription belongs to user
      const { data: sub, error: subError } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("stripe_subscription_id", input.subscriptionId)
        .single();

      if (subError || !sub || sub.user_id !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Subscription not found" });
      }

      try {
        const canceled = await stripe!.subscriptions.update(input.subscriptionId, {
          cancel_at_period_end: true,
        });

        // Update database
        await supabase
          .from("user_subscriptions")
          .update({ 
            status: canceled.status, 
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", input.subscriptionId);

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
      const { data: payment, error } = await supabase
        .from("payments")
        .select("*")
        .eq("stripe_invoice_id", input.paymentId)
        .single();

      if (error || !payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      // Check access: either by company or by user
      const hasAccess = ctx.user.companyId 
        ? payment.company_id === ctx.user.companyId 
        : payment.user_id === ctx.user.id;

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver este pago" });
      }

      return {
        ...payment,
        userId: payment.user_id,
        companyId: payment.company_id,
        stripeInvoiceId: payment.stripe_invoice_id,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
        paidAt: payment.paid_at,
        dueDate: payment.due_date,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
      };
    }),
});
