import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  payment_type: "payment" | "refund";
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export function usePaymentHistory(orderId?: string) {
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payment-history", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PaymentRecord[];
    },
    enabled: !!orderId,
  });

  const recordPayment = useMutation({
    mutationFn: async ({
      orderId,
      amount,
      paymentType,
      notes,
    }: {
      orderId: string;
      amount: number;
      paymentType: "payment" | "refund";
      notes?: string;
    }) => {
      const { error } = await supabase.from("payment_history").insert({
        order_id: orderId,
        amount,
        payment_type: paymentType,
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payment-history", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(
        variables.paymentType === "payment" 
          ? "Payment recorded successfully" 
          : "Refund recorded successfully"
      );
    },
    onError: (error) => {
      toast.error("Failed to record: " + error.message);
    },
  });

  // Calculate totals from payment history
  const totalReceived = payments?.reduce((sum, p) => 
    p.payment_type === "payment" ? sum + Number(p.amount) : sum, 0) || 0;
  
  const totalRefunded = payments?.reduce((sum, p) => 
    p.payment_type === "refund" ? sum + Number(p.amount) : sum, 0) || 0;

  return {
    payments,
    isLoading,
    recordPayment,
    totalReceived,
    totalRefunded,
    netReceived: totalReceived - totalRefunded,
  };
}
