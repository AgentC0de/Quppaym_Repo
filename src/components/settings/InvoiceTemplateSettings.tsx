import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";

export function InvoiceTemplateSettings() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { settings, isLoading, save } = useSettings("invoice_template");
  const [local, setLocal] = useState(() => ({
    companyName: "Quppayam Boutique",
    companyAddress: "Chennai, India",
    companyPhone: "+91 44 2628 1234",
    companyEmail: "contact@quppayam.com",
    invoicePrefix: "INV-",
    showLogo: true,
    showPaymentTerms: true,
    paymentTerms: "Payment is due within 15 days of invoice date.",
    footerNote: "Thank you for your business!",
    showTaxBreakdown: true,
    logoUrl: "",
  }));

  useEffect(() => {
    if (settings) setLocal((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const handleSave = () => {
    save(local);
  };

  const handleUploadLogo = async (file?: File) => {
    if (!file) return;
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("materials").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("materials").getPublicUrl(fileName);
      setLocal((l) => ({ ...l, logoUrl: data.publicUrl }));
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUploadLogo(f);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Company Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={local.companyName}
              onChange={(e) => setLocal({ ...local, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-phone">Phone</Label>
            <Input
              id="company-phone"
              value={local.companyPhone}
              onChange={(e) => setLocal({ ...local, companyPhone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-email">Email</Label>
            <Input
              id="company-email"
              type="email"
              value={local.companyEmail}
              onChange={(e) => setLocal({ ...local, companyEmail: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-prefix">Invoice Number Prefix</Label>
            <Input
              id="invoice-prefix"
              value={local.invoicePrefix}
              onChange={(e) => setLocal({ ...local, invoicePrefix: e.target.value })}
              placeholder="INV-"
            />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <Label htmlFor="company-address">Address</Label>
          <Textarea
            id="company-address"
            value={local.companyAddress}
            onChange={(e) => setLocal({ ...local, companyAddress: e.target.value })}
            rows={2}
          />
        </div>
        <div className="mt-4">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-3 mt-2">
            {local.logoUrl ? (
              <img src={local.logoUrl} alt="logo" className="h-12 w-24 object-contain" />
            ) : (
              <div className="h-12 w-24 rounded bg-muted flex items-center justify-center text-sm text-muted-foreground">No logo</div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Upload Logo</Button>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-4">Invoice Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show Logo</p>
              <p className="text-xs text-muted-foreground">Display company logo on invoices</p>
            </div>
            <Switch
              checked={local.showLogo}
              onCheckedChange={(checked) => setLocal({ ...local, showLogo: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show Tax Breakdown</p>
              <p className="text-xs text-muted-foreground">Display tax details separately</p>
            </div>
            <Switch
              checked={local.showTaxBreakdown}
              onCheckedChange={(checked) => setLocal({ ...local, showTaxBreakdown: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show Payment Terms</p>
              <p className="text-xs text-muted-foreground">Include payment terms on invoice</p>
            </div>
            <Switch
              checked={local.showPaymentTerms}
              onCheckedChange={(checked) => setLocal({ ...local, showPaymentTerms: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-4">Custom Text</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-terms">Payment Terms</Label>
            <Textarea
              id="payment-terms"
              value={local.paymentTerms}
              onChange={(e) => setLocal({ ...local, paymentTerms: e.target.value })}
              rows={2}
              placeholder="Payment is due within 15 days..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer-note">Footer Note</Label>
            <Input
              id="footer-note"
              value={local.footerNote}
              onChange={(e) => setLocal({ ...local, footerNote: e.target.value })}
              placeholder="Thank you for your business!"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Preview</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setLocal({
            companyName: "Quppayam Boutique",
            companyAddress: "Chennai, India",
            companyPhone: "+91 44 2628 1234",
            companyEmail: "contact@quppayam.com",
            invoicePrefix: "INV-",
            showLogo: true,
            showPaymentTerms: true,
            paymentTerms: "Payment is due within 15 days of invoice date.",
            footerNote: "Thank you for your business!",
            showTaxBreakdown: true,
            logoUrl: "",
          })}}>Reset</Button>
          <Button onClick={handleSave}>Save Template Settings</Button>
        </div>
      </div>

      {/* Live preview box */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {local.showLogo && local.logoUrl && (
              <img src={local.logoUrl} alt="logo" className="h-10 object-contain" />
            )}
            <div>
              <div className="font-display text-lg font-semibold">{local.companyName}</div>
              <div className="text-xs text-muted-foreground">{local.companyAddress}</div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div>Invoice</div>
            <div className="text-muted-foreground">{local.invoicePrefix}0001</div>
          </div>
        </div>
        {local.showPaymentTerms && (
          <p className="mt-3 text-xs text-muted-foreground">{local.paymentTerms}</p>
        )}
      </div>
    </div>
  );
}
