import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatToE164 } from "@/lib/phone";
import { waFetch } from "@/lib/wa";
import { waInfo, waWarn, waError } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Measurement = Database["public"]["Tables"]["measurements"]["Row"];
type MeasurementInsert = Database["public"]["Tables"]["measurements"]["Insert"];

export function useMeasurements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: measurements = [], isLoading, error } = useQuery({
    queryKey: ["measurements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurements")
        .select(`
          *,
          order:orders!measurements_order_id_fkey(id, order_number, customer:customers(id, name))
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getMeasurementsByOrderId = (orderId: string) => {
    return measurements.filter(m => m.order_id === orderId);
  };

  const createMeasurement = useMutation({
    mutationFn: async (measurement: MeasurementInsert) => {
      const { data, error } = await supabase
        .from("measurements")
        .insert(measurement)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (createdMeasurement) => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast({
        title: "Measurement saved",
        description: "The measurement profile has been saved successfully.",
      });

      // Send WhatsApp notification using measurement-aware template
      try {
        if (!createdMeasurement || !createdMeasurement.order_id) return;

        // Fetch order and customer details
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .select("id, order_number, created_at, due_date, is_settled, customer:customers(id, name, phone)")
          .eq("id", createdMeasurement.order_id)
          .single();

        if (orderErr || !order) return;

        // Fetch order items for the order
        const { data: items } = await supabase
          .from("order_items")
          .select("description, quantity")
          .eq("order_id", order.id);

        const itemsList = (items || [])
          .map((it: any) => `${it.description} x ${it.quantity}`)
          .join("; ") || "-";

        const orderDate = order.created_at
          ? new Date(order.created_at).toISOString().split("T")[0]
          : "";

        // Prefer local proxy in dev when running on localhost
        function getWaUrl() {
          const envUrl = (import.meta.env.VITE_WA_PROXY_URL as string) || "";
          const forceRemote = (import.meta.env.VITE_WA_FORCE_REMOTE as string) === "true";
          if (!forceRemote && import.meta.env.DEV && typeof window !== "undefined") {
            const host = window.location.hostname;
            if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4001";
          }
          return envUrl || "http://localhost:4001";
        }
        const waUrl = getWaUrl();

        const rawPhone = order.customer?.phone || "";
        const toPhone = formatToE164(rawPhone);
        if (!toPhone) {
          waInfo('measurement send: skipping invalid phone', { rawPhone, orderId: order.id });
          return;
        }
        if (toPhone) {
          // Template expects positional parameters: name + 32 measurement values
          // Map template placeholders to actual measurement properties.
          // Some template placeholders are from the old schema (e.g., `chest`, `waist`, `sleeve_length`).
          // Map them to the closest current fields when possible.
          const templateMap: string[] = [
            "full_length",
            "blouse_length",
            "shoulder",
            // chest -> map to `bust` (no separate `chest` field in new schema)
            "bust",
            // bust -> `bust`
            "bust",
            // waist -> map to `waist_round`
            "waist_round",
            "yoke_length",
            "yoke_round",
            "slit_length",
            "slit_width",
            "stomach_length",
            "stomach_round",
            "bust_point_length",
            "bust_distance",
            "fc",
            "bc",
            // sleeve_length -> map to `sleeve_round` as best-effort
            "sleeve_round",
            "sleeve_round",
            "bicep_round",
            "armhole",
            "shoulder_balance",
            "front_neck_depth",
            "back_neck_depth",
            "collar_round",
            "bottom_length",
            "skirt_length",
            // waist_round -> waist_round
            "waist_round",
            "hip_round",
            "seat_round",
            "thigh_round",
            "knee_round",
            "ankle_round",
          ];

          const params: Array<any> = [];
          // param 1: customer name
          params.push({ type: "text", text: order.customer?.name || "" });
          // params 2..33: measurements in template order (use mapped keys)
          templateMap.forEach((k) => {
            const raw = (createdMeasurement as any)[k];
            const textVal = raw !== null && raw !== undefined && String(raw).trim() ? String(raw) : "-";
            params.push({ type: "text", text: textVal });
          });

          // Safety: if there are no measurement values (all empty), skip sending
          const nonEmptyCount = params.slice(1).reduce((s, p) => s + (p.text && p.text.trim() ? 1 : 0), 0);
          if (nonEmptyCount === 0) {
            // nothing meaningful to send
            return;
          }

          const components = [{ type: "body", parameters: params }];

          // Log send attempt (non-blocking)
          waInfo('sending measurement template', { to: toPhone, paramsCount: params.length });

          const resp = await waFetch(`${waUrl}/api/whatsapp/send`, {
            method: "POST",
            body: JSON.stringify({
              to: toPhone,
              template: "wa_order_confirmation_with_measure",
              language: "en",
              components,
            }),
          });

          // Log response (non-blocking)
          resp
            .text()
            .then((t) => {
              waInfo('measurement send response', { status: resp.status });
            })
            .catch(() => {});
        }
      } catch (err) {
        // non-blocking: just log
        waError('WhatsApp send error (measurement)', err && err.message ? err.message : err);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMeasurement = useMutation({
    mutationFn: async ({ id, ...measurement }: Partial<Measurement> & { id: string }) => {
      const { data, error } = await supabase
        .from("measurements")
        .update(measurement)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast({
        title: "Measurement updated",
        description: "The measurement profile has been updated.",
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

  const deleteMeasurement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("measurements")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast({
        title: "Measurement deleted",
        description: "The measurement profile has been removed.",
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
    measurements,
    isLoading,
    error,
    getMeasurementsByOrderId,
    createMeasurement,
    updateMeasurement,
    deleteMeasurement,
  };
}
