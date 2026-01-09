import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSettings(key: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["settings", key],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("value").eq("key", key).single();
      if (error && error.code !== "PGRST116") throw error;
      return (data?.value as any) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (value: any) => {
      const { data, error } = await supabase.from("settings").upsert({ key, value }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", key] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    },
  });

  return {
    settings: data,
    isLoading,
    error,
    save: save.mutate,
    saveStatus: save,
  };
}

export type { };
