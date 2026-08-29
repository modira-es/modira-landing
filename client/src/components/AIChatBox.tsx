import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles } from "lucide-react";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Streamdown } from "streamdown";

/**
 * Mensaje utilizado por Modira AI.
 *
 * El mensaje "system" puede existir en el estado del frontend,
 * pero nunca se muestra visualmente.
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatBoxProps = {
  /**
   * Mensajes actuales de la conversación.
   */
  messages: Message[];

  /**
   * Función llamada cuando el usuario envía un mensaje.
   *
   * Puede ser síncrona o asíncrona.
   */
  onSendMessage: (
    content: string
  ) => void | Promise<void>;

  /**
   * Indica si Modira AI está generando una respuesta.
   */
  isLoading?: boolean;

  /**
   * Placeholder del campo de texto.
   */
  placeholder?: string;

  /**
   * Clases adicionales del contenedor.
   */
  className?: string;

  /**
   * Altura del chat.
   */
  height?: string | number;

  /**
   * Texto mostrado cuando no hay mensajes.
   */
  emptyStateMessage?: string;

  /**
   * Preguntas sugeridas.
   */
  suggestedPrompts?: string[];
};

export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Escribe tu pregunta...",
  className,
  height = "600px",
  emptyStateMessage = "¿En qué puedo ayudarte?",
  suggestedPrompts,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");

  const scrollAreaRef =
    useRef<HTMLDivElement>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const inputAreaRef =
    useRef<HTMLFormElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  // ============================================================
  // MENSAJES VISIBLES
  // ============================================================

  /**
   * Los mensajes "system" se utilizan internamente
   * pero nunca se muestran al usuario.
   */
  const displayMessages = messages.filter(
    (message) => message.role !== "system"
  );

  // ============================================================
  // ALTURA MÍNIMA DEL ÚLTIMO MENSAJE
  // ============================================================

  const [
    minHeightForLastMessage,
    setMinHeightForLastMessage,
  ] = useState(0);

  const calculateMessageMinHeight =
    useCallback(() => {
      if (
        !containerRef.current ||
        !inputAreaRef.current
      ) {
        return;
      }

      const containerHeight =
        containerRef.current.offsetHeight;

      const inputHeight =
        inputAreaRef.current.offsetHeight;

      const scrollAreaHeight =
        containerHeight - inputHeight;

      /*
       * Espacio reservado para:
       *
       * - padding superior/inferior
       * - siguiente mensaje del usuario
       * - separación entre mensajes
       */
      const userMessageReservedHeight = 56;

      const calculatedHeight =
        scrollAreaHeight -
        32 -
        userMessageReservedHeight;

      setMinHeightForLastMessage(
        Math.max(0, calculatedHeight)
      );
    }, []);

  useEffect(() => {
    calculateMessageMinHeight();

    const resizeObserver =
      new ResizeObserver(() => {
        calculateMessageMinHeight();
      });

    if (containerRef.current) {
      resizeObserver.observe(
        containerRef.current
      );
    }

    if (inputAreaRef.current) {
      resizeObserver.observe(
        inputAreaRef.current
      );
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateMessageMinHeight]);

  // ============================================================
  // SCROLL
  // ============================================================

  const scrollToBottom =
    useCallback(
      (behavior: ScrollBehavior = "smooth") => {
        const viewport =
          scrollAreaRef.current?.querySelector(
            "[data-radix-scroll-area-viewport]"
          ) as HTMLDivElement | null;

        if (!viewport) {
          return;
        }

        requestAnimationFrame(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior,
          });
        });
      },
      []
    );

  /**
   * IMPORTANTE:
   *
   * El scroll se ejecuta DESPUÉS de que React haya
   * actualizado los mensajes.
   *
   * Esto evita intentar hacer scroll antes de que
   * exista el nuevo mensaje en el DOM.
   */
  useEffect(() => {
    scrollToBottom("smooth");
  }, [
    displayMessages.length,
    isLoading,
    scrollToBottom,
  ]);

  // ============================================================
  // ENVIAR MENSAJE
  // ============================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const trimmedInput =
      input.trim();

    if (
      !trimmedInput ||
      isLoading
    ) {
      return;
    }

    setInput("");

    try {
      await onSendMessage(
        trimmedInput
      );
    } catch (error) {
      console.error(
        "Error enviando mensaje:",
        error
      );
    } finally {
      /*
       * Devolvemos el foco al textarea
       * cuando termina la operación.
       */
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  // ============================================================
  // TECLADO
  // ============================================================

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    /*
     * Enter = enviar
     *
     * Shift + Enter = nueva línea
     */
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      /*
       * No necesitamos construir un FormEvent
       * artificialmente.
       *
       * Ejecutamos el envío directamente.
       */
      const trimmedInput =
        input.trim();

      if (
        !trimmedInput ||
        isLoading
      ) {
        return;
      }

      setInput("");

      void onSendMessage(
        trimmedInput
      );
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      style={{
        height,
      }}
    >
      {/* ======================================================
          ÁREA DE MENSAJES
          ====================================================== */}

      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-hidden"
      >
        {displayMessages.length === 0 ? (
          <div className="flex h-full flex-col p-4">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="size-12 opacity-20" />

                <p className="text-sm">
                  {emptyStateMessage}
                </p>
              </div>

              {suggestedPrompts &&
                suggestedPrompts.length >
                  0 && (
                  <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                    {suggestedPrompts.map(
                      (
                        prompt,
                        index
                      ) => (
                        <button
                          key={`${prompt}-${index}`}
                          type="button"
                          onClick={() => {
                            if (
                              isLoading
                            ) {
                              return;
                            }

                            setInput("");

                            void onSendMessage(
                              prompt
                            );
                          }}
                          disabled={
                            isLoading
                          }
                          className="
                            rounded-lg
                            border
                            border-border
                            bg-card
                            px-4
                            py-2
                            text-sm
                            transition-colors
                            hover:bg-accent
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          {prompt}
                        </button>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col space-y-4 p-4">
              {displayMessages.map(
                (
                  message,
                  index
                ) => {
                  const isLastMessage =
                    index ===
                    displayMessages.length -
                      1;

                  const shouldApplyMinHeight =
                    isLastMessage &&
                    !isLoading &&
                    minHeightForLastMessage >
                      0;

                  return (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        "flex gap-3",
                        message.role ===
                          "user"
                          ? "items-start justify-end"
                          : "items-start justify-start"
                      )}
                      style={
                        shouldApplyMinHeight
                          ? {
                              minHeight: `${minHeightForLastMessage}px`,
                            }
                          : undefined
                      }
                    >
                      {/* ==================================================
                          ICONO IA
                          ================================================== */}

                      {message.role ===
                        "assistant" && (
                        <div
                          className="
                            mt-1
                            flex
                            size-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-primary/10
                          "
                        >
                          <Sparkles className="size-4 text-primary" />
                        </div>
                      )}

                      {/* ==================================================
                          MENSAJE
                          ================================================== */}

                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2.5",
                          message.role ===
                            "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {message.role ===
                        "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <Streamdown>
                              {
                                message.content
                              }
                            </Streamdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm">
                            {
                              message.content
                            }
                          </p>
                        )}
                      </div>

                      {/* ==================================================
                          ICONO USUARIO
                          ================================================== */}

                      {message.role ===
                        "user" && (
                        <div
                          className="
                            mt-1
                            flex
                            size-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-secondary
                          "
                        >
                          <User className="size-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  );
                }
              )}

              {/* ========================================================
                  LOADING
                  ======================================================== */}

              {isLoading && (
                <div
                  className="flex items-start gap-3"
                  style={
                    minHeightForLastMessage >
                    0
                      ? {
                          minHeight: `${minHeightForLastMessage}px`,
                        }
                      : undefined
                  }
                >
                  <div
                    className="
                      mt-1
                      flex
                      size-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-primary/10
                    "
                  >
                    <Sparkles className="size-4 text-primary" />
                  </div>

                  <div className="rounded-lg bg-muted px-4 py-2.5">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ==========================================================
          INPUT
          ========================================================== */}

      <form
        ref={inputAreaRef}
        onSubmit={handleSubmit}
        className="
          flex
          items-end
          gap-2
          border-t
          bg-background/50
          p-4
        "
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            min-h-9
            max-h-32
            flex-1
            resize-none
          "
          rows={1}
          disabled={isLoading}
        />

        <Button
          type="submit"
          size="icon"
          disabled={
            !input.trim() ||
            isLoading
          }
          className="
            h-[38px]
            w-[38px]
            shrink-0
          "
          aria-label="Enviar mensaje"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}