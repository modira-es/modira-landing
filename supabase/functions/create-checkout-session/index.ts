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
  "SUPABASE_SERVICE_ROLE_KEY"
);

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL no está configurada");
}

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY no está configurada");
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no está configurada"
  );
}

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// PREPARAR DESCRIPCIÓN DE FACTURA PARA STRIPE
// ============================================================

const formatInvoiceDescriptionForStripe = (
  description: string | null,
  invoiceNumber: string,
  dueDate: string | null
): string => {
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
         * Convierte:
         *
         * - Diseño web | Cantidad: 1 | Precio: 20.00 €
         *
         * en:
         *
         * • Diseño web
         *
         * Stripe ya muestra el importe total,
         * por lo que no mostramos el precio individual.
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
   * conservamos la descripción original.
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

// ============================================================
// OBTENER TÍTULO DE FACTURA
// ============================================================

const getInvoiceTitle = (
  description: string | null,
  invoiceNumber: string
): string => {
  const text = description?.trim() || "";

  const titleMatch = text.match(
    /Título:\s*(.*?)(?=\n|Descripción detallada:|Servicios incluidos:|Notas:|$)/i
  );

  const title = titleMatch?.[1]?.trim();

  return title || `Factura ${invoiceNumber}`;
};

// ============================================================
// OBTENER DESCRIPCIÓN CORTA DE FACTURA
// ============================================================

const getInvoiceDetail = (
  description: string | null
): string => {
  const text = description?.trim() || "";

  const detailMatch = text.match(
    /Descripción detallada:\s*(.*?)(?=\n|Servicios incluidos:|Notas:|$)/i
  );

  const detail = detailMatch?.[1]?.trim();

  return (
    detail ||
    "Pago correspondiente a esta factura."
  );
};

// ============================================================
// EDGE FUNCTION
// ============================================================

Deno.serve(async (req) => {
  // ==========================================================
  // 1. CORS
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
    // 2. AUTHORIZATION
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

    // ========================================================
    // 3. CLIENTE SUPABASE CON TOKEN DEL USUARIO
    // ========================================================
    //
    // Este cliente respeta las RLS.
    //
    // Se utiliza para:
    //
    // - comprobar la sesión
    // - comprobar ownership de la factura
    //
    // ========================================================

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
    // 4. CLIENTE SERVICE ROLE
    // ========================================================
    //
    // SOLO SERVER-SIDE.
    //
    // NO se envía al navegador.
    //
    // Se utiliza únicamente para consultar el estado real
    // del perfil porque un usuario bloqueado puede tener una
    // RLS que le impida leer su propio perfil.
    //
    // ========================================================

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ========================================================
    // 5. USUARIO ACTUAL
    // ========================================================

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Error verificando usuario:",
        userError
      );

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
    // 6. COMPROBAR ESTADO DEL PERFIL
    // ========================================================
    //
    // SEGURIDAD H-05
    //
    // IMPORTANTE:
    //
    // NO usamos aquí el cliente normal "supabase".
    //
    // Usamos "supabaseAdmin" porque un usuario bloqueado puede
    // recibir 403 de RLS al intentar leer profiles.
    //
    // La decisión de bloqueo se toma en backend.
    //
    // ========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Error obteniendo estado del perfil:",
        profileError
      );

      return new Response(
        JSON.stringify({
          error:
            "No se ha podido verificar el estado de la cuenta",
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

    // ========================================================
    // 7. FAIL-CLOSED SI NO EXISTE PERFIL
    // ========================================================

    if (!profile) {
      console.error(
        "No existe perfil para el usuario:",
        user.id
      );

      return new Response(
        JSON.stringify({
          error:
            "No se ha podido verificar la cuenta",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ========================================================
    // 8. BLOQUEO DE CUENTA
    // ========================================================

    const profileStatus = String(
      profile.status ?? ""
    )
      .trim()
      .toLowerCase();

    if (profileStatus === "blocked") {
      console.warn(
        "Intento de pago de usuario bloqueado:",
        user.id
      );

      return new Response(
        JSON.stringify({
          error:
            "Tu cuenta está bloqueada y no puede realizar pagos",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ========================================================
    // 9. BODY
    // ========================================================

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "El cuerpo de la petición no es JSON válido",
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
    // 10. INVOICE ID
    // ========================================================

    const invoiceId =
      typeof (body as Record<string, unknown>)?.invoice_id ===
      "string"
        ? String(
            (body as Record<string, unknown>).invoice_id
          ).trim()
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
    // 11. OBTENER FACTURA
    // ========================================================
    //
    // IMPORTANTE:
    //
    // Seguimos utilizando el cliente normal del usuario.
    //
    // La consulta exige:
    //
    //     invoice.id = invoiceId
    //
    // Y:
    //
    //     invoice.user_id = user.id
    //
    // Por tanto, el cliente NO puede solicitar una factura
    // perteneciente a otro usuario.
    //
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

    // ========================================================
    // 12. FACTURA NO EXISTE / NO PERTENECE AL USUARIO
    // ========================================================

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
    // 13. ESTADO DE LA FACTURA
    // ========================================================
    //
    // PAGADA:
    //   No se puede volver a pagar.
    //
    // PENDIENTE:
    //   Se puede pagar.
    //
    // VENCIDA:
    //   También se puede pagar.
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
    // 14. IMPORTE REAL
    // ========================================================
    //
    // El importe NO viene del frontend.
    //
    // Se obtiene directamente de:
    //
    //     invoices.importe_a_pagar
    //
    // Esto coincide con el diseño fiscal de MODIRA:
    //
    // importe_a_pagar = monto - irpf_importe
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

    // ========================================================
    // 15. EUROS → CÉNTIMOS
    // ========================================================

    const amountInCents = Math.round(
      amountInEuros * 100
    );

    if (amountInCents <= 0) {
      return new Response(
        JSON.stringify({
          error:
            "El importe calculado para Stripe no es válido",
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
// 16. APP URL
// ========================================================

const appUrl = Deno.env.get("APP_URL");

if (!appUrl) {
  console.error(
    "APP_URL no está configurada."
  );

  return new Response(
    JSON.stringify({
      error:
        "Configuración de checkout no disponible.",
    }),
    {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

    // ========================================================
    // 17. DESCRIPCIÓN PARA STRIPE
    // ========================================================

    const stripeDescription =
      formatInvoiceDescriptionForStripe(
        invoice.descripcion,
        invoice.numero_factura,
        invoice.fecha_vencimiento
      );

    // ========================================================
    // 18. CREAR CHECKOUT SESSION
    // ========================================================

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        line_items: [
          {
            price_data: {
              currency: "eur",

              product_data: {
                name: getInvoiceTitle(
                  invoice.descripcion,
                  invoice.numero_factura
                ),

                description: getInvoiceDetail(
                  invoice.descripcion
                ),
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
    // 19. COMPROBAR URL
    // ========================================================

    if (!session.url) {
      throw new Error(
        "Stripe no ha devuelto una URL de Checkout"
      );
    }

    // ========================================================
    // 20. RESPUESTA
    // ========================================================

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