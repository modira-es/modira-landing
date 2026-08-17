import { useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { AIChatBox, type Message } from "./AIChatBox";
import { supabase } from "@/lib/supabase";

type AIChatBotProps = {
  /**
   * Función opcional para conectar el chatbot
   * con tu backend / IA real.
   *
   * Si no se proporciona, se utiliza una respuesta
   * local de demostración.
   */
  onAIResponse?: (
    messages: Message[]
  ) => Promise<string> | string;
};

export function AIChatBot({ onAIResponse }: AIChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "Eres Modira AI, el asistente virtual de Modira. Ayudas a los usuarios a entender qué es Modira, qué procesos pueden automatizar y cómo funciona la plataforma. Responde de forma clara, profesional y breve.",
    },
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

  const handleSendMessage = async (content: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      role: "user",
      content,
    };

    const sessionId =
  localStorage.getItem("modira_ai_session_id") ||
  crypto.randomUUID();

localStorage.setItem(
  "modira_ai_session_id",
  sessionId
);

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      let response: string;

      /*
       * =====================================================
       * CONEXIÓN CON LA IA REAL
       * =====================================================
       *
       * Si proporcionas onAIResponse desde la landing,
       * se utilizará esa función.
       *
       * Si no existe, usamos una respuesta local de prueba.
       */

      if (onAIResponse) {
  response = await onAIResponse(updatedMessages);
} else {
  const { data, error } = await supabase.functions.invoke(
    "modira-ai",
    {
     body: {
  messages: updatedMessages,
  sessionId,
},
    }
  );

  if (error) {
    throw error;
  }

  response = data.response;
}

      const assistantMessage: Message = {
        role: "assistant",
        content: response,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Error en Modira AI:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Lo siento, ha ocurrido un error al procesar tu mensaje. Inténtalo de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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
            {/* HEADER DEL CHAT */}

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
              <div className="flex items-center gap-3">
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
                  <Sparkles className="size-5 text-primary" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Modira AI
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Asistente inteligente
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
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

            {/* CHAT */}

            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
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
          BOTÓN FLOTANTE
          ===================================================== */}

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
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


/* ============================================================
   RESPUESTAS DE DEMOSTRACIÓN
   ============================================================

   Esto permite comprobar que TODO EL CHAT funciona incluso
   antes de conectar una IA real.

   Cuando conectemos el backend, esta función dejará de ser
   necesaria.
   ============================================================ */

function getDemoResponse(content: string): string {
  const message = content.toLowerCase();

  if (
    message.includes("qué es modira") ||
    message.includes("que es modira")
  ) {
    return `
**Modira** es una plataforma de automatización inteligente para empresas.

Permite conectar procesos, herramientas y equipos para reducir tareas manuales y hacer que el trabajo sea más eficiente.

Puedes utilizar Modira para automatizar diferentes procesos empresariales y centralizar su gestión.
`;
  }

  if (
    message.includes("automatizar") ||
    message.includes("automatización") ||
    message.includes("automatizacion")
  ) {
    return `
Con Modira puedes automatizar procesos repetitivos de tu empresa.

Por ejemplo:

- Gestión de clientes
- Proyectos
- Facturación
- Notificaciones
- Documentos
- Tareas internas
- Flujos de trabajo

La idea es conectar las diferentes partes del negocio y hacer que trabajen de forma automática.
`;
  }

  if (
    message.includes("cómo funciona") ||
    message.includes("como funciona")
  ) {
    return `
El funcionamiento de Modira se basa en **conectar tus procesos y automatizar las tareas repetitivas**.

En lugar de trabajar con herramientas aisladas, Modira permite crear flujos donde una acción puede desencadenar automáticamente otra.

Así puedes reducir trabajo manual y tener una visión más centralizada de tus procesos.
`;
  }

  return `
Soy **Modira AI**, el asistente virtual de Modira. ✨

Puedo ayudarte a entender:

- Qué es Modira
- Qué procesos puedes automatizar
- Cómo funciona la plataforma
- Qué problemas puede resolver
- Cómo puede ayudar a una empresa

Pregúntame lo que quieras sobre Modira.
`;
}