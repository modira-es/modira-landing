import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2025-08-27.basil",
  }
);

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * ============================================================
 * PREPARAR DESCRIPCIÓN DE FACTURA PARA STRIPE
 * ============================================================
 *
 * La columna invoices.descripcion puede contener:
 *
 * Título: Desarrollo web
 *
 * Descripción detallada: Desarrollo de una landing page
 *
 * Servicios incluidos:
 * - Diseño web | Cantidad: 1 | Precio: 20.00 €
 *
 * Notas: Entrega en 5 días
 *
 * Para Stripe mostramos únicamente la información relevante
 * para el cliente, eliminando cantidad y precio individual
 * porque Stripe ya muestra el importe total de la factura.
 */
const formatInvoiceDescriptionForStripe = (
  description: string | null,
  invoiceNumber: string,
  dueDate: string | null
) => {
  if (!description || !description.trim()) {
    return dueDate
      ? `Pago de la factura ${invoiceNumber}\nVencimiento: ${new Date(
          dueDate
        ).toLocaleDateString("es-ES")}`
      : `Pago de la factura ${invoiceNumber}`;
  }

  const text = description.trim();

  const titleMatch = text.match(
    /Título:\s*(.*?)(?=\n\s*\n|Descripción detallada:|Servicios incluidos:|Notas:|$)/i
  );

  const detailMatch = text.match(
    /Descripción detallada:\s*(.*?)(?=\n\s*\n|Servicios incluidos:|Notas:|$)/i
  );

  const servicesMatch = text.match(
    /Servicios incluidos:\s*([\s\S]*?)(?=\n\s*\nNotas:|Notas:|$)/i
  );

  const notesMatch = text.match(
    /Notas:\s*([\s\S]*?)$/i
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
        /*
         * Convertimos:
         *
         * - Diseño web | Cantidad: 1 | Precio: 20.00 €
         *
         * en:
         *
         * • Diseño web
         *
         * El cliente no necesita ver el precio individual
         * porque Stripe ya muestra el importe total.
         */
        const serviceMatch = line.match(
          /^-\s*(.*?)\s*\|\s*Cantidad:\s*([^|]+)\s*\|\s*Precio:\s*(.+)$/i
        );

        if (serviceMatch) {
          const serviceName = serviceMatch[1].trim();

          return `• ${serviceName}`;
        }

        return line.replace(/^-\s*/, "• ");
      })
      .join("\n");

    if (formattedServices) {
      sections.push(
        `Servicios incluidos:\n${formattedServices}`
      );
    }
  }

  if (notes) {
    sections.push(`Notas: ${notes}`);
  }

  if (dueDate) {
    sections.push(
      `Vencimiento: ${new Date(
        dueDate
      ).toLocaleDateString("es-ES")}`
    );
  }

  /*
   * Si no hemos podido interpretar la estructura,
   * mostramos la descripción original para no perder
   * información del cliente.
   */
  if (sections.length === 0) {
    return dueDate
      ? `${text}\nVencimiento: ${new Date(
          dueDate
        ).toLocaleDateString("es-ES")}`
      : text;
  }

  return sections.join("\n\n");
};

