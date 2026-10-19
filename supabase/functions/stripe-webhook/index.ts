import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY no está configurado");
}

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET no está configurado");
}

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL no está configurado");
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no está configurado"
  );
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Método no permitido",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const signature = request.headers.get(
    "stripe-signature"
  );

  if (!signature) {
    return new Response(
      JSON.stringify({
        error: "Falta el header stripe-signature",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "Error verificando firma de Stripe:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "Firma de Stripe inválida",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  console.log(
    `Stripe event recibido: ${event.id} (${event.type})`
  );

  /*
   * ============================================================
   * IDEMPOTENCIA
   * ============================================================
   *
   * Stripe puede reenviar el mismo evento.
   *
   * Si ya lo procesamos, devolvemos 200 y no hacemos nada más.
   */

  const { data: existingEvent, error: existingEventError } =
    await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

  if (existingEventError) {
    console.error(
      "Error comprobando evento existente:",
      existingEventError
    );

    return new Response(
      JSON.stringify({
        error: "Error comprobando idempotencia",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (existingEvent) {
    console.log(
      `Evento ${event.id} ya procesado`
    );

    return new Response(
      JSON.stringify({
        received: true,
        already_processed: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /*
   * ============================================================
   * FUNCIÓN AUXILIAR
   * ============================================================
   *
   * Registra un PaymentIntent mediante la RPC segura de
   * PostgreSQL.
   *
   * La RPC:
   *
   * - obtiene la factura
   * - obtiene company_id
   * - obtiene user_id
   * - obtiene importe_a_pagar
   * - comprueba el importe
   * - comprueba la moneda
   * - registra payments
   * - marca invoices como pagada cuando corresponde
   */

  const registerPaymentIntent = async (
    paymentIntent: Stripe.PaymentIntent,
    checkoutSessionId: string | null = null
  ) => {
    const invoiceId = paymentIntent.metadata?.invoice_id;

    if (!invoiceId) {
      // Otros PaymentIntents de Stripe pueden pertenecer a pagos ajenos a Modira.
      console.log(`PaymentIntent ${paymentIntent.id} sin metadata.invoice_id; se ignora.`);
      return null;
    }

    // Si este pago procede del nuevo flujo fiscal, adjuntamos el PaymentIntent
    // a la factura de Stripe para que la factura quede marcada como pagada allí.
    const stripeInvoiceId = paymentIntent.metadata?.stripe_invoice_id;

    if (paymentIntent.status === "succeeded" && stripeInvoiceId) {
      const stripeInvoice = await stripe.invoices.retrieve(
        stripeInvoiceId,
        {
          expand: ["payments.data.payment.payment_intent"],
        },
      );
      const invoiceWithPayments = stripeInvoice as Stripe.Invoice & {
        payments?: {
          data?: Array<{
            payment?: {
              payment_intent?: string | Stripe.PaymentIntent | null;
            } | null;
          }>;
        };
      };
      const paymentEntries =
        invoiceWithPayments.payments?.data ?? [];
      const alreadyAttached = paymentEntries.some((entry) => {
        const attached = entry.payment?.payment_intent;
        const attachedId = typeof attached === "string"
          ? attached
          : attached?.id;

        return attachedId === paymentIntent.id;
      });
      const invoiceCustomerId =
        typeof stripeInvoice.customer === "string"
          ? stripeInvoice.customer
          : stripeInvoice.customer?.id;
      const paymentCustomerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id;

      if (
        stripeInvoice.metadata?.invoice_id !== invoiceId ||
        stripeInvoice.currency !== paymentIntent.currency ||
        stripeInvoice.total !== paymentIntent.amount ||
        !invoiceCustomerId ||
        !paymentCustomerId ||
        invoiceCustomerId !== paymentCustomerId
      ) {
        throw new Error(
          `PaymentIntent ${paymentIntent.id} no coincide con la factura fiscal ${stripeInvoiceId}`,
        );
      }

      if (!alreadyAttached) {
        if (
          stripeInvoice.status !== "open" ||
          stripeInvoice.amount_due !== paymentIntent.amount
        ) {
          throw new Error(
            `La factura de Stripe ${stripeInvoiceId} no admite el pago ${paymentIntent.id}`,
          );
        }

        await stripe.invoices.attachPayment(stripeInvoiceId, {
          payment_intent: paymentIntent.id,
        });
      }

      const confirmedInvoice = alreadyAttached
        ? stripeInvoice
        : await stripe.invoices.retrieve(stripeInvoiceId, {
          expand: ["payments.data.payment.payment_intent"],
        });
      const confirmedPayments =
        (confirmedInvoice as Stripe.Invoice & {
          payments?: {
            data?: Array<{
              payment?: {
                payment_intent?: string | Stripe.PaymentIntent | null;
              } | null;
            }>;
          };
        }).payments?.data ?? [];
      const paymentIsAttached = confirmedPayments.some((entry) => {
        const attached = entry.payment?.payment_intent;
        const attachedId = typeof attached === "string"
          ? attached
          : attached?.id;

        return attachedId === paymentIntent.id;
      });

      if (
        confirmedInvoice.status !== "paid" ||
        !paymentIsAttached
      ) {
        throw new Error(
          `Stripe no confirmó como pagada la factura ${stripeInvoiceId} con el pago ${paymentIntent.id}`,
        );
      }
    }

    let status: string;


switch (paymentIntent.status) {
  case "succeeded":
    status = "succeeded";
    break;

  case "canceled":
    status = "canceled";
    break;

  case "requires_payment_method":
    status = "failed";
    break;

  default:
    throw new Error(
      `PaymentIntent ${paymentIntent.id} tiene un estado no soportado: ${paymentIntent.status}`
    );
}

    const paidAt =
      paymentIntent.status === "succeeded"
        ? new Date().toISOString()
        : null;

    if (
      !checkoutSessionId &&
      paymentIntent.status === "succeeded"
    ) {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
      });

      checkoutSessionId = sessions.data[0]?.id ?? null;
    }

    const { data, error } = await supabase.rpc(
      "register_stripe_invoice_payment",
      {
        p_invoice_id: invoiceId,
        p_checkout_session_id:
          checkoutSessionId,
        p_payment_intent_id:
          paymentIntent.id,
        p_amount: paymentIntent.amount,
        p_currency:
          paymentIntent.currency.toUpperCase(),
        p_status: status,
        p_paid_at: paidAt,
        p_description:
          paymentIntent.description ??
          null,
      }
    );

    if (error) {
      throw new Error(
        `Error registrando pago ${paymentIntent.id}: ${error.message}`
      );
    }

    if (stripeInvoiceId || checkoutSessionId) {
      const paymentLink: {
        stripe_invoice_id?: string;
        stripe_checkout_session_id?: string;
      } = {};

      if (stripeInvoiceId) {
        paymentLink.stripe_invoice_id = stripeInvoiceId;
      }

      if (checkoutSessionId) {
        paymentLink.stripe_checkout_session_id =
          checkoutSessionId;
      }

      const {
        data: linkedPayment,
        error: paymentLinkError,
      } = await supabase
        .from("payments")
        .update(paymentLink)
        .eq("invoice_id", invoiceId)
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .select("id")
        .maybeSingle();

      if (paymentLinkError) {
        throw new Error(
          `Error vinculando el pago ${paymentIntent.id} con la factura de Stripe: ${paymentLinkError.message}`,
        );
      }

      if (!linkedPayment) {
        throw new Error(
          `No se encontró el pago ${paymentIntent.id} para vincularlo con la factura de Stripe`,
        );
      }
    }

    return data;
  };

  try {
    /*
     * ==========================================================
     * CHECKOUT SESSION COMPLETED
     * ==========================================================
     *
     * IMPORTANTE:
     *
     * checkout.session.completed NO marca la factura como
     * pagada por sí solo.
     *
     * La confirmación definitiva del pago la hacemos mediante
     * PaymentIntent.
     */

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      console.log("Checkout Session completada:", session.id);

      if (session.payment_status === "paid") {
        if (!session.payment_intent) {
          throw new Error(
            `Checkout Session ${session.id} no tiene PaymentIntent`,
          );
        }

        const paymentIntent =
          await stripe.paymentIntents.retrieve(
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id,
          );

        await registerPaymentIntent(
          paymentIntent,
          session.id,
        );
      }
    }

    /*
     * ==========================================================
     * CHECKOUT ASYNC PAYMENT SUCCEEDED
     * ==========================================================
     */

    if (
      event.type ===
      "checkout.session.async_payment_succeeded"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      if (!session.payment_intent) {
        throw new Error(
          `Checkout Session ${session.id} no tiene PaymentIntent`
        );
      }

      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id
        );

      await registerPaymentIntent(
        paymentIntent,
        session.id
      );
    }
    /*
     * ==========================================================
     * CHECKOUT ASYNC PAYMENT FAILED
     * ==========================================================
     */

    if (
      event.type ===
      "checkout.session.async_payment_failed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      if (!session.payment_intent) {
        throw new Error(
          `Checkout Session ${session.id} no tiene PaymentIntent`
        );
      }

      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id
        );

      await registerPaymentIntent(
        paymentIntent,
        session.id
      );
    }

    /*
     * ==========================================================
     * PAYMENT INTENT SUCCEEDED
     * ==========================================================
     */

    if (
      event.type ===
      "payment_intent.succeeded"
    ) {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      await registerPaymentIntent(
        paymentIntent
      );
    }

    /*
     * ==========================================================
     * PAYMENT INTENT FAILED
     * ==========================================================
     */

    if (
      event.type ===
      "payment_intent.payment_failed"
    ) {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      await registerPaymentIntent(
        paymentIntent
      );
    }

    /*
     * ==========================================================
     * PAYMENT INTENT CANCELED
     * ==========================================================
     */

    if (
      event.type ===
      "payment_intent.canceled"
    ) {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      await registerPaymentIntent(
        paymentIntent
      );
    }

    /*
     * ==========================================================
     * REGISTRAR EVENTO PROCESADO
     * ==========================================================
     */

    const { error: eventInsertError } =
      await supabase
        .from("stripe_webhook_events")
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
        });

    if (eventInsertError) {
      /*
       * Puede ocurrir una carrera entre dos entregas del mismo
       * evento. La restricción UNIQUE de la migración 012
       * protege la tabla.
       *
       * Si el evento ya existe, no consideramos esto un fallo
       * del pago.
       */

      if (
        eventInsertError.code !== "23505"
      ) {
        throw eventInsertError;
      }
    }

    console.log(
      `Evento ${event.id} procesado correctamente`
    );

    return new Response(
      JSON.stringify({
        received: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      `Error procesando evento ${event.id}:`,
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Error procesando webhook",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});