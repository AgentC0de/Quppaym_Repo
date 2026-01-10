import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Crown, Phone, Mail, MapPin, Pencil, Trash2, AlertCircle, ShoppingBag, Package } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  vip_status: z.enum(["regular", "silver", "gold", "platinum"]),
  discount_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerViewDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerViewDialog({ customer, open, onOpenChange }: CustomerViewDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { updateCustomer, deleteCustomer } = useCustomers();
  const { orders } = useOrders();
  const { toast } = useToast();

  // Get all orders for this customer
  const customerOrders = useMemo(() => {
    if (!customer) return [];
    return orders.filter((o) => o.customer_id === customer.id);
  }, [customer, orders]);

  // Calculate outstanding balance for this customer
  const customerOutstanding = useMemo(() => {
    const outstandingOrders = customerOrders.filter(
      (o) =>
        !["completed", "cancelled"].includes(o.status) &&
        Number(o.remaining_balance) > 0
    );
    
    const total = outstandingOrders.reduce(
      (sum, o) => sum + Number(o.remaining_balance),
      0
    );
    
    return { total, orders: outstandingOrders };
  }, [customerOrders]);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    values: customer ? {
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      vip_status: customer.vip_status,
      discount_percentage: customer.discount_percentage || 0,
      notes: customer.notes || "",
    } : undefined,
  });

  const handleClose = () => {
    setIsEditing(false);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = (data: CustomerFormData) => {
    if (!customer) return;
    updateCustomer.mutate(
      {
        id: customer.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        vip_status: data.vip_status,
        discount_percentage: data.discount_percentage || null,
        notes: data.notes || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!customer) return;
    deleteCustomer.mutate(customer.id, {
      onSuccess: () => {
        setShowDeleteAlert(false);
        handleClose();
      },
    });
  };

  // Cascade-delete related data (order_items, payment_history, measurements, measurement_versions, orders)
  const handleDeleteCascade = async () => {
    if (!customer) return;
    try {
      const orderIds = customerOrders.map((o) => o.id);

      if (orderIds.length > 0) {
        // delete order items
        const { error: oiErr } = await supabase.from("order_items").delete().in("order_id", orderIds);
        if (oiErr) throw oiErr;

        // delete payment history
        const { error: phErr } = await supabase.from("payment_history").delete().in("order_id", orderIds);
        if (phErr) throw phErr;

        // fetch measurements for these orders
        const { data: measurementsData, error: mErr } = await supabase
          .from("measurements")
          .select("id")
          .in("order_id", orderIds);
        if (mErr) throw mErr;
        const measurementIds = (measurementsData || []).map((m: any) => m.id);

        if (measurementIds.length > 0) {
          // delete measurement_versions referencing these measurements
          const { error: mvErr } = await supabase.from("measurement_versions").delete().in("measurement_id", measurementIds);
          if (mvErr) throw mvErr;

          // delete measurements
          const { error: mdelErr } = await supabase.from("measurements").delete().in("id", measurementIds);
          if (mdelErr) throw mdelErr;
        }

        // delete orders
        const { error: oErr } = await supabase.from("orders").delete().in("id", orderIds);
        if (oErr) throw oErr;
      }

      // finally delete customer
      const { error: cErr } = await supabase.from("customers").delete().eq("id", customer.id);
      if (cErr) throw cErr;

      toast({ title: "Customer deleted", description: "Customer and related data removed." });
      setShowDeleteAlert(false);
      handleClose();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    }
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
                {customer.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-display">{customer.name}</DialogTitle>
                  {customer.vip_status !== "regular" && (
                    <Crown className="h-4 w-4 text-gold" />
                  )}
                </div>
                <DialogDescription>
                  Customer since {format(new Date(customer.created_at), "MMM d, yyyy")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="vip_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VIP Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discount_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateCustomer.isPending}>
                    {updateCustomer.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {(customer.address || customer.city) && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{[customer.address, customer.city].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <span className={`status-badge ${
                    customer.vip_status === "platinum" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" :
                    customer.vip_status === "gold" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                    customer.vip_status === "silver" ? "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400" :
                    "bg-secondary text-secondary-foreground"
                  }`}>
                    {customer.vip_status}
                  </span>
                  {customer.discount_percentage && customer.discount_percentage > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {customer.discount_percentage}% discount
                    </span>
                  )}
                </div>

                {customer.notes && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm text-muted-foreground">{customer.notes}</p>
                  </div>
                )}

                {/* Outstanding Balance Section */}
                {customerOutstanding.total > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-700 dark:text-amber-400">Outstanding Balance</span>
                    </div>
                    <div className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                      ₹{customerOutstanding.total.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Related Orders Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Orders ({customerOrders.length})</span>
                  </div>
                  
                  {customerOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground rounded-lg border border-dashed">
                      <Package className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No orders yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {customerOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{order.order_number}</span>
                              <OrderStatusBadge status={order.status} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{format(new Date(order.created_at), "MMM d, yyyy")}</span>
                              {order.due_date && (
                                <span>Due: {format(new Date(order.due_date), "MMM d")}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{Number(order.total_amount).toLocaleString()}</div>
                            {order.status === "cancelled" ? (
                              // Cancelled orders: show settlement status
                              order.is_settled ? (
                                Number(order.deposit_amount) > 0 ? (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    Refunded & Settled
                                  </div>
                                ) : (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    Settled
                                  </div>
                                )
                              ) : Number(order.deposit_amount) > 0 ? (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  Refund: ₹{Number(order.deposit_amount).toLocaleString()}
                                </div>
                              ) : null
                            ) : Number(order.remaining_balance) === 0 && Number(order.total_amount) > 0 ? (
                              // Fully paid orders
                              <div className="text-xs text-green-600 dark:text-green-400">
                                Payment Received
                              </div>
                            ) : Number(order.remaining_balance) > 0 ? (
                              // Outstanding balance
                              <div className="text-xs text-amber-600 dark:text-amber-400">
                                Due: ₹{Number(order.remaining_balance).toLocaleString()}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAlert(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="max-w-sm p-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Customer</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {customerOrders.length > 0 ? (
                <>Deleting <strong>{customer.name}</strong> requires removing <strong>{customerOrders.length}</strong> related order(s). Choose a cascade delete to remove related data.</>
              ) : (
                <>Are you sure you want to delete <strong>{customer.name}</strong>? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCascade}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete and Cascade
              </AlertDialogAction>
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Note:</strong> Cascade will delete related order items, payments, measurements, and orders before removing the customer.
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}