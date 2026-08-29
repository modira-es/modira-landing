import { useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { AIChatBox, type Message } from "./AIChatBox";
import { supabase } from "@/lib/supabase";


// ============================================================
// UUID
// ============================================================

function isValidUuid(
  value: unknown
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}


// ============================================================
// SESSION ID
// ============================================================
//
// El mismo sessionId se utiliza durante toda la conversación.
//
// Esto es importante porque Supabase utiliza:
//
// session:<sessionId>
//
// como clave del rate limit.
// ============================================================

function getOrCreateSessionId(): string {
  const storageKey =
    "modira_ai_session_id";

  try {
    const existing =
      localStorage.getItem(storageKey);

    if (
      existing &&
      isValidUuid(existing)
    ) {
      return existing;
    }

    const newSessionId =
      crypto.randomUUID();

    localStorage.setItem(
      storageKey,
      newSessionId
    );

    return newSessionId;

  } catch {
    // Si localStorage no está disponible,
    // generamos un UUID para esta sesión.

    return crypto.randomUUID();
  }
}


// ============================================================
// TIPO DE RESPUESTA DE RATE LIMIT
// ============================================================

type RateLimitErrorResponse = {
  error?: string;
  retryAfterSeconds?: number;
  remaining?: number;
};


// ============================================================
// OBTENER RESPUESTA DE ERROR DE SUPABASE
// ============================================================
//
// supabase.functions.invoke() puede devolver el Response
// HTTP original dentro de error.context.
//
// No debemos depender exclusivamente de error.message,
// porque ahí normalmente NO viene el JSON que devuelve
// nuestra Edge Function.
// ============================================================

async function getFunctionErrorResponse(
  error: unknown
): Promise<{
  status: number | null;
  body: RateLimitErrorResponse | null;
}> {
  if (
    !error ||
    typeof error !== "object"
  ) {
    return {
      status: null,
      body: null,
    };
  }

  const possibleError =
    error as {
      context?: unknown;
      status?: number;
      message?: string;
    };


  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  let status:
    | number
    | null =
    typeof possibleError.status ===
      "number"
      ? possibleError.status
      : null;


  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  const context =
    possibleError.context;


  if (
    context instanceof Response
  ) {
    status =
      context.status;


    try {
      const body =
        await context
          .clone()
          .json();

      return {
        status,
        body:
          body &&
          typeof body === "object"
            ? body as RateLimitErrorResponse
            : null,
      };

    } catch {
      return {
        status,
        body: null,
      };
    }
  }


  // ----------------------------------------------------------
  // ALGUNAS VERSIONES / CONFIGURACIONES PUEDEN EXPONER
  // EL RESPONSE DE OTRA FORMA.
  // ----------------------------------------------------------

  if (
    context &&
    typeof context === "object"
  ) {
    const responseLike =
      context as {
        status?: number;
        json?: () => Promise<unknown>;
      };


    if (
      typeof responseLike.status ===
      "number"
    ) {
      status =
        responseLike.status;
    }


    if (
      typeof responseLike.json ===
      "function"
    ) {
      try {
        const body =
          await responseLike.json();

        return {
          status,
          body:
            body &&
            typeof body === "object"
              ? body as RateLimitErrorResponse
              : null,
        };

      } catch {
        // Continuamos con fallback.
      }
    }
  }


  return {
    status,
    body: null,
  };
}


// ============================================================
// FORMATEAR RETRY AFTER
// ============================================================

function formatRetryAfter(
  seconds: number
): string {
  const safeSeconds =
    Math.max(
      0,
      Math.ceil(seconds)
    );


  if (
    safeSeconds < 60
  ) {
    return `menos de un minuto`;
  }


  const minutes =
    Math.ceil(
      safeSeconds / 60
    );


  if (
    minutes < 60
  ) {
    return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  }


  const hours =
    Math.ceil(
      minutes / 60
    );


  return `${hours} hora${hours === 1 ? "" : "s"}`;
}


// ============================================================
// COMPONENTE
// ============================================================

export function AIChatBot() {
  const [isOpen, setIsOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [showAIHint, setShowAIHint] =
    useState(true);


  // ----------------------------------------------------------
  // SESSION ID
  // ----------------------------------------------------------
  //
  // Se crea solamente una vez por montaje.
  // ----------------------------------------------------------

  const [sessionId] =
    useState<string>(
      () => getOrCreateSessionId()
    );


  // ----------------------------------------------------------
  // MENSAJES
  // ----------------------------------------------------------

  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: "assistant",

        content:
          "¡Hola! 👋 Soy Modira AI.\n\n" +
          "Estoy aquí para ayudarte a descubrir qué procesos de tu empresa puedes automatizar y cómo Modira puede ayudarte a ahorrar tiempo y reducir tareas manuales.\n\n" +
          "Puedes preguntarme sobre:\n\n" +
          "• Automatización de procesos\n\n" +
          "• Integraciones y herramientas\n\n" +
          "• Ahorro de tiempo y costes\n\n" +
          "• Cómo funciona Modira\n\n" +
          "• Soluciones para tu empresa\n\n" +
          "¡Y mucho más!\n\n" +
          "¿En qué puedo ayudarte?",
      },
    ]);


  // ============================================================
  // ENVIAR MENSAJE
  // ============================================================

  const handleSendMessage = async (
    content: string
  ) => {

    // ----------------------------------------------------------
    // EVITAR PETICIONES SIMULTÁNEAS
    // ----------------------------------------------------------

    if (isLoading) {
      return;
    }


    // ----------------------------------------------------------
    // LIMPIAR CONTENIDO
    // ----------------------------------------------------------

    const trimmedContent =
      content.trim();


    if (!trimmedContent) {
      return;
    }


    // ----------------------------------------------------------
    // MENSAJE DEL USUARIO
    // ----------------------------------------------------------

    const userMessage: Message = {
      role: "user",
      content: trimmedContent,
    };


    // ----------------------------------------------------------
    // HISTORIAL QUE SE ENVÍA
    // ----------------------------------------------------------

    const updatedMessages =
      [
        ...messages,
        userMessage,
      ];


    // ----------------------------------------------------------
    // ACTUALIZAR UI
    // ----------------------------------------------------------

    setMessages(
      updatedMessages
    );

    setIsLoading(true);


    try {

      // ======================================================
      // LLAMAR A EDGE FUNCTION
      // ======================================================

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "modira-ai",
          {
            body: {
              messages:
                updatedMessages.filter(
                  (message) =>
                    message.role !==
                    "system"
                ),

              sessionId,
            },
          }
        );


      // ======================================================
      // ERROR DE EDGE FUNCTION
      // ======================================================

      if (error) {

        console.error(
          "MODIRA AI: Edge Function error.",
          error
        );


        // ----------------------------------------------------
        // RECUPERAR STATUS + BODY
        // ----------------------------------------------------

        const {
          status,
          body,
        } =
          await getFunctionErrorResponse(
            error
          );


        // ----------------------------------------------------
        // RATE LIMIT 429
        // ----------------------------------------------------

        if (
          status === 429 ||
          typeof body?.retryAfterSeconds ===
            "number"
        ) {

          const retryAfter =
            Number(
              body?.retryAfterSeconds
            );


          if (
            Number.isFinite(
              retryAfter
            ) &&
            retryAfter > 0
          ) {

            const retryText =
              formatRetryAfter(
                retryAfter
              );


            setMessages(
              (previous) => [
                ...previous,

                {
                  role: "assistant",

                  content:
                    `Has alcanzado temporalmente el límite de mensajes de Modira AI.\n\nPuedes volver a utilizarlo en aproximadamente ${retryText}.`,
                },
              ]
            );

            return;
          }


          // Si sabemos que es 429 pero no
          // tenemos retryAfterSeconds.

          setMessages(
            (previous) => [
              ...previous,

              {
                role: "assistant",

                content:
                  "Has alcanzado temporalmente el límite de mensajes de Modira AI. Inténtalo de nuevo más tarde.",
              },
            ]
          );

          return;
        }


        // ----------------------------------------------------
        // OTROS ERRORES DEVUELTOS POR LA EDGE FUNCTION
        // ----------------------------------------------------

        if (
          body?.error &&
          typeof body.error ===
            "string"
        ) {

          setMessages(
            (previous) => [
              ...previous,

              {
                role: "assistant",

                content:
                  body.error!,
              },
            ]
          );

          return;
        }


        // ----------------------------------------------------
        // ERROR DESCONOCIDO
        // ----------------------------------------------------

        throw error;
      }


      // ======================================================
      // VALIDAR RESPUESTA
      // ======================================================

      if (
        !data ||
        typeof data.response !==
          "string" ||
        !data.response.trim()
      ) {
        throw new Error(
          "La IA no devolvió ninguna respuesta."
        );
      }


      // ======================================================
      // RESPUESTA DEL ASISTENTE
      // ======================================================

      const assistantMessage:
        Message = {
          role: "assistant",

          content:
            data.response.trim(),
        };


      // ======================================================
      // ACTUALIZAR CHAT
      // ======================================================

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

    } catch (error) {

      // ======================================================
      // ERROR GENERAL
      // ======================================================

      console.error(
        "Error en Modira AI:",
        error
      );


      setMessages(
        (previous) => [
          ...previous,

          {
            role: "assistant",

            content:
              "Lo siento, ha ocurrido un error al procesar tu mensaje. Inténtalo de nuevo.",
          },
        ]
      );

    } finally {

      // ======================================================
      // FINALIZAR CARGA
      // ======================================================

      setIsLoading(false);
    }
  };


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* =====================================================
          CHAT ABIERTO
          ===================================================== */}

      {isOpen && (
        <div
          className="
            fixed
            bottom-24
            right-6
            z-50
            w-[380px]
            max-w-[calc(100vw-32px)]
          "
        >

          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-background
              shadow-2xl
            "
          >

            {/* =================================================
                HEADER
                ================================================= */}

            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-border
                bg-background
                px-4
                py-3
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    size-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary/10
                  "
                >
                  <Sparkles
                    className="
                      size-5
                      text-primary
                    "
                  />
                </div>


                <div>

                  <p
                    className="
                      text-sm
                      font-semibold
                    "
                  >
                    Modira AI
                  </p>

                  <p
                    className="
                      text-xs
                      text-muted-foreground
                    "
                  >
                    Asistente inteligente
                  </p>

                </div>

              </div>


              {/* =================================================
                  CERRAR
                  ================================================= */}

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                className="
                  flex
                  size-8
                  items-center
                  justify-center
                  rounded-lg
                  text-muted-foreground
                  transition-colors
                  hover:bg-muted
                  hover:text-foreground
                "
                aria-label="Cerrar chat"
              >
                <X className="size-4" />
              </button>

            </div>


            {/* =================================================
                CHAT
                ================================================= */}

            <AIChatBox
              messages={messages}
              onSendMessage={
                handleSendMessage
              }
              isLoading={isLoading}
              height="480px"
              placeholder="Escribe tu pregunta..."
              emptyStateMessage="¿En qué puedo ayudarte?"
              suggestedPrompts={[
                "¿Qué es Modira?",
                "¿Qué puedo automatizar?",
                "¿Cómo funciona Modira?",
              ]}
              className="
                rounded-none
                border-0
                shadow-none
              "
            />

          </div>
        </div>
      )}


      {/* =====================================================
          AVISO IA
          ===================================================== */}

      {showAIHint && !isOpen && (
        <div
          className="
            fixed
            bottom-[82px]
            right-6
            z-50
            flex
            items-center
            gap-2
            rounded-full
            border
            border-border
            bg-background
            px-3
            py-1.5
            text-xs
            text-muted-foreground
            shadow-sm
          "
        >

          <span>
            Hola, soy la IA de Modira 👋
          </span>


          <button
            type="button"
            onClick={() =>
              setShowAIHint(false)
            }
            className="
              flex
              size-4
              items-center
              justify-center
              rounded-full
              text-muted-foreground
              transition-colors
              hover:bg-muted
              hover:text-foreground
            "
            aria-label="Cerrar mensaje"
          >
            <X className="size-3" />
          </button>

        </div>
      )}


      {/* =====================================================
          BOTÓN FLOTANTE
          ===================================================== */}

      <button
        type="button"
        onClick={() => {

          setIsOpen(
            (previous) => {

              const next =
                !previous;


              if (next) {
                setShowAIHint(false);
              }


              return next;
            }
          );

        }}
        className="
          fixed
          bottom-6
          right-6
          z-50
          flex
          size-14
          items-center
          justify-center
          rounded-full
          bg-primary
          text-primary-foreground
          shadow-xl
          transition-all
          duration-200
          hover:scale-105
          hover:shadow-2xl
          active:scale-95
        "
        aria-label={
          isOpen
            ? "Cerrar asistente de Modira"
            : "Abrir asistente de Modira"
        }
        title="Modira AI"
      >

        {isOpen ? (
          <X className="size-6" />
        ) : (
          <Bot className="size-6" />
        )}

      </button>
    </>
  );
}