import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];
type InventoryInsert = Database["public"]["Tables"]["inventory"]["Insert"];

export function useInventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading, error } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          *,
          store:stores(id, name)
        `)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const createInventoryItem = useMutation({
    mutationFn: async (item: InventoryInsert) => {
      const { data, error } = await supabase
        .from("inventory")
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({
        title: "Item added",
        description: "The inventory item has been added successfully.",
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

  const updateInventoryItem = useMutation({
    mutationFn: async ({ id, ...item }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("inventory")
        .update(item)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({
        title: "Item updated",
        description: "The inventory item has been updated.",
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

  const deleteInventoryItem = useMutation({
    // Accept either an `id` string or an object `{ id, cascade?: boolean }`.
    mutationFn: async (idOrPayload: string | { id: string; cascade?: boolean }) => {
      const id = typeof idOrPayload === "string" ? idOrPayload : idOrPayload.id;
      const cascade = typeof idOrPayload === "string" ? true : idOrPayload.cascade ?? true;

      // If cascade is true, remove dependent `order_items` first to avoid FK constraint errors.
      if (cascade) {
        const { error: delItemsError } = await supabase.from("order_items").delete().eq("inventory_id", id);
        if (delItemsError) throw delItemsError;
      }

      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({
        title: "Item deleted",
        description: "The inventory item has been removed from the database.",
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
    inventory,
    isLoading,
    error,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