Deno.serve(async (req) => {
  // ==========================================================
  // CORS
  // ==========================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Método no permitido",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    // ========================================================
    // 1. CLIENTE SUPABASE CON EL TOKEN DEL USUARIO
    // ========================================================

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "No autenticado",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // ========================================================
    // 2. USUARIO ACTUAL
    // ========================================================

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Sesión no válida",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ========================================================
    // 3. BODY
    // ========================================================

    const body = await req.json();

    const invoiceId =
      typeof body?.invoice_id === "string"
        ? body.invoice_id.trim()
        : "";

    if (!invoiceId) {
      return new Response(
        JSON.stringify({
          error: "invoice_id es obligatorio",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ========================================================
    // 4. OBTENER FACTURA
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
          importe_a_pagar,
          descripcion,
          fecha_vencimiento
        `
      )
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "Error obteniendo factura:",
        invoiceError
      );

      return new Response(
        JSON.stringify({
          error: "No se ha podido obtener la factura",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!invoice) {
      return new Response(
        JSON.stringify({
          error:
            "La factura no existe o no tienes acceso a ella",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ========================================================
    // 5. COMPROBAR ESTADO
    // ========================================================
    //
    // PAGADA:
    //   No se puede volver a pagar.
    //
    // PENDIENTE:
    //   Se puede pagar.
    //
    // VENCIDA:
    //   TAMBIÉN se puede pagar.
    //
    // CANCELADA:
    //   No se puede pagar.
    //
    // ========================================================

    const normalizedStatus = String(
      invoice.estado ?? ""
    )
      .trim()
      .toLowerCase();

    if (normalizedStatus === "pagada") {
      return new Response(
        JSON.stringify({
          error: "La factura ya está pagada",
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (normalizedStatus === "cancelada") {
      return new Response(
        JSON.stringify({
          error:
            "Esta factura está cancelada y no se puede pagar",
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ========================================================
    // 6. IMPORTE REAL
    // ========================================================
    //
    // invoices.importe_a_pagar está en EUROS.
    //
    // Stripe trabaja en céntimos.
    //
    // 1210.50 €
    //     ↓
    // 121050
    //
    // ========================================================

    const amountInEuros = Number(
      invoice.importe_a_pagar
    );

    if (
      !Number.isFinite(amountInEuros) ||
      amountInEuros <= 0
    ) {
      return new Response(
        JSON.stringify({
          error:
            "El importe de la factura no es válido",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const amountInCents = Math.round(
      amountInEuros * 100
    );

    // ========================================================
    // 7. URLS
    // ========================================================

    const appUrl =
      Deno.env.get("APP_URL") ||
      "http://localhost:5173";

    // ========================================================
    // 8. DESCRIPCIÓN PARA STRIPE
    // ========================================================

    const stripeDescription =
      formatInvoiceDescriptionForStripe(
        invoice.descripcion,
        invoice.numero_factura,
        invoice.fecha_vencimiento
      );

    // ========================================================
    // 9. CREAR CHECKOUT SESSION
    // ========================================================

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

       line_items: [
  {
    price_data: {
      currency: "eur",

      product_data: {
        name: (() => {
          const description = invoice.descripcion?.trim() || "";

          const titleMatch = description.match(
            /Título:\s*(.*?)(?=\n|Descripción detallada:|Servicios incluidos:|Notas:|$)/i
          );

          const title = titleMatch?.[1]?.trim();

          return title || `Factura ${invoice.numero_factura}`;
        })(),

        description: (() => {
          const description = invoice.descripcion?.trim() || "";

          const detailMatch = description.match(
            /Descripción detallada:\s*(.*?)(?=\n|Servicios incluidos:|Notas:|$)/i
          );

          const detail = detailMatch?.[1]?.trim();

          if (detail) {
            return detail;
          }

          return "Pago correspondiente a esta factura.";
        })(),
      },

      unit_amount: amountInCents,
    },

    quantity: 1,
  },
],

        metadata: {
          invoice_id: invoice.id,
          company_id: invoice.company_id || "",
          user_id: invoice.user_id,
        },

        payment_intent_data: {
          metadata: {
            invoice_id: invoice.id,
            company_id: invoice.company_id || "",
            user_id: invoice.user_id,
          },
        },

        success_url:
  `${appUrl}/area-cliente/facturacion?payment=success&invoice_id=${invoice.id}`,

cancel_url:
  `${appUrl}/area-cliente/facturacion?payment=cancelled&invoice_id=${invoice.id}`,

        customer_email:
          user.email || undefined,
      });

    // ========================================================
    // 10. RESPUESTA
    // ========================================================

    if (!session.url) {
      throw new Error(
        "Stripe no ha devuelto una URL de Checkout"
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "create-checkout-session error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Error interno al crear el pago",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});