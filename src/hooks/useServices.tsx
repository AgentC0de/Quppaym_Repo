import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Service = Database["public"]["Tables"]["services"]["Row"];
type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];

export function useServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`*`)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createService = useMutation({
    mutationFn: async (s: ServiceInsert) => {
      const { data, error } = await supabase.from("services").insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Service added", description: "The service has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...s }: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase.from("services").update(s).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Service updated", description: "The service has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteService = useMutation({
    // Accept either an `id` string or an object `{ id, cascade? }`.
    mutationFn: async (idOrPayload: string | { id: string; cascade?: boolean }) => {
      const id = typeof idOrPayload === "string" ? idOrPayload : idOrPayload.id;
      const cascade = typeof idOrPayload === "string" ? true : idOrPayload.cascade ?? true;

      // If cascade is true, remove dependent `order_items` first to avoid FK constraint errors.
      if (cascade) {
        const { error: delItemsError } = await supabase.from("order_items").delete().eq("service_id", id);
        if (delItemsError) throw delItemsError;
      }

      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Service deleted", description: "The service has been removed from the database." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return {
    services,
    isLoading,
    error,
    createService,
    updateService,
    deleteService,
  };
}
