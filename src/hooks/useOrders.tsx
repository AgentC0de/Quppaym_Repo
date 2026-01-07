import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatToE164 } from "@/lib/phone";
import { waFetch } from "@/lib/wa";
import { waInfo, waWarn, waError } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import waTemplates from "@/config/wa-templates.json";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];

export function useOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine WA proxy URL — prefer local proxy when developing on localhost
  function getWaUrl() {
    const envUrl = (import.meta.env.VITE_WA_PROXY_URL as string) || "";
    // Allow forcing remote function even when on localhost for E2E testing
    const forceRemote = (import.meta.env.VITE_WA_FORCE_REMOTE as string) === "true";
    if (!forceRemote && import.meta.env.DEV && typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4001";
    }
    return envUrl || "http://localhost:4001";
  }

  

  // Phone formatting moved to shared helper `src/lib/phone.ts`.

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(id, name, phone, vip_status),
          store:stores(id, name),
          assigned_employee:employees(id, name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: OrderInsert) => {
      const { data, error } = await supabase
        .from("orders")
        .insert(order)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order created",
        description: "The order has been created successfully.",
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

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order["status"] }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order updated",
        description: "The order status has been updated.",
      });

      // Trigger WhatsApp template when status becomes ready_for_pickup
      try {
        if (updatedOrder && updatedOrder.status === "ready_for_pickup") {
          // fetch order with customer and store details
          const { data: orderWithCustomer, error: ordErr } = await supabase
            .from("orders")
            .select("id, order_number, customer:customers(id, name, phone), store:stores(id, name, address)")
            .eq("id", updatedOrder.id)
            .single();

          if (!orderWithCustomer || ordErr || !orderWithCustomer.customer) {
            waWarn('missing order/customer details (ready)', ordErr);
          } else {
            const rawPhone = orderWithCustomer.customer.phone || "";
            const toPhone = formatToE164(rawPhone);
          const waUrl = getWaUrl();

            if (!toPhone) {
              waInfo('no or invalid customer phone (ready)', { orderId: orderWithCustomer.id });
            } else if ((import.meta.env.VITE_DISABLE_WA as string) === "true") {
              waInfo('WA disabled via VITE_DISABLE_WA');
            } else {
              // Use local mapping if present
              const mapping = (waTemplates as any)?.wa_order_ready?.parameters as string[] | undefined;
              if (mapping && mapping.length > 0) {
                const params: Array<any> = mapping.map((p) => {
                  if (p === "gps") {
                    // Per requirement: GPS should show as "Required Update"
                    return { type: "text", text: "Required Update" };
                  }

                  const parts = p.split('.');
                  let val: any = { order: orderWithCustomer, customer: orderWithCustomer.customer, store: orderWithCustomer.store };
                  for (const part of parts) {
                    if (val && typeof val === 'object' && part in val) {
                      val = val[part];
                    } else {
                      val = undefined;
                      break;
                    }
                  }

                  // Fallback: if store.address requested but missing, use store.name
                  if ((p === 'store.address') && (!val || String(val).trim() === '')) {
                    val = orderWithCustomer.store?.name || '-';
                  }

                  const textVal = val !== null && val !== undefined && String(val).trim() ? String(val) : '-';
                  return { type: 'text', text: textVal };
                });

                const components = [{ type: 'body', parameters: params }];
                waInfo('sending wa_order_ready', { to: toPhone, paramsLength: params.length });
                waInfo('sending payload', { to: toPhone, template: 'wa_order_ready', paramsLength: params.length });

                let sendUrl = `${waUrl}/api/whatsapp/send`;
                const resp = await waFetch(sendUrl, {
                  method: 'POST',
                  body: JSON.stringify({ to: toPhone, template: 'wa_order_ready', language: 'en', components }),
                });
                const txt = await resp.text().catch(() => null);
                  if (resp.ok) {
                    waInfo('wa_order_ready sent', { to: toPhone, status: resp.status });
                  } else {
                    waWarn('wa_order_ready send failed', { to: toPhone, status: resp.status, body: txt });
                  }
              } else {
                // No local mapping — fallback to fetching template definition and building params
                try {
                  const tplResp = await waFetch(`${waUrl}/api/whatsapp/templates/wa_order_ready?language=en_US`);
                  const tplJson = await tplResp.json().catch(() => null);
                  waInfo('template definition response', { status: tplResp.status });

                  let expectedParams = 2;
                  try {
                    const tplObj = tplJson && (tplJson.data?.[0] || tplJson[0] || tplJson.template || tplJson);
                    const bodyComp = tplObj?.components?.find((c: any) => (c.type || c.name || '').toLowerCase() === 'body') || tplObj?.components?.find((c: any) => (c.type || '').toLowerCase() === 'text');
                    const bodyText = bodyComp?.text || bodyComp?.text_template || bodyComp?.example || undefined;
                    if (typeof bodyText === 'string') {
                      const matches = bodyText.match(/\{\{\s*\d+\s*\}\}/g) || bodyText.match(/\{\{\s*[^}]+\s*\}\}/g);
                      if (matches && matches.length) expectedParams = matches.length;
                    } else if (bodyComp?.example && Array.isArray(bodyComp.example)) {
                      expectedParams = bodyComp.example.length;
                    }
                  } catch (e) {
                    // ignore and use fallback
                  }

                  const params: Array<any> = [];
                  params.push({ type: 'text', text: orderWithCustomer.customer.name || '' });
                  params.push({ type: 'text', text: orderWithCustomer.order_number || '' });
                  const loc = orderWithCustomer.store?.address || orderWithCustomer.store?.name || '-';
                  params.push({ type: 'text', text: loc });
                  // GPS requirement per user: mark as Required Update
                  params.push({ type: 'text', text: 'Required Update' });

                  const additional = ['-', '-', '-'];
                  for (let i = params.length; i < expectedParams; i++) {
                    params.push({ type: 'text', text: additional[i - params.length] || '-' });
                  }

                  const components = [{ type: 'body', parameters: params }];
                  const sendPayload = { to: toPhone, template: 'wa_order_ready', language: 'en', components };
                  waInfo('sending fallback payload', { to: toPhone, template: 'wa_order_ready', paramsLength: params.length });

                  let sendUrl = `${waUrl}/api/whatsapp/send`;
                  const resp = await waFetch(sendUrl, { method: 'POST', body: JSON.stringify(sendPayload) });
                  if (resp.ok) {
                    const t = await resp.text().catch(() => null);
                    waInfo('wa_order_ready sent (fallback)', { to: toPhone, status: resp.status });
                  } else {
                    const bodyText = await resp.text().catch(() => null);
                    waWarn('wa_order_ready send failed (fallback)', { status: resp.status, body: bodyText });
                  }
                } catch (e) {
                  waWarn('proxy unreachable or template fetch failed — skipping send', { err: e && e.message ? e.message : e });
                }
              }
            }
          }
        }
      } catch (err) {
        waError('WhatsApp trigger error (ready_for_pickup)', err && err.message ? err.message : err);
      }

      // Trigger WhatsApp template when status becomes completed (send feedback request)
      try {
        if (updatedOrder && updatedOrder.status === "completed") {
          const { data: orderWithCustomer, error: ordErr } = await supabase
            .from("orders")
            .select("id, order_number, customer:customers(id, name, phone), store:stores(id, name, address)")
            .eq("id", updatedOrder.id)
            .single();

          if (!orderWithCustomer || ordErr || !orderWithCustomer.customer) {
            waWarn('missing order/customer details (completed)', ordErr);
          } else {
            const rawPhone = orderWithCustomer.customer.phone || "";
            const toPhone = formatToE164(rawPhone);
          const waUrl = getWaUrl();

            if (!toPhone) {
              waInfo('no or invalid customer phone (completed)', { orderId: orderWithCustomer.id });
            } else if ((import.meta.env.VITE_DISABLE_WA as string) === "true") {
              waInfo('WA disabled via VITE_DISABLE_WA');
            } else {
              const mapping = (waTemplates as any)?.feedback?.parameters as string[] | undefined;
              if (mapping && mapping.length > 0) {
                const params: Array<any> = mapping.map((p) => {
                  if (p === 'feedback_link') {
                    // Per request: mark feedback link as Requires Update
                    return { type: 'text', text: 'Required Update' };
                  }

                  const parts = p.split('.');
                  let val: any = { order: orderWithCustomer, customer: orderWithCustomer.customer, store: orderWithCustomer.store };
                  for (const part of parts) {
                    if (val && typeof val === 'object' && part in val) {
                      val = val[part];
                    } else {
                      val = undefined;
                      break;
                    }
                  }
                  const textVal = val !== null && val !== undefined && String(val).trim() ? String(val) : '-';
                  return { type: 'text', text: textVal };
                });

                const components = [{ type: 'body', parameters: params }];
                waInfo('sending feedback using mapping', { to: toPhone, paramsLength: params.length });
                const resp = await waFetch(`${waUrl}/api/whatsapp/send`, {
                  method: 'POST',
                  body: JSON.stringify({ to: toPhone, template: 'feedback', language: 'en', components }),
                });
                const txt = await resp.text().catch(() => null);
                  if (resp.ok) {
                    waInfo('feedback sent', { to: toPhone, status: resp.status });
                  } else {
                    waWarn('feedback send failed', { to: toPhone, status: resp.status, body: txt });
                  }
              } else {
                // fallback: build minimal params
                try {
                  const params = [{ type: 'text', text: orderWithCustomer.customer.name || '' }, { type: 'text', text: 'Required Update' }];
                  const components = [{ type: 'body', parameters: params }];
                  waInfo('sending feedback fallback', { to: toPhone });
                  const resp = await waFetch(`${waUrl}/api/whatsapp/send`, {
                    method: 'POST',
                    body: JSON.stringify({ to: toPhone, template: 'feedback', language: 'en', components }),
                  });
                  const txt = await resp.text().catch(() => null);
                  if (resp.ok) waInfo('feedback sent (fallback)', { to: toPhone, status: resp.status });
                  else waWarn('feedback send failed (fallback)', { to: toPhone, status: resp.status, body: txt });
                } catch (e) {
                  waWarn('proxy unreachable or template fetch failed — skipping feedback send', { err: e && e.message ? e.message : e });
                }
              }
            }
          }
        }
      } catch (err) {
        waError('WhatsApp trigger error (completed)', err && err.message ? err.message : err);
      }

      // Trigger WhatsApp template when status becomes in_production
      try {
        if (!updatedOrder || updatedOrder.status !== "in_production") return;

        // fetch order with customer details
        const { data: orderWithCustomer, error: ordErr } = await supabase
          .from("orders")
          .select("id, order_number, customer:customers(id, name, phone), store:stores(id, name), due_date")
          .eq("id", updatedOrder.id)
          .single();

        if (ordErr || !orderWithCustomer || !orderWithCustomer.customer) {
          waWarn('missing order/customer details (in_production)', ordErr);
          return;
        }

        const rawPhone = orderWithCustomer.customer.phone || "";
        const toPhone = formatToE164(rawPhone);
        const waUrl = getWaUrl();

        if (!toPhone) {
          waInfo('no or invalid customer phone (in_production)', { orderId: orderWithCustomer.id });
          return;
        }

        // If WA is disabled via env, skip sending
        if ((import.meta.env.VITE_DISABLE_WA as string) === "true") {
          waInfo('WA disabled via VITE_DISABLE_WA');
          return;
        }

        // If we have a local mapping for this template, use it to build params
        const mapping = (waTemplates as any)?.wa_work_initiation?.parameters as string[] | undefined;
        if (mapping && mapping.length > 0) {
          const params: Array<any> = mapping.map((p) => {
            const parts = p.split('.');
            let val: any = { order: orderWithCustomer, customer: orderWithCustomer.customer };
            // resolve dotted path against combined object
            for (const part of parts) {
              if (val && typeof val === 'object' && part in val) {
                val = val[part];
              } else {
                val = undefined;
                break;
              }
            }
            const textVal = val !== null && val !== undefined && String(val).trim() ? String(val) : '-';
            return { type: 'text', text: textVal };
          });

          const components = [{ type: 'body', parameters: params }];

          // send using mapping
              waInfo('sending wa_work_initiation using mapping', { to: toPhone, paramsLength: params.length });
                const resp = await waFetch(`${waUrl}/api/whatsapp/send`, { method: 'POST', body: JSON.stringify({ to: toPhone, template: 'wa_work_initiation', language: 'en', components }) });
              const txt = await resp.text().catch(() => null);
              waInfo('work_initiation response', { status: resp.status });
          return;
        }

        // Attempt to fetch the template definition to determine expected params
        try {
          const tplResp = await waFetch(`${waUrl}/api/whatsapp/templates/wa_work_initiation?language=en_US`);
          const tplJson = await tplResp.json().catch(() => null);
          waInfo('template definition response', { status: tplResp.status });

          // Determine expected number of placeholders from template body text
          let expectedParams = 3; // default fallback
          // If template endpoint returned an empty data array, try conservative default=2
          if (tplJson && tplJson.data && Array.isArray(tplJson.data) && tplJson.data.length === 0) {
            expectedParams = 2;
          }
          try {
            // Graph API returns array under `data` or similar; try several shapes
            const tplObj = tplJson && (tplJson.data?.[0] || tplJson[0] || tplJson.template || tplJson);
            const bodyComp = tplObj?.components?.find((c: any) => (c.type || c.name || '').toLowerCase() === 'body') || tplObj?.components?.find((c: any) => (c.type || '').toLowerCase() === 'text');
            const bodyText = bodyComp?.text || bodyComp?.text_template || bodyComp?.example || undefined;
            if (typeof bodyText === 'string') {
              const matches = bodyText.match(/\{\{\s*\d+\s*\}\}/g) || bodyText.match(/\{\{\s*[^}]+\s*\}\}/g);
              if (matches && matches.length) expectedParams = matches.length;
            } else if (bodyComp?.example && Array.isArray(bodyComp.example)) {
              // some endpoints return an example array of examples
              expectedParams = bodyComp.example.length;
            }
          } catch (e) {
            // ignore and use fallback
          }

          // Build parameter list matching expected count
          const params: Array<any> = [];
          // Fill common fields first
          params.push({ type: 'text', text: orderWithCustomer.customer.name || '' });
          params.push({ type: 'text', text: orderWithCustomer.order_number || '' });
          params.push({ type: 'text', text: 'In Production' });

          // Add placeholders or additional info for remaining params
          const additional = [
            (orderWithCustomer.store?.name || '') as string,
            (orderWithCustomer.due_date ? new Date(orderWithCustomer.due_date).toISOString().split('T')[0] : ''),
            '-' // filler
          ];

          for (let i = params.length; i < expectedParams; i++) {
            const add = additional[i - params.length] || '-';
            params.push({ type: 'text', text: add });
          }

          const components = [{ type: 'body', parameters: params }];

          // Debug log before sending
          waInfo('sending wa_work_initiation', { to: toPhone, expectedParams, paramsLength: params.length });

          const sendPayload = {
            to: toPhone,
            template: 'wa_work_initiation',
            language: 'en',
            components,
          };

          // send once, if Graph API complains about param count, try to parse expected
                  const resp = await waFetch(`${waUrl}/api/whatsapp/send`, { method: 'POST', body: JSON.stringify(sendPayload) });

          if (resp.ok) {
            const t = await resp.text().catch(() => null);
            waInfo('work initiation response', { status: resp.status });
          } else {
            const bodyText = await resp.text().catch(() => null);
            let parsed = null;
            try {
              parsed = bodyText ? JSON.parse(bodyText) : null;
            } catch (e) {
              parsed = null;
            }
            waWarn('work initiation send failed', { status: resp.status, body: parsed || bodyText });

            // If Graph returned param-mismatch (code 132000), try to extract expected count and retry trimmed params
            const code = parsed?.error?.code ?? parsed?.code;
            const details = parsed?.error?.error_data?.details || parsed?.error?.details || '';
            if (code === 132000 && typeof details === 'string') {
              const m = details.match(/expected number of params \((\d+)\)/i) || details.match(/expected number of params \((\d+)\)/i);
              const expected = m ? Number(m[1]) : null;
              if (expected && expected < params.length) {
                // trim params to expected and resend
                const trimmed = params.slice(0, expected);
                waInfo('retrying with trimmed params length', expected);
                const retryPayload = { ...sendPayload, components: [{ type: 'body', parameters: trimmed }] };
                const retryResp = await waFetch(`${waUrl}/api/whatsapp/send`, { method: 'POST', body: JSON.stringify(retryPayload) });
                const retryText = await retryResp.text().catch(() => null);
                waInfo('proxy retry response', { status: retryResp.status });
              }
            }
          }
        } catch (e) {
          // Network or proxy-level error — proxy likely unreachable. Log info and skip send.
          waWarn('proxy unreachable or template fetch failed — skipping WA send', { err: e && e.message ? e.message : e });
          return;
        }
      } catch (err) {
        // non-blocking logging
        waError('WhatsApp trigger error (in_production)', err && err.message ? err.message : err);
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

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...order }: Partial<Order> & { id: string }) => {
      const { data, error } = await supabase
        .from("orders")
        .update(order)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order updated",
        description: "The order has been updated.",
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

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" as Order["status"] })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order cancelled",
        description: "The order has been cancelled.",
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
    orders,
    isLoading,
    error,
    createOrder,
    updateOrderStatus,
    updateOrder,
    deleteOrder,
  };
}
