const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // =====================================================
  // CORS
  // =====================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    console.log("MODIRA AI: petición recibida");

    // =====================================================
    // RECIBIR DATOS DEL CHATBOT
    // =====================================================

    const { messages, sessionId } = await req.json();

    console.log(
      "MODIRA AI: sessionId:",
      sessionId
    );

    console.log(
      "MODIRA AI: mensajes recibidos:",
      messages
    );

    if (!sessionId) {
      throw new Error("sessionId no proporcionado");
    }

    if (!Array.isArray(messages)) {
      throw new Error("messages no es un array");
    }

    // =====================================================
    // API KEY DE OPENAI
    // =====================================================

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error(
        "OPENAI_API_KEY no está configurada"
      );
    }

    // =====================================================
    // SUPABASE
    // =====================================================

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    const supabaseServiceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (!supabaseUrl) {
      throw new Error(
        "SUPABASE_URL no está configurada"
      );
    }

    if (!supabaseServiceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY no está configurada"
      );
    }

    const supabaseHeaders = {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
    };

    // =====================================================
    // 1. BUSCAR CONVERSACIÓN EXISTENTE
    // =====================================================

    console.log(
      "MODIRA AI: buscando conversación"
    );

    const conversationSearchResponse = await fetch(
      `${supabaseUrl}/rest/v1/ai_conversations?session_id=eq.${encodeURIComponent(
        sessionId
      )}&select=*`,
      {
        method: "GET",
        headers: supabaseHeaders,
      }
    );

    if (!conversationSearchResponse.ok) {
      const errorText =
        await conversationSearchResponse.text();

      console.error(
        "Error buscando conversación:",
        errorText
      );

      throw new Error(
        "No se pudo buscar la conversación"
      );
    }

    const conversations =
      await conversationSearchResponse.json();

    let conversationId: string;

    // =====================================================
    // 2. CREAR CONVERSACIÓN SI NO EXISTE
    // =====================================================

    if (
      !Array.isArray(conversations) ||
      conversations.length === 0
    ) {
      console.log(
        "MODIRA AI: creando nueva conversación"
      );

      const createConversationResponse =
        await fetch(
          `${supabaseUrl}/rest/v1/ai_conversations`,
          {
            method: "POST",

            headers: {
              ...supabaseHeaders,
              Prefer: "return=representation",
            },

            body: JSON.stringify({
              session_id: sessionId,
            }),
          }
        );

      if (!createConversationResponse.ok) {
        const errorText =
          await createConversationResponse.text();

        console.error(
          "Error creando conversación:",
          errorText
        );

        throw new Error(
          "No se pudo crear la conversación"
        );
      }

      const createdConversation =
        await createConversationResponse.json();

      if (
        !Array.isArray(createdConversation) ||
        !createdConversation[0]?.id
      ) {
        throw new Error(
          "Supabase no devolvió el ID de la conversación"
        );
      }

      conversationId =
        createdConversation[0].id;

      console.log(
        "MODIRA AI: conversación creada:",
        conversationId
      );
    } else {
      conversationId =
        conversations[0].id;

      console.log(
        "MODIRA AI: conversación existente:",
        conversationId
      );
    }

    // =====================================================
    // 3. OBTENER ÚLTIMO MENSAJE DEL USUARIO
    // =====================================================

    const userMessages = messages.filter(
      (message: {
        role: string;
        content: string;
      }) =>
        message.role === "user"
    );

    const latestUserMessage =
      userMessages[userMessages.length - 1];

    if (!latestUserMessage) {
      throw new Error(
        "No se ha recibido ningún mensaje del usuario"
      );
    }

    // =====================================================
    // 4. GUARDAR MENSAJE DEL USUARIO
    // =====================================================

    console.log(
      "MODIRA AI: guardando mensaje del usuario"
    );

    const saveUserMessageResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/ai_messages`,
        {
          method: "POST",

          headers: supabaseHeaders,

          body: JSON.stringify({
            conversation_id: conversationId,
            role: "user",
            content:
              latestUserMessage.content,
          }),
        }
      );

    if (!saveUserMessageResponse.ok) {
      const errorText =
        await saveUserMessageResponse.text();

      console.error(
        "Error guardando mensaje usuario:",
        errorText
      );

      throw new Error(
        "No se pudo guardar el mensaje del usuario"
      );
    }

    // =====================================================
    // 5. PREPARAR HISTORIAL PARA OPENAI
    // =====================================================

    const openAIMessages =
      messages
        .filter(
          (message: {
            role: string;
            content: string;
          }) =>
            message.role === "user" ||
            message.role === "assistant"
        )
        .map(
          (message: {
            role: "user" | "assistant";
            content: string;
          }) => ({
            role: message.role,
            content: message.content,
          })
        );

    // =====================================================
    // 6. LLAMADA PRINCIPAL A OPENAI
    // =====================================================

    console.log(
      "MODIRA AI: llamando a OpenAI"
    );

    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        signal: controller.signal,

        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${openaiApiKey}`,
        },

        body: JSON.stringify({
          model: "gpt-5.4-mini",

          instructions: `
Eres Modira AI, el asistente virtual oficial de Modira.

Tu función es ayudar a los visitantes a entender:

- Qué es Modira
- Qué problemas resuelve
- Qué procesos se pueden automatizar
- Cómo funcionan las automatizaciones
- Qué herramientas e integraciones puede utilizar
- Cómo puede ayudar Modira a una empresa
- Cómo empezar a utilizar Modira

REGLAS:

1. Responde siempre en español salvo que el usuario escriba en otro idioma.
2. Sé profesional, claro y breve.
3. No inventes funcionalidades que no conozcas.
4. No afirmes que Modira tiene una integración concreta si no está confirmada.
5. Si la pregunta no tiene relación con Modira, explica brevemente que estás especializado en Modira.
6. No menciones que eres una IA de OpenAI.
7. Habla siempre como el asistente oficial de Modira.
8. Cuando sea útil, utiliza listas.
9. Evita respuestas excesivamente largas.

INFORMACIÓN SOBRE MODIRA:

Modira es una plataforma de automatización inteligente para empresas.

Su objetivo es ayudar a las empresas a reducir tareas manuales, conectar procesos y mejorar la eficiencia mediante automatizaciones.

Entre los procesos que puede gestionar se encuentran:

- Gestión de clientes
- Proyectos
- Facturación
- Documentos
- Notificaciones
- Tareas internas
- Flujos de trabajo
- Procesos empresariales repetitivos

Cuando un usuario pregunte qué puede automatizar, proporciona ejemplos concretos y fáciles de entender.

Cuando el usuario pregunte cómo funciona, explica que una automatización puede conectar diferentes acciones y hacer que una acción desencadene automáticamente otra.
`,

          input: openAIMessages,
        }),
      }
    );

    clearTimeout(timeout);

    // =====================================================
    // 7. COMPROBAR RESPUESTA DE OPENAI
    // =====================================================

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Error OpenAI:",
        errorText
      );

      throw new Error(
        `OpenAI respondió con ${response.status}`
      );
    }

    const data =
      await response.json();

    console.log(
      "MODIRA AI: respuesta OpenAI:",
      JSON.stringify(data)
    );

    // =====================================================
    // OBTENER TEXTO DE LA RESPUESTA
    // =====================================================

    const assistantResponse =
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      "No he podido obtener una respuesta de Modira AI.";

    console.log(
      "MODIRA AI: respuesta final:",
      assistantResponse
    );

    // =====================================================
    // 8. GUARDAR RESPUESTA DE MODIRA
    // =====================================================

    console.log(
      "MODIRA AI: guardando respuesta del asistente"
    );

    const saveAssistantMessageResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/ai_messages`,
        {
          method: "POST",

          headers: supabaseHeaders,

          body: JSON.stringify({
            conversation_id: conversationId,
            role: "assistant",
            content: assistantResponse,
          }),
        }
      );

    if (!saveAssistantMessageResponse.ok) {
      const errorText =
        await saveAssistantMessageResponse.text();

      console.error(
        "Error guardando respuesta asistente:",
        errorText
      );

      throw new Error(
        "No se pudo guardar la respuesta del asistente"
      );
    }

    // =====================================================
    // 9. EXTRAER INFORMACIÓN DE LA EMPRESA
    // =====================================================

    console.log(
      "MODIRA AI: analizando información de empresa"
    );

    const extractionController =
      new AbortController();

    const extractionTimeout =
      setTimeout(() => {
        extractionController.abort();
      }, 30000);

    const extractionResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          signal: extractionController.signal,

          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${openaiApiKey}`,
          },

          body: JSON.stringify({
            model: "gpt-5.4-mini",

            instructions: `
Analiza la conversación proporcionada y extrae únicamente información sobre la empresa del visitante.

Debes devolver ÚNICAMENTE un JSON válido con esta estructura:

{
  "company_name": string | null,
  "business_type": string | null
}

REGLAS IMPORTANTES:

1. NO inventes información.

2. company_name debe contener el nombre de la empresa únicamente cuando el visitante lo haya proporcionado explícita o claramente.

3. Estas frases pueden indicar el nombre de la empresa si el contexto es suficientemente claro:

- "Mi empresa se llama X"
- "La empresa se llama X"
- "Trabajo en X"
- "Soy de X"
- "Represento a X"
- "Tenemos una empresa llamada X"
- "Mi empresa es X"

4. NO consideres "mi empresa", "la empresa" o expresiones genéricas como nombres de empresa.

5. business_type debe contener el sector o tipo de negocio únicamente cuando el visitante lo haya indicado o exista evidencia clara.

6. Si el visitante dice "somos una fontanería", business_type puede ser "Fontanería".

7. Si el visitante dice "tenemos un restaurante", business_type puede ser "Restaurante".

8. Si no existe información suficiente, utiliza null.

9. No extraigas nombres de personas como nombres de empresa salvo que el contexto indique claramente que se trata de una empresa.

10. No utilices información de las instrucciones de Modira para completar los datos.

11. Solo utiliza información proporcionada por el visitante en la conversación.

12. Devuelve exclusivamente JSON válido.

13. No añadas explicaciones, markdown ni texto adicional.

EJEMPLO:

Si el visitante dice:

"Mi empresa se llama Fontanería Pérez y somos una empresa de fontanería."

Devuelve:

{
  "company_name": "Fontanería Pérez",
  "business_type": "Fontanería"
}

Si el visitante dice:

"Soy una empresa de fontanería."

Devuelve:

{
  "company_name": null,
  "business_type": "Fontanería"
}
`,

            input: openAIMessages,
          }),
        }
      );

    clearTimeout(extractionTimeout);

    // =====================================================
    // 10. PROCESAR EXTRACCIÓN
    // =====================================================

    let companyName: string | null = null;
    let businessType: string | null = null;

    if (extractionResponse.ok) {
      const extractionData =
        await extractionResponse.json();

      const extractionText =
        extractionData.output_text ??
        extractionData.output?.[0]?.content?.[0]?.text ??
        null;

      console.log(
        "MODIRA AI: extracción recibida:",
        extractionText
      );

      if (extractionText) {
        try {
          const cleanedText =
            extractionText
              .replace(/^```json/i, "")
              .replace(/^```/i, "")
              .replace(/```$/i, "")
              .trim();

          const extracted =
            JSON.parse(cleanedText);

          if (
            typeof extracted.company_name ===
              "string" &&
            extracted.company_name.trim().length > 0
          ) {
            companyName =
              extracted.company_name.trim();
          }

          if (
            typeof extracted.business_type ===
              "string" &&
            extracted.business_type.trim().length > 0
          ) {
            businessType =
              extracted.business_type.trim();
          }
        } catch (parseError) {
          console.error(
            "MODIRA AI: no se pudo interpretar la extracción:",
            parseError
          );
        }
      }
    } else {
      const errorText =
        await extractionResponse.text();

      console.error(
        "Error en extracción de empresa:",
        errorText
      );
    }

    // =====================================================
    // 11. OBTENER DATOS ACTUALES DE LA CONVERSACIÓN
    // =====================================================

    console.log(
      "MODIRA AI: obteniendo datos actuales de empresa"
    );

    const currentConversationResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/ai_conversations?id=eq.${encodeURIComponent(
          conversationId
        )}&select=company_name,business_type`,
        {
          method: "GET",
          headers: supabaseHeaders,
        }
      );

    let currentCompanyName: string | null = null;
    let currentBusinessType: string | null = null;

    if (!currentConversationResponse.ok) {
      const errorText =
        await currentConversationResponse.text();

      console.error(
        "Error obteniendo datos actuales:",
        errorText
      );
    } else {
      const currentConversation =
        await currentConversationResponse.json();

      const currentData =
        currentConversation?.[0];

      currentCompanyName =
        currentData?.company_name ?? null;

      currentBusinessType =
        currentData?.business_type ?? null;
    }

    // =====================================================
    // 12. INFORMACIÓN ACUMULATIVA
    // =====================================================

    const finalCompanyName =
      companyName ??
      currentCompanyName ??
      null;

    const finalBusinessType =
      businessType ??
      currentBusinessType ??
      null;

    console.log(
      "MODIRA AI: datos finales empresa:",
      {
        company_name: finalCompanyName,
        business_type: finalBusinessType,
      }
    );

    // =====================================================
    // 13. ACTUALIZAR CONVERSACIÓN
    // =====================================================

    const updateData: Record<string, string> = {};

    if (finalCompanyName) {
      updateData.company_name =
        finalCompanyName;
    }

    if (finalBusinessType) {
      updateData.business_type =
        finalBusinessType;
    }

    if (
      Object.keys(updateData).length > 0
    ) {
      console.log(
        "MODIRA AI: actualizando conversación:",
        updateData
      );

      const updateConversationResponse =
        await fetch(
          `${supabaseUrl}/rest/v1/ai_conversations?id=eq.${encodeURIComponent(
            conversationId
          )}`,
          {
            method: "PATCH",

            headers: {
              ...supabaseHeaders,
              Prefer: "return=minimal",
            },

            body: JSON.stringify(
              updateData
            ),
          }
        );

      if (
        !updateConversationResponse.ok
      ) {
        const errorText =
          await updateConversationResponse.text();

        console.error(
          "Error actualizando conversación:",
          errorText
        );
      } else {
        console.log(
          "MODIRA AI: conversación actualizada correctamente"
        );
      }
    } else {
      console.log(
        "MODIRA AI: no se encontró información nueva de empresa"
      );
    }

    // =====================================================
    // 14. DEVOLVER RESPUESTA AL CHATBOT
    // =====================================================

    return new Response(
      JSON.stringify({
        response: assistantResponse,
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
    // =====================================================
    // MANEJO DE ERRORES
    // =====================================================

    console.error(
      "Error en Modira AI:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          "Error al procesar la solicitud con Modira AI.",
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