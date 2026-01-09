import { format } from "date-fns";
import { FileText, Download, Printer, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useOrderItems } from "@/hooks/useOrderItems";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  customer?: { id: string; name: string; phone: string; email?: string | null; address?: string | null } | null;
  store?: { id: string; name: string; address?: string; phone?: string | null; email?: string | null } | null;
};

interface InvoiceViewDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceViewDialog({ order, open, onOpenChange }: InvoiceViewDialogProps) {
  const { items: orderItems } = useOrderItems(order?.id);
  const { netReceived } = usePaymentHistory(order?.id);
  const { toast } = useToast();
  const { settings: templateSettings } = useSettings("invoice_template");

  if (!order) return null;

  const remainingBalance = Number(order.total_amount) - netReceived;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Error", description: "Please allow popups to print invoice", variant: "destructive" });
      return;
    }

    const itemsHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${Number(item.unit_price).toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${Number(item.total_price).toLocaleString()}</td>
      </tr>
    `).join("");

    const companyName = templateSettings?.companyName || "Quppayam Boutique";
    const companyAddress = templateSettings?.companyAddress || (order.store?.address || "Chennai, India");
    const companyPhone = templateSettings?.companyPhone || (order.store?.phone || "");
    const footerNote = templateSettings?.footerNote || "Thank you for your business!";
    const showLogo = templateSettings?.showLogo ?? true;
    const logoUrl = templateSettings?.logoUrl || "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.order_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1f2937; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company { }
            .company h1 { font-size: 24px; color: #7c3aed; margin-bottom: 8px; }
            .company p { color: #6b7280; font-size: 14px; }
            .invoice-info { text-align: right; }
            .invoice-info h2 { font-size: 28px; color: #1f2937; margin-bottom: 8px; }
            .invoice-info p { color: #6b7280; font-size: 14px; }
            .addresses { display: flex; justify-content: space-between; margin-bottom: 32px; }
            .address { }
            .address-label { font-size: 12px; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; }
            .address p { font-size: 14px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; padding: 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280; }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
            th:nth-child(2) { text-align: center; }
            .totals { margin-left: auto; width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .totals-row.total { font-size: 18px; font-weight: 600; border-top: 2px solid #1f2937; padding-top: 12px; margin-top: 8px; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
            .status.paid { background: #d1fae5; color: #065f46; }
            .status.partial { background: #fef3c7; color: #92400e; }
            .status.unpaid { background: #fee2e2; color: #991b1b; }
            .footer { margin-top: 48px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">
              ${showLogo && logoUrl ? `<div style="display:flex;align-items:center;gap:12px;"><img src="${logoUrl}" style="height:48px;object-fit:contain;"/><h1 style="margin:0;font-size:20px;color:#7c3aed;">${companyName}</h1></div>` : `<h1>${companyName}</h1>`}
              <p>${companyAddress}</p>
              <p>${companyPhone}</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>#${order.order_number}</strong></p>
              <p>Date: ${format(new Date(order.created_at), "PPP")}</p>
              ${order.due_date ? `<p>Due: ${format(new Date(order.due_date), "PPP")}</p>` : ""}
            </div>
          </div>

          <div class="addresses">
            <div class="address">
              <p class="address-label">Bill To</p>
              <p><strong>${order.customer?.name || "Customer"}</strong></p>
              <p>${order.customer?.phone || ""}</p>
              ${order.customer?.email ? `<p>${order.customer.email}</p>` : ""}
              ${order.customer?.address ? `<p>${order.customer.address}</p>` : ""}
            </div>
            <div class="address" style="text-align: right;">
              <p class="address-label">Payment Status</p>
              <span class="status ${remainingBalance <= 0 ? 'paid' : netReceived > 0 ? 'partial' : 'unpaid'}">
                ${remainingBalance <= 0 ? 'Paid' : netReceived > 0 ? 'Partially Paid' : 'Unpaid'}
              </span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || '<tr><td colspan="4" style="padding: 24px; text-align: center; color: #9ca3af;">No items</td></tr>'}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>₹${Number(order.subtotal).toLocaleString()}</span>
            </div>
            ${Number(order.tax_amount) > 0 ? `
              <div class="totals-row">
                <span>Tax</span>
                <span>₹${Number(order.tax_amount).toLocaleString()}</span>
              </div>
            ` : ""}
            ${Number(order.discount_amount) > 0 ? `
              <div class="totals-row">
                <span>Discount</span>
                <span style="color: #059669;">-₹${Number(order.discount_amount).toLocaleString()}</span>
              </div>
            ` : ""}
            <div class="totals-row total">
              <span>Total</span>
              <span>₹${Number(order.total_amount).toLocaleString()}</span>
            </div>
            ${netReceived > 0 ? `
              <div class="totals-row" style="color: #059669;">
                <span>Amount Paid</span>
                <span>₹${netReceived.toLocaleString()}</span>
              </div>
            ` : ""}
            ${remainingBalance > 0 ? `
              <div class="totals-row" style="color: #dc2626; font-weight: 600;">
                <span>Balance Due</span>
                <span>₹${remainingBalance.toLocaleString()}</span>
              </div>
            ` : ""}
          </div>

          <div class="footer">
            <p>${footerNote}</p>
          </div>

          <div class="no-print" style="margin-top: 24px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 24px; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Print / Save as PDF
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-display">Invoice #{order.order_number}</DialogTitle>
              <DialogDescription>
                Created {format(new Date(order.created_at), "PPP")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Customer & Store Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">BILL TO</p>
                <p className="font-medium">{order.customer?.name}</p>
                <p className="text-sm text-muted-foreground">{order.customer?.phone}</p>
                {order.customer?.email && (
                  <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                )}
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">FROM</p>
                <p className="font-medium">{order.store?.name || "Quppayam Boutique"}</p>
                {order.store?.address && (
                  <p className="text-sm text-muted-foreground">{order.store.address}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orderItems.length > 0 ? (
                    orderItems.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">₹{Number(item.unit_price).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">₹{Number(item.total_price).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No items in this order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{Number(order.subtotal).toLocaleString()}</span>
                </div>
                {Number(order.tax_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>₹{Number(order.tax_amount).toLocaleString()}</span>
                  </div>
                )}
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-emerald-600">-₹{Number(order.discount_amount).toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{Number(order.total_amount).toLocaleString()}</span>
                </div>
                {netReceived > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Paid</span>
                    <span>₹{netReceived.toLocaleString()}</span>
                  </div>
                )}
                {remainingBalance > 0 && (
                  <div className="flex justify-between text-sm font-medium text-amber-600">
                    <span>Balance Due</span>
                    <span>₹{remainingBalance.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
