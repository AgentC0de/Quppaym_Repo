import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Bell, Shield, MessageSquare, CreditCard, ListOrdered, Crown, FileText, Ruler } from "lucide-react";
import { OrderStatusSettings } from "@/components/settings/OrderStatusSettings";
import { VipStatusSettings } from "@/components/settings/VipStatusSettings";
import { InvoiceTemplateSettings } from "@/components/settings/InvoiceTemplateSettings";
import { MeasurementTemplateSettings } from "@/components/settings/MeasurementTemplateSettings";

const Settings = () => {
  return (
    <AppLayout title="Settings" subtitle="Configure your boutique management system">
      <div className="max-w-4xl">
        <Accordion type="single" collapsible defaultValue="business" className="space-y-4">
          {/* Business Settings */}
          <AccordionItem value="business" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Business Information
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Basic details about your boutique
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input id="business-name" defaultValue="Quppayam Boutique" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-phone">Phone Number</Label>
                  <Input id="business-phone" defaultValue="+91 44 2628 1234" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-email">Email Address</Label>
                  <Input id="business-email" type="email" defaultValue="contact@quppayam.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue="inr">
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="usd">US Dollar ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Order Status Settings */}
          <AccordionItem value="order-status" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ListOrdered className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Order Status Options
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Customize order workflow statuses
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <OrderStatusSettings />
            </AccordionContent>
          </AccordionItem>

          {/* VIP Status Settings */}
          <AccordionItem value="vip-status" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    VIP Status Options
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Customize VIP tier labels and display order
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <VipStatusSettings />
            </AccordionContent>
          </AccordionItem>

          {/* Invoice Template Settings */}
          <AccordionItem value="invoice" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Invoice Template
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Customize invoice layout and content
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <InvoiceTemplateSettings />
            </AccordionContent>
          </AccordionItem>

          {/* Notification Settings */}
          <AccordionItem value="notifications" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline opacity-80 cursor-not-allowed pointer-events-none">
              <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Notifications
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure how you receive updates
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Requires Update
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when inventory runs low
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">New Order Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for new orders
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Fitting Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Daily digest of upcoming fittings
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* WhatsApp Integration */}
          <AccordionItem value="whatsapp" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline opacity-80 cursor-not-allowed pointer-events-none">
              <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      WhatsApp Integration
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure customer messaging via WhatsApp Business API
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Requires Update
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Connect your WhatsApp Business account to enable automated customer notifications.
                </p>
                <Button className="mt-4" variant="outline">
                  Connect WhatsApp Business
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* User Roles */}
          <AccordionItem value="roles" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline opacity-80 cursor-not-allowed pointer-events-none">
              <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      User Roles & Permissions
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Manage access levels for your team
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Requires Update
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-3">
                {[
                  { role: "Admin", users: 2, description: "Full access to all features" },
                  { role: "Store Manager", users: 3, description: "Manage orders, customers, and staff" },
                  { role: "Sales Associate", users: 5, description: "Create orders and manage customers" },
                  { role: "Tailor", users: 4, description: "View assigned orders and update status" },
                ].map((role) => (
                  <div
                    key={role.role}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{role.role}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{role.users} users</span>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Billing */}
          <AccordionItem value="billing" className="card-luxury border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline opacity-80 cursor-not-allowed pointer-events-none">
              <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Billing & Subscription
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your subscription and payment methods
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Requires Update
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Premium Plan</p>
                    <p className="text-sm text-muted-foreground">
                      Unlimited stores • Advanced analytics • Priority support
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold text-foreground">₹4,999</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </AppLayout>
  );
};

export default Settings;
