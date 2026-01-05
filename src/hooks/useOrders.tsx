import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import waTemplates from "@/config/wa-templates.json";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];

export function useOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
            // eslint-disable-next-line no-console
            console.warn("WA trigger (ready): missing order/customer details", ordErr);
          } else {
            const toPhone = (orderWithCustomer.customer.phone || "").replace(/\D/g, "");
            const waUrl = (import.meta.env.VITE_WA_PROXY_URL as string) || "http://localhost:4001";

            if (!toPhone) {
              // eslint-disable-next-line no-console
              console.info("WA trigger (ready): no customer phone for order", orderWithCustomer.id);
            } else if ((import.meta.env.VITE_DISABLE_WA as string) === "true") {
              // eslint-disable-next-line no-console
              console.info("WA trigger disabled via VITE_DISABLE_WA");
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
                // eslint-disable-next-line no-console
                console.info('WA trigger: sending wa_order_ready using mapping', { to: toPhone, paramsLength: params.length });
                // confirm before sending
                // eslint-disable-next-line no-console
                console.info('WA trigger (ready): sending payload', { to: toPhone, template: 'wa_order_ready', paramsLength: params.length });

                const resp = await fetch(`${waUrl}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ to: toPhone, template: 'wa_order_ready', language: 'en', components }),
                });
                const txt = await resp.text().catch(() => null);
                // eslint-disable-next-line no-console
                if (resp.ok) {
                  console.info('WA proxy confirmed wa_order_ready sent', { to: toPhone, status: resp.status, body: txt });
                } else {
                  console.warn('WA proxy error sending wa_order_ready', { to: toPhone, status: resp.status, body: txt });
                }
              } else {
                // No local mapping — fallback to fetching template definition and building params
                try {
                  const tplResp = await fetch(`${waUrl}/api/whatsapp/templates/wa_order_ready?language=en_US`);
                  const tplJson = await tplResp.json().catch(() => null);
                  // eslint-disable-next-line no-console
                  console.info('WA trigger (ready): template definition response:', tplResp.status, tplJson);

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
                  // eslint-disable-next-line no-console
                  console.info('WA trigger (ready): sending fallback payload', { to: toPhone, template: 'wa_order_ready', paramsLength: params.length });

                  const resp = await fetch(`${waUrl}/api/whatsapp/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sendPayload),
                  });
                  if (resp.ok) {
                    const t = await resp.text().catch(() => null);
                    // eslint-disable-next-line no-console
                    console.info('WA proxy confirmed wa_order_ready sent (fallback)', { to: toPhone, status: resp.status, body: t });
                  } else {
                    const bodyText = await resp.text().catch(() => null);
                    // eslint-disable-next-line no-console
                    console.warn('WA proxy returned error for order_ready (fallback):', resp.status, bodyText);
                  }
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.info('WA trigger (ready): proxy unreachable or template fetch failed — skipping WA send', e && e.message ? e.message : e);
                }
              }
            }
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("WhatsApp trigger error (ready_for_pickup):", err);
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
            // eslint-disable-next-line no-console
            console.warn("WA trigger (completed): missing order/customer details", ordErr);
          } else {
            const toPhone = (orderWithCustomer.customer.phone || "").replace(/\D/g, "");
            const waUrl = (import.meta.env.VITE_WA_PROXY_URL as string) || "http://localhost:4001";

            if (!toPhone) {
              // eslint-disable-next-line no-console
              console.info("WA trigger (completed): no customer phone for order", orderWithCustomer.id);
            } else if ((import.meta.env.VITE_DISABLE_WA as string) === "true") {
              // eslint-disable-next-line no-console
              console.info("WA trigger disabled via VITE_DISABLE_WA");
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
                // eslint-disable-next-line no-console
                console.info('WA trigger (completed): sending feedback using mapping', { to: toPhone, paramsLength: params.length });
                const resp = await fetch(`${waUrl}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ to: toPhone, template: 'feedback', language: 'en', components }),
                });
                const txt = await resp.text().catch(() => null);
                // eslint-disable-next-line no-console
                if (resp.ok) {
                  console.info('WA proxy confirmed feedback sent', { to: toPhone, status: resp.status, body: txt });
                } else {
                  console.warn('WA proxy error sending feedback', { to: toPhone, status: resp.status, body: txt });
                }
              } else {
                // fallback: build minimal params
                try {
                  const params = [{ type: 'text', text: orderWithCustomer.customer.name || '' }, { type: 'text', text: 'Required Update' }];
                  const components = [{ type: 'body', parameters: params }];
                  // eslint-disable-next-line no-console
                  console.info('WA trigger (completed): sending feedback fallback', { to: toPhone });
                  const resp = await fetch(`${waUrl}/api/whatsapp/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: toPhone, template: 'feedback', language: 'en', components }),
                  });
                  const txt = await resp.text().catch(() => null);
                  if (resp.ok) console.info('WA proxy confirmed feedback sent (fallback)', { to: toPhone, status: resp.status, body: txt });
                  else console.warn('WA proxy error sending feedback (fallback)', { to: toPhone, status: resp.status, body: txt });
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.info('WA trigger (completed): proxy unreachable or template fetch failed — skipping feedback send', e && e.message ? e.message : e);
                }
              }
            }
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('WhatsApp trigger error (completed):', err);
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
          // eslint-disable-next-line no-console
          console.warn("WA trigger: missing order/customer details", ordErr);
          return;
        }

        const toPhone = (orderWithCustomer.customer.phone || "").replace(/\D/g, "");
        const waUrl = (import.meta.env.VITE_WA_PROXY_URL as string) || "http://localhost:4001";

        if (!toPhone) {
          // eslint-disable-next-line no-console
          console.info("WA trigger: no customer phone for order", orderWithCustomer.id);
          return;
        }

        // If WA is disabled via env, skip sending
        if ((import.meta.env.VITE_DISABLE_WA as string) === "true") {
          // eslint-disable-next-line no-console
          console.info("WA trigger disabled via VITE_DISABLE_WA");
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
          // eslint-disable-next-line no-console
          console.info('WA trigger: sending wa_work_initiation using mapping', { to: toPhone, paramsLength: params.length });
          const resp = await fetch(`${waUrl}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: toPhone, template: 'wa_work_initiation', language: 'en', components }),
          });
          const txt = await resp.text().catch(() => null);
          // eslint-disable-next-line no-console
          console.info('WA proxy response (mapping):', resp.status, txt);
          return;
        }

        // Attempt to fetch the template definition to determine expected params
        try {
          const tplResp = await fetch(`${waUrl}/api/whatsapp/templates/wa_work_initiation?language=en_US`);
          const tplJson = await tplResp.json().catch(() => null);
          // eslint-disable-next-line no-console
          console.info("WA trigger: template definition response:", tplResp.status, tplJson);

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
          // eslint-disable-next-line no-console
          console.info('WA trigger: sending wa_work_initiation', { to: toPhone, expectedParams, paramsLength: params.length });

          const sendPayload = {
            to: toPhone,
            template: 'wa_work_initiation',
            language: 'en',
            components,
          };

          // send once, if Graph API complains about param count, try to parse expected
          const resp = await fetch(`${waUrl}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sendPayload),
          });

          if (resp.ok) {
            const t = await resp.text().catch(() => null);
            // eslint-disable-next-line no-console
            console.info('WA proxy response for work initiation:', resp.status, t);
          } else {
            const bodyText = await resp.text().catch(() => null);
            let parsed = null;
            try {
              parsed = bodyText ? JSON.parse(bodyText) : null;
            } catch (e) {
              parsed = null;
            }
            // eslint-disable-next-line no-console
            console.warn('WA proxy returned error for work initiation:', resp.status, parsed || bodyText);

            // If Graph returned param-mismatch (code 132000), try to extract expected count and retry trimmed params
            const code = parsed?.error?.code ?? parsed?.code;
            const details = parsed?.error?.error_data?.details || parsed?.error?.details || '';
            if (code === 132000 && typeof details === 'string') {
              const m = details.match(/expected number of params \((\d+)\)/i) || details.match(/expected number of params \((\d+)\)/i);
              const expected = m ? Number(m[1]) : null;
              if (expected && expected < params.length) {
                // trim params to expected and resend
                const trimmed = params.slice(0, expected);
                // eslint-disable-next-line no-console
                console.info('WA trigger: retrying with trimmed params length', expected);
                const retryPayload = { ...sendPayload, components: [{ type: 'body', parameters: trimmed }] };
                const retryResp = await fetch(`${waUrl}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(retryPayload),
                });
                const retryText = await retryResp.text().catch(() => null);
                // eslint-disable-next-line no-console
                console.info('WA proxy retry response:', retryResp.status, retryText);
              }
            }
          }
        } catch (e) {
          // Network or proxy-level error — proxy likely unreachable. Log info and skip send.
          // eslint-disable-next-line no-console
          console.info('WA trigger: proxy unreachable or template fetch failed — skipping WA send', e && e.message ? e.message : e);
          return;
        }
      } catch (err) {
        // non-blocking logging
        // eslint-disable-next-line no-console
        console.error("WhatsApp trigger error (in_production):", err);
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
