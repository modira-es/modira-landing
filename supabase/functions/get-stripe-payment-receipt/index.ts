import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================================
// CONFIGURACIÓN DE STRIPE
// ============================================================

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY no está configurada");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
});

// ============================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL no está configurada");
}

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY no está configurada");
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no está configurada",
  );
}

// ============================================================
// CORS
// ============================================================

const rawAllowedOrigins =
  Deno.env.get("MODIRA_ALLOWED_ORIGINS") ?? "";

const allowedOrigins = new Set(
  rawAllowedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function getCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

// ============================================================
// RESPUESTAS JSON
// ============================================================

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  corsHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // ----------------------------------------------------------
  // 1. CORS
  // ----------------------------------------------------------

  if (req.method === "OPTIONS") {
    if (
      origin &&
      !allowedOrigins.has(origin)
    ) {
      return new Response(null, {
        status: 403,
      });
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // ----------------------------------------------------------
  // 2. MÉTODO HTTP
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Método no permitido",
      },
      405,
      corsHeaders,
    );
  }

  // ----------------------------------------------------------
  // 3. ORIGEN AUTORIZADO
  // ----------------------------------------------------------

  if (
    origin &&
    !allowedOrigins.has(origin)
  ) {
    return jsonResponse(
      {
        success: false,
        error: "Origen no autorizado",
      },
      403,
      corsHeaders,
    );
  }

  try {
    // --------------------------------------------------------
    // 4. AUTENTICACIÓN
    // --------------------------------------------------------

    const authorization =
      req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          error: "No autenticado",
        },
        401,
        corsHeaders,
      );
    }

    const accessToken = authorization
      .substring("Bearer ".length)
      .trim();

    if (!accessToken) {
      return jsonResponse(
        {
          success: false,
          error: "No autenticado",
        },
        401,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 5. CLIENTE SUPABASE DEL USUARIO
    // --------------------------------------------------------

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // --------------------------------------------------------
    // 6. CLIENTE ADMINISTRADOR
    // --------------------------------------------------------

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // --------------------------------------------------------
    // 7. VERIFICAR IDENTIDAD
    // --------------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.warn(
        "[get-stripe-payment-receipt] Sesión no válida",
      );

      return jsonResponse(
        {
          success: false,
          error: "La sesión no es válida",
        },
        401,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 8. VERIFICAR PERFIL DEL CLIENTE
    // --------------------------------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, rol, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "[get-stripe-payment-receipt] Error consultando perfil:",
        profileError,
      );

      return jsonResponse(
        {
          success: false,
          error: "No se ha podido verificar tu cuenta",
        },
        500,
        corsHeaders,
      );
    }

    if (!profile) {
      return jsonResponse(
        {
          success: false,
          error: "No se ha encontrado tu perfil",
        },
        403,
        corsHeaders,
      );
    }

    if (profile.rol !== "user") {
      return jsonResponse(
        {
          success: false,
          error:
            "Esta operación solo está disponible para cuentas de cliente",
        },
        403,
        corsHeaders,
      );
    }

    if (
      String(profile.status ?? "")
        .trim()
        .toLowerCase() !== "active"
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Tu cuenta no está activa",
        },
        403,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 9. LEER EL ID DE LA FACTURA
    // --------------------------------------------------------

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "El cuerpo de la petición no es JSON válido",
        },
        400,
        corsHeaders,
      );
    }

    const invoiceId =
      typeof (body as Record<string, unknown>)
        ?.invoice_id === "string"
        ? String(
            (body as Record<string, unknown>)
              .invoice_id,
          ).trim()
        : "";

    if (!invoiceId) {
      return jsonResponse(
        {
          success: false,
          error: "invoice_id es obligatorio",
        },
        400,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 10. OBTENER LA FACTURA DEL CLIENTE
    // --------------------------------------------------------
    //
    // La factura se consulta utilizando:
    //
    //   id      = factura solicitada
    //   user_id = usuario autenticado
    //
    // No confiamos en que el frontend haya ocultado los botones.
    // --------------------------------------------------------

    const {
      data: invoice,
      error: invoiceError,
    } = await supabaseAdmin
      .from("invoices")
      .select(
        `
          id,
          user_id,
          company_id,
          numero_factura,
          estado,
          importe_a_pagar,
          stripe_invoice_id,
          fecha_pago
        `,
      )
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "[get-stripe-payment-receipt] Error consultando factura:",
        invoiceError,
      );

      return jsonResponse(
        {
          success: false,
          error: "No se ha podido consultar la factura",
        },
        500,
        corsHeaders,
      );
    }

    if (!invoice) {
      return jsonResponse(
        {
          success: false,
          error:
            "La factura no existe o no tienes permiso para consultarla",
        },
        404,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 11. COMPROBAR QUE MODIRA MARCA LA FACTURA COMO PAGADA
    // --------------------------------------------------------

    const invoiceStatus = String(
      invoice.estado ?? "",
    )
      .trim()
      .toLowerCase();

    if (invoiceStatus !== "pagada") {
      return jsonResponse(
        {
          success: false,
          error:
            "El pago todavía no está confirmado en Modira",
          code: "PAYMENT_NOT_CONFIRMED",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 12. IDENTIFICADOR DE LA FACTURA DE STRIPE
    // --------------------------------------------------------

    const stripeInvoiceId = String(
      invoice.stripe_invoice_id ?? "",
    ).trim();

    if (!stripeInvoiceId) {
      return jsonResponse(
        {
          success: false,
          error:
            "La factura todavía no tiene una factura fiscal de Stripe vinculada",
          code: "STRIPE_INVOICE_NOT_LINKED",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 13. OBTENER UN PAGO CONFIRMADO EN LA BASE DE DATOS
    // --------------------------------------------------------
    //
    // Solo se aceptan pagos:
    //
    //   - De esta factura.
    //   - Del usuario autenticado.
    //   - Con estado succeeded.
    //   - Con PaymentIntent de Stripe.
    // --------------------------------------------------------

    const {
      data: payment,
      error: paymentError,
    } = await supabaseAdmin
      .from("payments")
      .select(
        `
          id,
          invoice_id,
          user_id,
          amount,
          currency,
          status,
          paid_at,
          stripe_invoice_id,
          stripe_payment_intent_id,
          stripe_checkout_session_id
        `,
      )
      .eq("invoice_id", invoice.id)
      .eq("user_id", user.id)
      .eq("status", "succeeded")
      .not("stripe_payment_intent_id", "is", null)
      .order("paid_at", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error(
        "[get-stripe-payment-receipt] Error consultando pago:",
        paymentError,
      );

      return jsonResponse(
        {
          success: false,
          error: "No se ha podido consultar el pago",
        },
        500,
        corsHeaders,
      );
    }

    if (!payment) {
      return jsonResponse(
        {
          success: false,
          error:
            "No existe un pago confirmado asociado a esta factura",
          code: "CONFIRMED_PAYMENT_NOT_FOUND",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 14. COMPROBAR QUE EL PAGO ESTÁ VINCULADO A STRIPE
    // --------------------------------------------------------

    if (
      payment.stripe_invoice_id !== stripeInvoiceId
    ) {
      console.error(
        "[get-stripe-payment-receipt] La factura de Stripe del pago no coincide",
        {
          invoiceId: invoice.id,
          paymentId: payment.id,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "El pago no está vinculado correctamente a la factura de Stripe",
          code: "STRIPE_INVOICE_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    const paymentIntentId = String(
      payment.stripe_payment_intent_id ?? "",
    ).trim();

    if (!paymentIntentId) {
      return jsonResponse(
        {
          success: false,
          error:
            "El pago no tiene un identificador de Stripe válido",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 15. CONSULTAR EL PAYMENTINTENT DIRECTAMENTE EN STRIPE
    // --------------------------------------------------------

    const paymentIntent =
      await stripe.paymentIntents.retrieve(
        paymentIntentId,
        {
          expand: ["latest_charge"],
        },
      );

    // --------------------------------------------------------
    // 16. VERIFICAR EL ESTADO REAL DEL PAGO
    // --------------------------------------------------------

    if (paymentIntent.status !== "succeeded") {
      return jsonResponse(
        {
          success: false,
          error:
            "Stripe todavía no confirma el pago como completado",
          code: "STRIPE_PAYMENT_NOT_SUCCEEDED",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 17. VALIDAR LOS METADATOS DEL PAYMENTINTENT
    // --------------------------------------------------------

    if (
      paymentIntent.metadata?.invoice_id !== invoice.id ||
      paymentIntent.metadata?.stripe_invoice_id !==
        stripeInvoiceId
    ) {
      console.error(
        "[get-stripe-payment-receipt] Metadatos del PaymentIntent no coincidentes",
        {
          invoiceId: invoice.id,
          paymentIntentId: paymentIntent.id,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "El pago de Stripe no corresponde a esta factura",
          code: "PAYMENT_INTENT_METADATA_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 18. VALIDAR IMPORTE Y MONEDA
    // --------------------------------------------------------

    const expectedAmount = Math.round(
      Number(invoice.importe_a_pagar) * 100,
    );

    if (
      !Number.isSafeInteger(expectedAmount) ||
      expectedAmount <= 0 ||
      paymentIntent.amount !== expectedAmount ||
      payment.amount !== expectedAmount
    ) {
      console.error(
        "[get-stripe-payment-receipt] Importe no coincidente",
        {
          invoiceId: invoice.id,
          paymentIntentId: paymentIntent.id,
          expectedAmount,
          paymentIntentAmount: paymentIntent.amount,
          databasePaymentAmount: payment.amount,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "El importe del pago no coincide con el de la factura",
          code: "PAYMENT_AMOUNT_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    const databaseCurrency = String(
      payment.currency ?? "",
    ).toLowerCase();

    if (
      paymentIntent.currency.toLowerCase() !==
      databaseCurrency
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "La moneda del pago no coincide con la registrada",
          code: "PAYMENT_CURRENCY_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 19. OBTENER LA FACTURA FISCAL DESDE STRIPE
    // --------------------------------------------------------

    const stripeInvoice =
      await stripe.invoices.retrieve(
        stripeInvoiceId,
      );

    // --------------------------------------------------------
    // 20. VALIDAR LA FACTURA DE STRIPE
    // --------------------------------------------------------

    if (
      stripeInvoice.metadata?.invoice_id !== invoice.id
    ) {
      console.error(
        "[get-stripe-payment-receipt] Metadatos de factura Stripe no coincidentes",
        {
          invoiceId: invoice.id,
          stripeInvoiceId,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "La factura fiscal de Stripe no corresponde a la factura de Modira",
          code: "STRIPE_INVOICE_METADATA_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    if (stripeInvoice.status !== "paid") {
      return jsonResponse(
        {
          success: false,
          error:
            "Stripe todavía no confirma la factura fiscal como pagada",
          code: "STRIPE_INVOICE_NOT_PAID",
        },
        409,
        corsHeaders,
      );
    }

    if (
      stripeInvoice.amount_paid !== expectedAmount ||
      stripeInvoice.currency.toLowerCase() !==
        paymentIntent.currency.toLowerCase()
    ) {
      console.error(
        "[get-stripe-payment-receipt] Importe de factura Stripe no coincidente",
        {
          invoiceId: invoice.id,
          stripeInvoiceId,
          stripeAmountPaid: stripeInvoice.amount_paid,
          expectedAmount,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "El importe de la factura fiscal de Stripe no coincide con el pago",
          code: "STRIPE_INVOICE_AMOUNT_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    // --------------------------------------------------------
    // 21. OBTENER EL RECIBO DE PAGO
    // --------------------------------------------------------
    //
    // receipt_url:
    // Página de recibo de pago alojada por Stripe.
    //
    // invoice_pdf:
    // PDF de la factura fiscal generada por Stripe.
    //
    // Son documentos distintos y se devuelven por separado.
    // --------------------------------------------------------

    let charge: Stripe.Charge | null = null;

    const latestCharge = paymentIntent.latest_charge;

    if (typeof latestCharge === "string") {
      charge = await stripe.charges.retrieve(
        latestCharge,
      );
    } else if (latestCharge) {
      charge = latestCharge;
    }

    if (
      charge &&
      (
        !charge.paid ||
        charge.amount !== expectedAmount ||
        charge.currency.toLowerCase() !==
          paymentIntent.currency.toLowerCase()
      )
    ) {
      console.error(
        "[get-stripe-payment-receipt] El cargo no coincide con el pago esperado",
        {
          invoiceId: invoice.id,
          paymentIntentId: paymentIntent.id,
          chargeId: charge.id,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "El cargo de Stripe no coincide con el pago confirmado",
          code: "STRIPE_CHARGE_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    const receiptUrl = charge?.receipt_url ?? null;
    const invoicePdfUrl = stripeInvoice.invoice_pdf ?? null;

    // --------------------------------------------------------
    // 22. RESPUESTA
    // --------------------------------------------------------

    if (!receiptUrl && !invoicePdfUrl) {
      return jsonResponse(
        {
          success: false,
          error:
            "El pago está confirmado, pero Stripe todavía no dispone de los documentos",
          code: "STRIPE_DOCUMENTS_NOT_AVAILABLE",
        },
        409,
        corsHeaders,
      );
    }

    console.log(
      "[get-stripe-payment-receipt] Documentos verificados",
      {
        invoiceId: invoice.id,
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        hasReceipt: Boolean(receiptUrl),
        hasInvoicePdf: Boolean(invoicePdfUrl),
      },
    );

    return jsonResponse(
      {
        success: true,

        invoice_id: invoice.id,
        invoice_number: invoice.numero_factura,

        payment_id: payment.id,
        payment_intent_id: paymentIntent.id,

        paid_at:
          payment.paid_at ??
          invoice.fecha_pago ??
          null,

        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),

        // Recibo de pago alojado por Stripe.
        receipt_url: receiptUrl,

        // PDF de la factura fiscal de Stripe.
        invoice_pdf_url: invoicePdfUrl,

        // Disponibilidad de cada documento.
        receipt_available: Boolean(receiptUrl),
        invoice_pdf_available: Boolean(invoicePdfUrl),
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error(
      "[get-stripe-payment-receipt] Error interno:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          "No se han podido obtener los documentos del pago",
        code: "STRIPE_PAYMENT_RECEIPT_ERROR",
      },
      500,
      corsHeaders,
    );
  }
});