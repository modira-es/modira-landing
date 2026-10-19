import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================================
// STRIPE
// ============================================================

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY no está configurada");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
});

// ============================================================
// SUPABASE
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

function getAllowedOrigins(): Set<string> {
  const raw =
    Deno.env.get("MODIRA_ALLOWED_ORIGINS") ?? "";

  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (origins.length === 0) {
    throw new Error(
      "MODIRA_ALLOWED_ORIGINS no está configurada.",
    );
  }

  return new Set(origins);
}

const allowedOrigins = getAllowedOrigins();

function getCorsHeaders(origin: string | null) {
  const allowed =
    origin !== null &&
    allowedOrigins.has(origin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

// ============================================================
// ACKNOWLEDGEMENT
// ============================================================

const INVOICE_DOCUMENT_ACKNOWLEDGEMENT_VERSION =
  "invoice_document_acknowledgement_v1";

// ============================================================
// RESPUESTA JSON
// ============================================================

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  corsHeaders: Record<string, string> = {},
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

// ============================================================
// PREPARAR DESCRIPCIÓN DE FACTURA PARA STRIPE
// ============================================================

const formatInvoiceDescriptionForStripe = (
  description: string | null,
  invoiceNumber: string,
  dueDate: string | null,
): string => {
  if (!description || !description.trim()) {
    return dueDate
      ? `Pago de la factura ${invoiceNumber}
Vencimiento: ${new Date(
          dueDate,
        ).toLocaleDateString("es-ES")}`
      : `Pago de la factura ${invoiceNumber}`;
  }

  const text = description.trim();

  const titleMatch = text.match(
    /Título:\s*(.*?)(?=\n\s*\n|Descripción detallada:|Servicios incluidos:|Notas:|$)/i,
  );

  const detailMatch = text.match(
    /Descripción detallada:\s*(.*?)(?=\n\s*\n|Servicios incluidos:|Notas:|$)/i,
  );

  const servicesMatch = text.match(
    /Servicios incluidos:\s*([\s\S]*?)(?=\n\s*\nNotas:|Notas:|$)/i,
  );

  const notesMatch = text.match(
    /Notas:\s*([\s\S]*?)$/i,
  );

  const title = titleMatch?.[1]?.trim() || "";
  const detail = detailMatch?.[1]?.trim() || "";
  const services = servicesMatch?.[1]?.trim() || "";
  const notes = notesMatch?.[1]?.trim() || "";

  const sections: string[] = [];

  if (title) {
    sections.push(`Título: ${title}`);
  }

  if (detail) {
    sections.push(`Descripción: ${detail}`);
  }

  if (services) {
    const formattedServices = services
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const serviceMatch = line.match(
          /^-\s*(.*?)\s*\|\s*Cantidad:\s*([^|]+)\s*\|\s*Precio:\s*(.+)$/i,
        );

        if (serviceMatch) {
          return `• ${serviceMatch[1].trim()}`;
        }

        return line.replace(/^-\s*/, "• ");
      })
      .join("\n");

    if (formattedServices) {
      sections.push(
        `Servicios incluidos:\n${formattedServices}`,
      );
    }
  }

  if (notes) {
    sections.push(`Notas: ${notes}`);
  }

  if (dueDate) {
    sections.push(
      `Vencimiento: ${new Date(
        dueDate,
      ).toLocaleDateString("es-ES")}`,
    );
  }

  if (sections.length === 0) {
    return dueDate
      ? `${text}\nVencimiento: ${new Date(
          dueDate,
        ).toLocaleDateString("es-ES")}`
      : text;
  }

  return sections.join("\n\n");
};

// ============================================================
// OBTENER TÍTULO DE FACTURA
// ============================================================

const getInvoiceTitle = (
  description: string | null,
  invoiceNumber: string,
): string => {
  const text = description?.trim() || "";

  const titleMatch = text.match(
    /Título:\s*(.*?)(?=\n|Descripción detallada:|Servicios incluidos:|Notas:|$)/i,
  );

  const title = titleMatch?.[1]?.trim();

  return title || `Factura ${invoiceNumber}`;
};

// ============================================================
// LIMITAR TEXTOS PARA STRIPE
// ============================================================

const truncateForStripe = (
  value: string,
  maxLength: number,
): string => {
  const text = value.trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
};

