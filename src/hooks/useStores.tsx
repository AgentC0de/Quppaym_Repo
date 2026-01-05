import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Store = Database["public"]["Tables"]["stores"]["Row"];
type StoreInsert = Database["public"]["Tables"]["stores"]["Insert"];

export function useStores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stores = [], isLoading, error } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as Store[];
    },
  });

  const createStore = useMutation({
    mutationFn: async (store: StoreInsert) => {
      const { data, error } = await supabase
        .from("stores")
        .insert(store)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast({
        title: "Store created",
        description: "The store has been added successfully.",
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

  const updateStore = useMutation({
    mutationFn: async ({ id, ...store }: Partial<Store> & { id: string }) => {
      const { data, error } = await supabase
        .from("stores")
        .update(store)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast({
        title: "Store updated",
        description: "The store has been updated.",
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

  const deleteStore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("stores")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast({
        title: "Store deactivated",
        description: "The store has been deactivated.",
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
    stores,
    isLoading,
    error,
    createStore,
    updateStore,
    deleteStore,
  };
}
