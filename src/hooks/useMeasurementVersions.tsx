import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MeasurementVersion = Database["public"]["Tables"]["measurement_versions"]["Row"];

const MAX_VERSIONS = 3;

export function useMeasurementVersions(measurementId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading, error } = useQuery({
    queryKey: ["measurement-versions", measurementId],
    queryFn: async () => {
      if (!measurementId) return [];
      
      const { data, error } = await supabase
        .from("measurement_versions")
        .select("*")
        .eq("measurement_id", measurementId)
        .order("version_number", { ascending: false });
      
      if (error) throw error;
      return data as MeasurementVersion[];
    },
    enabled: !!measurementId,
  });

  // Auto-cleanup: delete oldest versions if more than MAX_VERSIONS exist
  const cleanupOldVersions = useMutation({
    mutationFn: async () => {
      if (!measurementId || versions.length <= MAX_VERSIONS) return;
      
      // Get versions to delete (oldest ones beyond the limit)
      const versionsToDelete = versions.slice(MAX_VERSIONS);
      const idsToDelete = versionsToDelete.map(v => v.id);
      
      if (idsToDelete.length === 0) return;
      
      const { error } = await supabase
        .from("measurement_versions")
        .delete()
        .in("id", idsToDelete);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement-versions", measurementId] });
    },
  });

  // Limited versions for display (max 3)
  const displayVersions = versions.slice(0, MAX_VERSIONS);

  return {
    versions: displayVersions,
    allVersions: versions,
    isLoading,
    error,
    latestVersion: versions[0] || null,
    cleanupOldVersions,
    hasExcessVersions: versions.length > MAX_VERSIONS,
  };
}