const parseScaledAmount = (
  value: unknown,
  label: string,
): bigint => {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error(`${label} no es un importe válido`);
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt(
    (match[2] ?? "").padEnd(2, "0"),
  );

  return whole * 100n + fraction;
};

const parseRateBasisPoints = (
  value: unknown,
  label: string,
): bigint => {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error(`${label} no es un porcentaje válido`);
  }

  return BigInt(match[1]) * 100n +
    BigInt((match[2] ?? "").padEnd(2, "0"));
};

const calculateTaxCents = (
  baseCents: bigint,
  rateBasisPoints: bigint,
): bigint => (
  baseCents * rateBasisPoints + 5_000n
) / 10_000n;

const getValidatedTaxBreakdown = (
  invoice: Record<string, unknown>,
) => {
  const subtotalCents = parseScaledAmount(
    invoice.subtotal,
    "La base imponible",
  );
  const vatCents = parseScaledAmount(
    invoice.iva_importe,
    "El importe de IVA",
  );
  const withholdingCents = parseScaledAmount(
    invoice.irpf_importe,
    "El importe de IRPF",
  );
  const grossCents = parseScaledAmount(
    invoice.monto,
    "El importe bruto",
  );
  const amountToPayCents = parseScaledAmount(
    invoice.importe_a_pagar,
    "El importe a pagar",
  );
  const vatRate = parseRateBasisPoints(
    invoice.iva_porcentaje,
    "El porcentaje de IVA",
  );
  const withholdingRate = parseRateBasisPoints(
    invoice.irpf_porcentaje,
    "El porcentaje de IRPF",
  );
  const vatApplied = invoice.iva_aplicado;
  const withholdingApplied = invoice.irpf_aplicado;

  if (
    typeof vatApplied !== "boolean" ||
    typeof withholdingApplied !== "boolean"
  ) {
    throw new Error("La configuración fiscal de la factura no es válida");
  }

  if (vatRate > 10_000n || withholdingRate > 10_000n) {
    throw new Error("Los porcentajes fiscales exceden el máximo permitido");
  }

  if (
    (!vatApplied && (vatRate !== 0n || vatCents !== 0n)) ||
    (!withholdingApplied &&
      (withholdingRate !== 0n || withholdingCents !== 0n)) ||
    (withholdingApplied && withholdingRate === 0n)
  ) {
    throw new Error("Los indicadores fiscales no coinciden con sus importes");
  }

  const expectedVatCents = vatApplied
    ? calculateTaxCents(subtotalCents, vatRate)
    : 0n;
  const expectedWithholdingCents = withholdingApplied
    ? calculateTaxCents(subtotalCents, withholdingRate)
    : 0n;
  const expectedGrossCents = subtotalCents + expectedVatCents;
  const expectedAmountToPayCents =
    expectedGrossCents - expectedWithholdingCents;

  if (
    expectedVatCents !== vatCents ||
    expectedWithholdingCents !== withholdingCents ||
    expectedGrossCents !== grossCents ||
    expectedAmountToPayCents !== amountToPayCents ||
    amountToPayCents <= 0n
  ) {
    throw new Error(
      "El desglose fiscal no coincide con el importe final de la factura",
    );
  }

  const maxSafeCents = BigInt(Number.MAX_SAFE_INTEGER);

  if (
    subtotalCents > maxSafeCents ||
    vatCents > maxSafeCents ||
    withholdingCents > maxSafeCents ||
    amountToPayCents > maxSafeCents
  ) {
    throw new Error("Los importes de la factura exceden el límite permitido");
  }

  return {
    subtotalCents: Number(subtotalCents),
    vatCents: Number(vatCents),
    withholdingCents: Number(withholdingCents),
    amountToPayCents: Number(amountToPayCents),
    vatRatePercent: Number(vatRate) / 100,
  };
};

// ============================================================
// EDGE FUNCTION
// ============================================================

