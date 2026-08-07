import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, AlertCircle, Download } from "lucide-react";
import { useState } from "react";

export default function Billing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"subscriptions" | "invoices">("subscriptions");

  const subscriptionsQuery = trpc.stripe.getUserSubscriptions.useQuery(undefined, {
    enabled: !!user
  });
  const paymentsQuery = trpc.stripe.getUserPayments.useQuery(undefined, {
    enabled: !!user
  });
  const cancelSubscription = trpc.stripe.cancelSubscription.useMutation();

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (confirm("¿Estás seguro de que deseas cancelar esta suscripción?")) {
      try {
        await cancelSubscription.mutateAsync({ subscriptionId });
        subscriptionsQuery.refetch();
      } catch (error) {
        console.error("Error canceling subscription:", error);
        alert("Error al cancelar la suscripción");
      }
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return (amount / 100).toLocaleString("es-ES", {
      style: "currency",
      currency: currency.toUpperCase(),
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Facturación</h1>
          <p className="text-gray-600">Gestiona tus suscripciones y facturas</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === "subscriptions"
                ? "bg-[#1E3A8A] text-white"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-[#1E3A8A]"
            }`}
          >
            Suscripciones
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === "invoices"
                ? "bg-[#1E3A8A] text-white"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-[#1E3A8A]"
            }`}
          >
            Facturas
          </button>
        </div>

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            {subscriptionsQuery.isLoading ? (
              <Card className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </Card>
            ) : subscriptionsQuery.data?.length === 0 ? (
              <Card className="p-8">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">No tienes suscripciones activas</h3>
                    <p className="text-gray-600">Contrata un plan para acceder a nuestros servicios premium.</p>
                  </div>
                </div>
              </Card>
            ) : (
              subscriptionsQuery.data?.map((sub: any) => (
                <Card key={sub.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#1E3A8A]">{sub.product?.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{sub.product?.description}</p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        sub.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {sub.status === "active" ? "Activa" : "Pendiente"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-gray-600 text-sm">Precio</p>
                      <p className="text-lg font-semibold text-[#1F2937]">
                        {formatAmount(sub.price?.amount || 0, sub.price?.currency || "eur")}
                        {sub.price?.interval && `/${sub.price.interval}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Inicio del período</p>
                      <p className="text-lg font-semibold text-[#1F2937]">
                        {formatDate(sub.currentPeriodStart)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Fin del período</p>
                      <p className="text-lg font-semibold text-[#1F2937]">
                        {formatDate(sub.currentPeriodEnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Renovación</p>
                      <p className="text-lg font-semibold text-[#1F2937]">
                        {sub.canceledAt ? "Cancelada" : "Automática"}
                      </p>
                    </div>
                  </div>

                  {!sub.canceledAt && (
                    <Button
                      onClick={() => handleCancelSubscription(sub.stripeSubscriptionId)}
                      disabled={cancelSubscription.isPending}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {cancelSubscription.isPending ? "Cancelando..." : "Cancelar suscripción"}
                    </Button>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            {paymentsQuery.isLoading ? (
              <Card className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
              </Card>
            ) : paymentsQuery.data?.length === 0 ? (
              <Card className="p-8">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">No tienes facturas</h3>
                    <p className="text-gray-600">Tus facturas aparecerán aquí una vez realices un pago.</p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Factura</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Monto</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsQuery.data?.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-mono text-sm text-[#1E3A8A]">
                          {payment.stripeInvoiceId.substring(0, 12)}...
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-sm font-semibold text-[#1F2937]">
                          {formatAmount(payment.amount, payment.currency)}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              payment.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : payment.status === "draft"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {payment.status === "paid"
                              ? "Pagada"
                              : payment.status === "draft"
                              ? "Borrador"
                              : "Pendiente"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {payment.status !== "paid" && (
                            <Button
                              size="sm"
                              className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Pagar ahora
                            </Button>
                          )}
                          {payment.status === "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
