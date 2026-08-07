# Integración de Stripe con Presupuestos

Este documento detalla cómo se integra Stripe para el pago de presupuestos en Modira.

## Flujo de Pago

1.  **Generación de Sesión**: Cuando un cliente pulsa "Aceptar y Pagar" en un presupuesto con estado `pendiente`, el frontend llama a un endpoint (tRPC o Serverless Function) que crea una `Checkout Session` en Stripe.
2.  **Configuración de la Sesión**:
    *   **Line Items**: Se crea un item dinámico con el título del presupuesto y el precio total.
    *   **Metadata**: Se incluye el `quotationId` para poder identificar el presupuesto tras el pago.
    *   **Modo**: `payment` (pago único).
3.  **Redirección**: El usuario es redirigido a Stripe para completar el pago.
4.  **Webhook**: Stripe envía un evento `checkout.session.completed` a nuestro servidor.

## Procesamiento del Webhook

Al recibir la confirmación de pago:
1.  Se extrae el `quotationId` de la metadata de la sesión.
2.  Se actualiza el estado del presupuesto en Supabase a `pagado`.
3.  Se registra la fecha de pago y el `stripe_session_id`.
4.  (Opcional) Se genera la factura automáticamente.

## Endpoints

*   **Frontend**: `client/src/pages/QuotationView.tsx` (Lógica de inicio de pago).
*   **Backend**: `server/routers/stripe.ts` -> `createQuotationCheckoutSession`.
*   **Webhook**: Pendiente de implementación en una Edge Function de Supabase o endpoint Express dedicado.

## Requisitos de Entorno

*   `STRIPE_SECRET_KEY`: Para la creación de sesiones.
*   `STRIPE_WEBHOOK_SECRET`: Para validar las notificaciones de Stripe.
*   `VITE_STRIPE_PUBLISHABLE_KEY`: Para el frontend (opcional si se usa redirección directa).