Deno.serve(async (req) => {
  const corsHeaders =
    getCorsHeaders(
      req.headers.get("Origin"),
    );

  // ==========================================================
  // 1. CORS
  // ==========================================================

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // ==========================================================
  // 2. SOLO POST
  // ==========================================================

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Método no permitido",
      },
      405,
      corsHeaders,
    );
  }

  try {
    // ========================================================
    // 3. AUTHORIZATION
    // ========================================================

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          error: "No autenticado",
        },
        401,
        corsHeaders,
      );
    }

    const accessToken =
      authHeader.substring("Bearer ".length).trim();

    if (!accessToken) {
      return jsonResponse(
        {
          error: "No autenticado",
        },
        401,
        corsHeaders,
      );
    }

    // ========================================================
    // 4. CLIENTE SUPABASE CON TOKEN DEL USUARIO
    // ========================================================

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

    // ========================================================
    // 5. CLIENTE SERVICE ROLE
    // ========================================================

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // ========================================================
    // 6. USUARIO ACTUAL
    // ========================================================

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "[create-checkout-session] Error verificando usuario:",
        userError,
      );

      return jsonResponse(
        {
          error: "Sesión no válida",
        },
        401,
        corsHeaders,
      );
    }

    console.log(
      "[create-checkout-session] Usuario autenticado:",
      user.id,
    );

    // ========================================================
    // 7. OBTENER PERFIL
    // ========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, status, rol")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "[create-checkout-session] Error obteniendo perfil:",
        profileError,
      );

      return jsonResponse(
        {
          error:
            "No se ha podido verificar el estado de la cuenta",
        },
        500,
        corsHeaders,
      );
    }

    // ========================================================
    // 8. PERFIL OBLIGATORIO
    // ========================================================

    if (!profile) {
      console.error(
        "[create-checkout-session] No existe perfil para:",
        user.id,
      );

      return jsonResponse(
        {
          error:
            "No se ha podido verificar la cuenta",
        },
        403,
        corsHeaders,
      );
    }

    // ========================================================
    // 9. SOLO CLIENTES
    // ========================================================
    //
    // Esta Edge Function crea un pago para una factura del
    // cliente autenticado.
    //
    // Un worker no debe utilizar esta vía.
    //
    // No se utiliza ningún permiso worker aquí porque pagar
    // una factura es una acción propia del cliente.
    // ========================================================

    if (profile.rol !== "user") {
      console.warn(
        "[create-checkout-session] Intento de checkout desde una cuenta no cliente:",
        {
          userId: user.id,
          rol: profile.rol,
        },
      );

      return jsonResponse(
        {
          error:
            "Esta operación solo está disponible para cuentas de cliente",
        },
        403,
        corsHeaders,
      );
    }

    // ========================================================
    // 10. CUENTA ACTIVA
    // ========================================================

    const profileStatus = String(
      profile.status ?? "",
    )
      .trim()
      .toLowerCase();

    if (profileStatus !== "active") {
      console.warn(
        "[create-checkout-session] Cuenta no activa:",
        {
          userId: user.id,
          status: profile.status,
        },
      );

      return jsonResponse(
        {
          error:
            "Tu cuenta no está activa y no puede realizar pagos",
        },
        403,
        corsHeaders,
      );
    }

    // ========================================================
    // 11. BODY
    // ========================================================

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error:
            "El cuerpo de la petición no es JSON válido",
        },
        400,
        corsHeaders,
      );
    }

    // ========================================================
    // 12. INVOICE ID
    // ========================================================

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
          error: "invoice_id es obligatorio",
        },
        400,
        corsHeaders,
      );
    }

    console.log(
      "[create-checkout-session] Solicitud de Checkout:",
      {
        invoiceId,
        userId: user.id,
      },
    );

    // ========================================================
    // 13. OBTENER FACTURA
    // ========================================================
    //
    // Se mantiene la protección doble:
    //
    //   RLS + user_id
    //
    // El frontend no puede decidir qué factura pagar.
    // ========================================================

    const {
      data: invoice,
      error: invoiceError,
    } = await supabase
      .from("invoices")
      .select(
        `
          id,
          user_id,
          company_id,
          numero_factura,
          estado,
          monto,
          subtotal,
          iva_aplicado,
          iva_porcentaje,
          iva_importe,
          irpf_aplicado,
          irpf_porcentaje,
          irpf_importe,
          importe_a_pagar,
          descripcion,
          fecha_vencimiento,
          document_path,
          document_sha256,
          stripe_invoice_id
        `,
      )
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "[create-checkout-session] Error obteniendo factura:",
        invoiceError,
      );

      return jsonResponse(
        {
          error:
            "No se ha podido obtener la factura",
          code:
            invoiceError.code ??
            "INVOICE_QUERY_ERROR",
        },
        500,
        corsHeaders,
      );
    }

    // ========================================================
    // 14. FACTURA NO EXISTE / NO PERTENECE AL CLIENTE
    // ========================================================

    if (!invoice) {
      return jsonResponse(
        {
          error:
            "La factura no existe o no tienes acceso a ella",
        },
        404,
        corsHeaders,
      );
    }

    // ========================================================
    // 15. ESTADO DE LA FACTURA
    // ========================================================

    const normalizedStatus = String(
      invoice.estado ?? "",
    )
      .trim()
      .toLowerCase();

    if (normalizedStatus === "pagada") {
      return jsonResponse(
        {
          error: "La factura ya está pagada",
        },
        409,
        corsHeaders,
      );
    }

    if (normalizedStatus === "cancelada") {
      return jsonResponse(
        {
          error:
            "Esta factura está cancelada y no se puede pagar",
        },
        409,
        corsHeaders,
      );
    }

    // ========================================================
    // 16. DOCUMENTO PDF OBLIGATORIO
    // ========================================================

    const documentPath =
      String(
        invoice.document_path ?? "",
      ).trim();

    if (!documentPath) {
      return jsonResponse(
        {
          error:
            "Esta factura no tiene un documento PDF asociado y no puede iniciar el pago.",
          code:
            "INVOICE_DOCUMENT_REQUIRED",
        },
        409,
        corsHeaders,
      );
    }

    // ========================================================
    // 17. SHA-256 OBLIGATORIO
    // ========================================================

    const documentSha256 =
      String(
        invoice.document_sha256 ?? "",
      )
        .trim()
        .toLowerCase();

    if (
      !/^[0-9a-f]{64}$/.test(
        documentSha256,
      )
    ) {
      return jsonResponse(
        {
          error:
            "El documento de esta factura todavía no está validado. No se puede iniciar el pago.",
          code:
            "INVOICE_DOCUMENT_HASH_REQUIRED",
        },
        409,
        corsHeaders,
      );
    }

    // ========================================================
    // 18. COMPROBAR ACEPTACIÓN DEL DOCUMENTO
    // ========================================================
    //
    // Se comprueba server-side.
    //
    // Deben coincidir:
    //
    //   invoice_id
    //   user_id
    //   document_path
    //   document_sha256
    //   acknowledgement_text_version
    // ========================================================

    const {
      data: acknowledgement,
      error: acknowledgementError,
    } = await supabaseAdmin
      .from("invoice_document_acknowledgements")
      .select(
        `
          id,
          invoice_id,
          user_id,
          document_path,
          document_sha256,
          acknowledgement_text_version,
          accepted_at
        `,
      )
      .eq("invoice_id", invoice.id)
      .eq("user_id", user.id)
      .eq("document_path", documentPath)
      .eq("document_sha256", documentSha256)
      .eq(
        "acknowledgement_text_version",
        INVOICE_DOCUMENT_ACKNOWLEDGEMENT_VERSION,
      )
      .order("accepted_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (acknowledgementError) {
      console.error(
        "[create-checkout-session] Error comprobando aceptación:",
        acknowledgementError,
      );

      return jsonResponse(
        {
          error:
            "No se ha podido verificar la aceptación del documento de la factura.",
          code:
            acknowledgementError.code ??
            "ACKNOWLEDGEMENT_QUERY_ERROR",
        },
        500,
        corsHeaders,
      );
    }

    if (!acknowledgement) {
      return jsonResponse(
        {
          error:
            "Debes abrir y leer el documento PDF de la factura y aceptar la declaración correspondiente antes de realizar el pago.",
          code:
            "INVOICE_DOCUMENT_ACKNOWLEDGEMENT_REQUIRED",
        },
        409,
        corsHeaders,
      );
    }

    // ========================================================
    // 19. COMPROBACIÓN EXPLÍCITA DE INTEGRIDAD
    // ========================================================

    if (
      String(
        acknowledgement.document_sha256 ?? "",
      )
        .trim()
        .toLowerCase() !== documentSha256
    ) {
      console.error(
        "[create-checkout-session] Inconsistencia de hash:",
        {
          invoiceId: invoice.id,
          userId: user.id,
        },
      );

      return jsonResponse(
        {
          error:
            "La aceptación registrada no corresponde al documento actual de la factura.",
          code:
            "INVOICE_DOCUMENT_HASH_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    // ========================================================
    // 20. VALIDAR DESGLOSE FISCAL
    // ========================================================

    let taxBreakdown: ReturnType<
      typeof getValidatedTaxBreakdown
    >;

    try {
      taxBreakdown = getValidatedTaxBreakdown(
        invoice as Record<string, unknown>,
      );
    } catch (error) {
      console.error(
        "[create-checkout-session] Desglose fiscal inválido:",
        {
          invoiceId: invoice.id,
          error,
        },
      );

      return jsonResponse(
        {
          error: error instanceof Error
            ? error.message
            : "El desglose fiscal de la factura no es válido",
          code: "INVOICE_TAX_BREAKDOWN_INVALID",
        },
        400,
        corsHeaders,
      );
    }

    // ========================================================
    // 21. IMPORTE FINAL EN CÉNTIMOS
    // ========================================================

    const amountInCents = taxBreakdown.amountToPayCents;

    // ========================================================
    // 22. APP URL
    // ========================================================

    const rawAppUrl =
      Deno.env.get("APP_URL");

    if (!rawAppUrl) {
      return jsonResponse(
        {
          error:
            "Configuración de checkout no disponible.",
        },
        503,
        corsHeaders,
      );
    }

    const appUrl = rawAppUrl
      .trim()
      .replace(/\/+$/, "");

    if (!appUrl) {
      return jsonResponse(
        {
          error:
            "Configuración de checkout no disponible.",
        },
        503,
        corsHeaders,
      );
    }

    // ========================================================
    // 23. PREPARAR INFORMACIÓN PARA STRIPE
    // ========================================================

    const invoiceNumber =
      String(
        invoice.numero_factura ?? "",
      ).trim() ||
      invoice.id;

    const rawTitle = getInvoiceTitle(
      invoice.descripcion,
      invoiceNumber,
    );

    const rawDescription =
      formatInvoiceDescriptionForStripe(
        invoice.descripcion,
        invoiceNumber,
        invoice.fecha_vencimiento,
      );

    const stripeProductName =
      truncateForStripe(
        rawTitle,
        250,
      );

    const stripeDescription =
      truncateForStripe(
        rawDescription,
        500,
      );

    // ========================================================
    // 24. PREPARAR FACTURA FISCAL DE STRIPE
    // ========================================================
    let stripeInvoice: Stripe.Invoice;
    let stripeCustomerId: string;

    if (invoice.stripe_invoice_id) {
      stripeInvoice = await stripe.invoices.retrieve(
        String(invoice.stripe_invoice_id),
      );

      const customer = stripeInvoice.customer;
      stripeCustomerId = typeof customer === "string"
        ? customer
        : customer?.id ?? "";
    } else {
      const customer = await stripe.customers.create(
        {
          email: user.email || undefined,
          metadata: {
            invoice_id: invoice.id,
            user_id: invoice.user_id,
            company_id: invoice.company_id || "",
          },
        },
        {
          idempotencyKey: `modira-invoice-customer-${invoice.id}`,
        },
      );
      stripeCustomerId = customer.id;

      stripeInvoice = await stripe.invoices.create(
        {
          customer: stripeCustomerId,
          collection_method: "send_invoice",
          days_until_due: 30,
          auto_advance: false,
          description: stripeDescription,
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoiceNumber,
            company_id: invoice.company_id || "",
            user_id: invoice.user_id,
            source: "modira_invoice_checkout",
          },
        },
        {
          idempotencyKey: `modira-fiscal-invoice-${invoice.id}`,
        },
      );
    }

    if (!stripeCustomerId) {
      throw new Error(
        "La factura de Stripe no tiene un cliente asociado",
      );
    }

    const stripeInvoiceId = stripeInvoice.id;

    if (!stripeInvoiceId) {
      throw new Error(
        "Stripe no ha devuelto el identificador de la factura fiscal",
      );
    }

    if (
      stripeInvoice.metadata?.invoice_id !== invoice.id
    ) {
      throw new Error(
        "La factura de Stripe vinculada no corresponde a esta factura",
      );
    }

    if (
      stripeInvoice.status === "paid" ||
      stripeInvoice.status === "void" ||
      stripeInvoice.status === "uncollectible"
    ) {
      return jsonResponse(
        {
          error:
            "La factura fiscal de Stripe ya no admite nuevos pagos",
          code: "STRIPE_INVOICE_NOT_PAYABLE",
        },
        409,
        corsHeaders,
      );
    }

    if (stripeInvoice.status === "draft") {
      const {
        data: linkedInvoice,
        error: linkError,
      } = await supabaseAdmin
        .from("invoices")
        .update({
          stripe_invoice_id: stripeInvoiceId,
        })
        .eq("id", invoice.id)
        .is("stripe_invoice_id", null)
        .select("stripe_invoice_id")
        .maybeSingle();

      if (linkError) {
        throw new Error(
          `No se ha podido vincular la factura de Stripe: ${linkError.message}`,
        );
      }

      if (!linkedInvoice) {
        const {
          data: currentInvoice,
          error: currentInvoiceError,
        } = await supabaseAdmin
          .from("invoices")
          .select("stripe_invoice_id")
          .eq("id", invoice.id)
          .maybeSingle();

        if (currentInvoiceError) {
          throw new Error(
            `No se ha podido verificar la factura de Stripe vinculada: ${currentInvoiceError.message}`,
          );
        }

        if (
          currentInvoice?.stripe_invoice_id !== stripeInvoiceId
        ) {
          throw new Error(
            "La factura ya tiene vinculada otra factura de Stripe",
          );
        }
      }

      let taxRateId: string | undefined;

      if (
        invoice.iva_aplicado &&
        taxBreakdown.vatRatePercent > 0
      ) {
        const taxRate = await stripe.taxRates.create(
          {
            display_name: "IVA",
            percentage: taxBreakdown.vatRatePercent,
            inclusive: false,
            country: "ES",
            metadata: {
              invoice_id: invoice.id,
            },
          },
          {
            idempotencyKey: `modira-invoice-iva-${invoice.id}`,
          },
        );

        taxRateId = taxRate.id;
      }

      await stripe.invoiceItems.create(
        {
          customer: stripeCustomerId,
          invoice: stripeInvoiceId,
          amount: taxBreakdown.subtotalCents,
          currency: "eur",
          description: stripeProductName,
          ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
          metadata: {
            invoice_id: invoice.id,
            component: "base_imponible",
          },
        },
        {
          idempotencyKey: `modira-invoice-base-${invoice.id}`,
        },
      );

      if (taxBreakdown.withholdingCents > 0) {
        await stripe.invoiceItems.create(
          {
            customer: stripeCustomerId,
            invoice: stripeInvoiceId,
            amount: -taxBreakdown.withholdingCents,
            currency: "eur",
            description:
              `Retención IRPF (${Number(invoice.irpf_porcentaje)}% sobre la base imponible)`,
            metadata: {
              invoice_id: invoice.id,
              component: "retencion_irpf",
            },
          },
          {
            idempotencyKey: `modira-invoice-irpf-${invoice.id}`,
          },
        );
      }

      try {
        stripeInvoice = await stripe.invoices.finalizeInvoice(
          stripeInvoiceId,
          {},
          {
            idempotencyKey: `modira-finalize-invoice-${invoice.id}`,
          },
        );
      } catch (finalizeError) {
        const currentStripeInvoice =
          await stripe.invoices.retrieve(stripeInvoiceId);

        if (currentStripeInvoice.status !== "open") {
          throw finalizeError;
        }

        stripeInvoice = currentStripeInvoice;
      }
    }

    if (
      stripeInvoice.status !== "open" ||
      stripeInvoice.currency !== "eur" ||
      stripeInvoice.amount_due !== amountInCents
    ) {
      console.error(
        "[create-checkout-session] Factura fiscal de Stripe no coincide con Supabase:",
        {
          invoiceId: invoice.id,
          stripeInvoiceId: stripeInvoice.id,
          stripeStatus: stripeInvoice.status,
          stripeAmountDue: stripeInvoice.amount_due,
          expectedAmount: amountInCents,
        },
      );

      return jsonResponse(
        {
          error:
            "El total de la factura fiscal de Stripe no coincide con el importe a pagar.",
          code: "STRIPE_INVOICE_AMOUNT_MISMATCH",
        },
        409,
        corsHeaders,
      );
    }

    // ========================================================
    // 25. CREAR CHECKOUT SESSION POR EL NETO A PAGAR
    // ========================================================

    let session: Stripe.Checkout.Session;
    const { data: invoiceSessions } =
      await stripe.checkout.sessions.list({
        customer: stripeCustomerId,
        limit: 100,
      });
    const previousInvoiceSessions = invoiceSessions
      .filter((candidate) =>
        candidate.client_reference_id === invoice.id &&
        candidate.metadata?.invoice_id === invoice.id
      )
      .sort((left, right) => right.created - left.created);
    const openSession = previousInvoiceSessions.find(
      (candidate) => candidate.status === "open",
    );

    if (openSession) {
      if (openSession.amount_total !== amountInCents) {
        throw new Error(
          "La sesión de Checkout abierta no coincide con el importe de la factura",
        );
      }

      session = openSession;
    } else {
      const latestSession = previousInvoiceSessions[0];

      if (latestSession?.status === "complete") {
        if (latestSession.payment_status === "paid") {
          return jsonResponse(
            {
              error:
                "El pago de esta factura está completado y pendiente de sincronización.",
              code: "STRIPE_PAYMENT_CONFIRMATION_PENDING",
            },
            409,
            corsHeaders,
          );
        }

        const previousPaymentIntentId =
          typeof latestSession.payment_intent === "string"
            ? latestSession.payment_intent
            : latestSession.payment_intent?.id;

        if (!previousPaymentIntentId) {
          return jsonResponse(
            {
              error:
                "Hay un intento de pago de esta factura pendiente de confirmación.",
              code: "STRIPE_PAYMENT_CONFIRMATION_PENDING",
            },
            409,
            corsHeaders,
          );
        }

        const previousPaymentIntent =
          await stripe.paymentIntents.retrieve(
            previousPaymentIntentId,
          );

        if (
          previousPaymentIntent.status !== "requires_payment_method" &&
          previousPaymentIntent.status !== "canceled"
        ) {
          return jsonResponse(
            {
              error:
                "Hay un intento de pago de esta factura pendiente de confirmación.",
              code: "STRIPE_PAYMENT_CONFIRMATION_PENDING",
            },
            409,
            corsHeaders,
          );
        }
      }

      try {
        const checkoutParams: Stripe.Checkout.SessionCreateParams = {
          mode: "payment",
          customer: stripeCustomerId,
          client_reference_id: invoice.id,
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: stripeProductName,
                  description: stripeDescription,
                },
                unit_amount: amountInCents,
              },
              quantity: 1,
            },
          ],
          metadata: {
            invoice_id: invoice.id,
            stripe_invoice_id: stripeInvoiceId,
            company_id: invoice.company_id || "",
            user_id: invoice.user_id,
          },
          payment_intent_data: {
            metadata: {
              invoice_id: invoice.id,
              stripe_invoice_id: stripeInvoiceId,
              company_id: invoice.company_id || "",
              user_id: invoice.user_id,
            },
          },
          success_url:
            `${appUrl}/area-cliente/facturacion?payment=success&invoice_id=${invoice.id}`,
          cancel_url:
            `${appUrl}/area-cliente/facturacion?payment=cancelled&invoice_id=${invoice.id}`,
        };

        session = await stripe.checkout.sessions.create(
          checkoutParams,
          {
            idempotencyKey:
              `modira-checkout-${invoice.id}-${latestSession?.id ?? "initial"}`,
          },
        );
      } catch (stripeError) {
        console.error(
          "[create-checkout-session] ERROR DE STRIPE:",
          stripeError,
        );

        return jsonResponse(
          {
            error: stripeError instanceof Error
              ? stripeError.message
              : "Stripe ha rechazado la creación del Checkout",
            code: "STRIPE_CHECKOUT_CREATION_ERROR",
          },
          500,
          corsHeaders,
        );
      }
    }

    // ========================================================
    // 25. COMPROBAR URL
    // ========================================================

    if (!session.url) {
      console.error(
        "[create-checkout-session] Stripe no ha devuelto URL:",
        {
          sessionId: session.id,
          status: session.status,
        },
      );

      return jsonResponse(
        {
          error:
            "Stripe no ha devuelto una URL de Checkout",
          code:
            "STRIPE_CHECKOUT_URL_MISSING",
        },
        500,
        corsHeaders,
      );
    }

    console.log(
      "[create-checkout-session] Checkout creado correctamente:",
      {
        sessionId: session.id,
        invoiceId: invoice.id,
        amountInCents,
      },
    );

    // ========================================================
    // 26. RESPUESTA
    // ========================================================

    return jsonResponse(
      {
        success: true,
        checkout_url: session.url,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error(
      "[create-checkout-session] ERROR INTERNO:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno al crear el pago",
        code:
          "CREATE_CHECKOUT_SESSION_ERROR",
      },
      500,
      corsHeaders,
    );
  }
});
