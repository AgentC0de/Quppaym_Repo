import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export function InvoiceTemplateSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
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
  });

  const handleSave = () => {
    // In a real implementation, this would save to the database
    toast({
      title: "Settings saved",
      description: "Invoice template settings have been updated.",
    });
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
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-phone">Phone</Label>
            <Input
              id="company-phone"
              value={settings.companyPhone}
              onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-email">Email</Label>
            <Input
              id="company-email"
              type="email"
              value={settings.companyEmail}
              onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-prefix">Invoice Number Prefix</Label>
            <Input
              id="invoice-prefix"
              value={settings.invoicePrefix}
              onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
              placeholder="INV-"
            />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <Label htmlFor="company-address">Address</Label>
          <Textarea
            id="company-address"
            value={settings.companyAddress}
            onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
            rows={2}
          />
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
              checked={settings.showLogo}
              onCheckedChange={(checked) => setSettings({ ...settings, showLogo: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show Tax Breakdown</p>
              <p className="text-xs text-muted-foreground">Display tax details separately</p>
            </div>
            <Switch
              checked={settings.showTaxBreakdown}
              onCheckedChange={(checked) => setSettings({ ...settings, showTaxBreakdown: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show Payment Terms</p>
              <p className="text-xs text-muted-foreground">Include payment terms on invoice</p>
            </div>
            <Switch
              checked={settings.showPaymentTerms}
              onCheckedChange={(checked) => setSettings({ ...settings, showPaymentTerms: checked })}
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
              value={settings.paymentTerms}
              onChange={(e) => setSettings({ ...settings, paymentTerms: e.target.value })}
              rows={2}
              placeholder="Payment is due within 15 days..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer-note">Footer Note</Label>
            <Input
              id="footer-note"
              value={settings.footerNote}
              onChange={(e) => setSettings({ ...settings, footerNote: e.target.value })}
              placeholder="Thank you for your business!"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Template Settings</Button>
      </div>
    </div>
  );
}
