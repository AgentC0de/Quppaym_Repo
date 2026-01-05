import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface OrderStatusSetting {
  id: string;
  code: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface VipStatusSetting {
  id: string;
  code: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useOrderStatusSettings = () => {
  const queryClient = useQueryClient();

  const { data: orderStatuses, isLoading, error } = useQuery({
    queryKey: ["order-status-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_settings")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as OrderStatusSetting[];
    },
  });

  const createOrderStatus = useMutation({
    mutationFn: async (status: Omit<OrderStatusSetting, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("order_status_settings")
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-status-settings"] });
      toast({ title: "Order status created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create order status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrderStatusSetting> & { id: string }) => {
      const { data, error } = await supabase
        .from("order_status_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-status-settings"] });
      toast({ title: "Order status updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOrderStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("order_status_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-status-settings"] });
      toast({ title: "Order status deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete order status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderStatuses = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("order_status_settings")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-status-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reorder statuses",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    orderStatuses,
    isLoading,
    error,
    createOrderStatus,
    updateOrderStatus,
    deleteOrderStatus,
    reorderStatuses,
  };
};

export const useVipStatusSettings = () => {
  const queryClient = useQueryClient();

  const { data: vipStatuses, isLoading, error } = useQuery({
    queryKey: ["vip-status-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_status_settings")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as VipStatusSetting[];
    },
  });

  const updateVipStatus = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VipStatusSetting> & { id: string }) => {
      const { data, error } = await supabase
        .from("vip_status_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vip-status-settings"] });
      toast({ title: "VIP status updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update VIP status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderVipStatuses = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("vip_status_settings")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vip-status-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reorder VIP statuses",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    vipStatuses,
    isLoading,
    error,
    updateVipStatus,
    reorderVipStatuses,
  };
};
