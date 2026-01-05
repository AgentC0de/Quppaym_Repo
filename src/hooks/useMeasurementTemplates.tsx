import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TemplateField {
  name: string;
  label: string;
  enabled: boolean;
}

export interface MeasurementTemplate {
  id: string;
  garment_type: string;
  fields: TemplateField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useMeasurementTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["measurement_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_templates")
        .select("*")
        .order("garment_type", { ascending: true });
      
      if (error) throw error;
      
      // Parse the JSONB fields
      return (data || []).map((t: any) => ({
        ...t,
        fields: typeof t.fields === 'string' ? JSON.parse(t.fields) : t.fields,
      })) as MeasurementTemplate[];
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: TemplateField[] }) => {
      const { data, error } = await supabase
        .from("measurement_templates")
        .update({ fields: JSON.stringify(fields) })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement_templates"] });
      toast({
        title: "Template updated",
        description: "Measurement template has been saved.",
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

  const createTemplate = useMutation({
    mutationFn: async ({ garment_type, fields }: { garment_type: string; fields: TemplateField[] }) => {
      const { data, error } = await supabase
        .from("measurement_templates")
        .insert([{ garment_type, fields: JSON.stringify(fields) }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement_templates"] });
      toast({
        title: "Template created",
        description: "New garment template has been added.",
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

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("measurement_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement_templates"] });
      toast({
        title: "Template deleted",
        description: "Garment template has been removed.",
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

  const getTemplateByGarmentType = (garmentType: string) => {
    return templates.find(t => t.garment_type.toLowerCase() === garmentType.toLowerCase());
  };

  const getEnabledFields = (garmentType: string) => {
    const template = getTemplateByGarmentType(garmentType);
    if (!template) return [];
    return template.fields.filter(f => f.enabled);
  };

  return {
    templates,
    isLoading,
    error,
    updateTemplate,
    createTemplate,
    deleteTemplate,
    getTemplateByGarmentType,
    getEnabledFields,
  };
}
