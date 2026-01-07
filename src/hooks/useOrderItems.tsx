import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

export function useOrderItems(orderId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          measurement:measurements(
            id,
            garment_type,
            full_length,
            blouse_length,
            shoulder,
            bust,
            waist_round,
            yoke_length,
            yoke_round,
            slit_length,
            slit_width,
            stomach_length,
            stomach_round,
            bust_point_length,
            bust_distance,
            fc,
            bc,
            sleeve_round,
            bicep_round,
            armhole,
            shoulder_balance,
            front_neck_depth,
            back_neck_depth,
            collar_round,
            bottom_length,
            skirt_length,
            hip_round,
            seat_round,
            thigh_round,
            knee_round,
            ankle_round,
            custom_notes
          ),
          measurement_version:measurement_versions(
            id,
            version_number,
            full_length,
            blouse_length,
            shoulder,
            bust,
            waist_round,
            yoke_length,
            yoke_round,
            slit_length,
            slit_width,
            stomach_length,
            stomach_round,
            bust_point_length,
            bust_distance,
            fc,
            bc,
            sleeve_round,
            bicep_round,
            armhole,
            shoulder_balance,
            front_neck_depth,
            back_neck_depth,
            collar_round,
            bottom_length,
            skirt_length,
            hip_round,
            seat_round,
            thigh_round,
            knee_round,
            ankle_round,
            garment_type,
            custom_notes,
            created_at
          )
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const updateOrderItemMeasurement = useMutation({
    mutationFn: async ({ 
      itemId, 
      measurementVersionId 
    }: { 
      itemId: string; 
      measurementVersionId: string;
    }) => {
      const { data, error } = await supabase
        .from("order_items")
        .update({ measurement_version_id: measurementVersionId })
        .eq("id", itemId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      toast({
        title: "Measurement updated",
        description: "The order item measurement has been updated.",
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

  const addOrderItem = useMutation({
    mutationFn: async (item: {
      order_id: string;
      description: string;
      unit_price: number;
      quantity: number;
      total_price: number;
      inventory_id?: string | null;
      measurement_id?: string | null;
      is_custom_work?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("order_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      toast({ title: "Item added", description: "The item was added to the order." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeOrderItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      toast({ title: "Item removed", description: "The item was removed from the order." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateOrderItemQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { data, error } = await supabase
        .from("order_items")
        .update({ quantity })
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      toast({ title: "Quantity updated", description: "The item quantity has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    items,
    isLoading,
    error,
    updateOrderItemMeasurement,
    addOrderItem,
    removeOrderItem,
    updateOrderItemQuantity,
  };
}
