import { trpc } from "@/lib/trpc";

export function useInvoices(enabled = true) {
  return trpc.stripe.getUserInvoices.useQuery(undefined, {
    enabled,
  });
}
