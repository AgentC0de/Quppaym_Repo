import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];

export function useCustomers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (customer: CustomerInsert) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Customer created",
        description: "The customer has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(customer)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Customer updated",
        description: "The customer has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCustomer = useMutation({
    // Accept either an id string or `{ id, cascade?: boolean }`.
    mutationFn: async (idOrPayload: string | { id: string; cascade?: boolean }) => {
      const id = typeof idOrPayload === "string" ? idOrPayload : idOrPayload.id;
      const cascade = typeof idOrPayload === "string" ? false : idOrPayload.cascade ?? false;

      if (cascade) {
        // Find orders for this customer
        const { data: orders, error: ordersErr } = await supabase
          .from("orders")
          .select("id")
          .eq("customer_id", id);
        if (ordersErr) throw ordersErr;

        const orderIds = (orders || []).map((o: any) => o.id);

        if (orderIds.length > 0) {
          // Delete order_items
          const { error: delItemsErr } = await supabase.from("order_items").delete().in("order_id", orderIds);
          if (delItemsErr) throw delItemsErr;

          // Delete payment history
          const { error: delPaymentsErr } = await supabase.from("payment_history").delete().in("order_id", orderIds);
          if (delPaymentsErr) throw delPaymentsErr;

          // Delete fitting appointments
          const { error: delFittingsErr } = await supabase.from("fitting_appointments").delete().in("order_id", orderIds);
          if (delFittingsErr) throw delFittingsErr;

          // Delete adjustment history referencing orders
          const { error: delAdjErr } = await supabase.from("adjustment_history").delete().in("order_id", orderIds);
          if (delAdjErr) throw delAdjErr;

          // Delete measurements and their versions linked to these orders
          const { data: measurements, error: measurementsErr } = await supabase
            .from("measurements")
            .select("id")
            .in("order_id", orderIds);
          if (measurementsErr) throw measurementsErr;
          const measurementIds = (measurements || []).map((m: any) => m.id);
          if (measurementIds.length > 0) {
            const { error: delVersionsErr } = await supabase.from("measurement_versions").delete().in("measurement_id", measurementIds);
            if (delVersionsErr) throw delVersionsErr;
          }
          const { error: delMeasurementsErr } = await supabase.from("measurements").delete().in("order_id", orderIds);
          if (delMeasurementsErr) throw delMeasurementsErr;

          // Finally delete orders
          const { error: delOrdersErr } = await supabase.from("orders").delete().in("id", orderIds);
          if (delOrdersErr) throw delOrdersErr;
        }
      }

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Customer deleted",
        description: "The customer has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    customers,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
