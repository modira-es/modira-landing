import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface PricingCardProps {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval?: string;
  features: string[];
  priceId: string;
  highlighted?: boolean;
}

export default function PricingCard({
  name,
  description,
  price,
  currency,
  interval,
  features,
  priceId,
  highlighted,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleCheckout = async () => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCheckout.mutateAsync({
        priceId,
        successUrl: `${window.location.origin}/area-cliente?success=true`,
        cancelUrl: `${window.location.origin}/#precios`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Error al procesar el pago. Por favor, intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const displayPrice = (price / 100).toFixed(2);
  const intervalText = interval === "month" ? "/mes" : interval === "year" ? "/año" : "";

  return (
    <Card
      className={`flex flex-col h-full p-8 transition-all ${
        highlighted
          ? "ring-2 ring-[#1E3A8A] shadow-2xl scale-105"
          : "hover:shadow-lg"
      }`}
    >
      {highlighted && (
        <div className="mb-4 inline-block bg-[#1E3A8A] text-white px-3 py-1 rounded-full text-sm font-semibold w-fit">
          Más popular
        </div>
      )}

      <h3 className="text-2xl font-bold text-[#1E3A8A] mb-2">{name}</h3>
      <p className="text-gray-600 text-sm mb-6">{description}</p>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-[#1F2937]">{displayPrice}</span>
          <span className="text-gray-600">{currency.toUpperCase()}</span>
        </div>
        {intervalText && (
          <p className="text-gray-600 text-sm mt-2">{intervalText}</p>
        )}
      </div>

      <Button
        onClick={handleCheckout}
        disabled={isLoading || createCheckout.isPending}
        className={`w-full mb-8 py-6 font-semibold transition-all ${
          highlighted
            ? "bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
            : "border-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A]/5"
        }`}
      >
        {isLoading || createCheckout.isPending ? "Procesando..." : "Comenzar ahora"}
      </Button>

      <div className="space-y-4 flex-1">
        <p className="font-semibold text-[#1F2937] text-sm mb-4">Incluye:</p>
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700 text-sm">{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
