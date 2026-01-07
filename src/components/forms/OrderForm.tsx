import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { formatToE164 } from "@/lib/phone";
import { waFetch } from "@/lib/wa";
import { waInfo, waWarn, waError } from "@/lib/logger";
import { CalendarIcon, Plus, Trash2, AlertCircle, Search, Barcode, Package } from "lucide-react";
import { ScannerDialog } from "@/components/dialogs/ScannerDialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrders } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useStores } from "@/hooks/useStores";
import { useEmployees } from "@/hooks/useEmployees";
import { useInventory } from "@/hooks/useInventory";
import { useMeasurements } from "@/hooks/useMeasurements";
import { MeasurementForm } from "./MeasurementForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Order item type for internal state
interface OrderItem {
  id: string;
  inventoryId: string | null;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  isCustomWork: boolean;
  measurementId: string | null;
}

const orderSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  storeId: z.string().min(1, "Please select a store"),
  dueDate: z.date({ required_error: "Due date is required" }),
  notes: z.string().trim().max(1000).optional(),
  assigneeId: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const defaultValues: OrderFormData = {
  customerId: "",
  storeId: "",
  dueDate: undefined as unknown as Date,
  notes: "",
  assigneeId: "",
};

export function OrderForm({ trigger, onSuccess }: OrderFormProps) {
  const [open, setOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMeasurementPrompt, setShowMeasurementPrompt] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [showAnotherMeasurementPrompt, setShowAnotherMeasurementPrompt] = useState(false);
  const [createdOrderCustomerId, setCreatedOrderCustomerId] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const { toast } = useToast();
  const { createOrder, orders } = useOrders();
  const { customers } = useCustomers();
  const { stores } = useStores();
  const { activeEmployees } = useEmployees();
  const { inventory } = useInventory();
  const { measurements } = useMeasurements();

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues,
  });

  const selectedCustomerId = form.watch("customerId");

  // Customer measurements are now linked to orders, not customers directly
  // This section is kept for backward compatibility
  const customerMeasurements: never[] = [];

  // Get outstanding balances for selected customer
  const customerOutstandingOrders = selectedCustomerId
    ? orders.filter(
        (o) =>
          o.customer_id === selectedCustomerId &&
          !["completed", "cancelled"].includes(o.status) &&
          Number(o.remaining_balance) > 0
      )
    : [];

  const previousBalance = customerOutstandingOrders.reduce(
    (sum, o) => sum + Number(o.remaining_balance),
    0
  );

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Filter inventory based on search query
  const filteredInventory = inventory.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  // Reset form when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(defaultValues);
      setOrderItems([]);
      setSearchQuery("");
    }
    setOpen(isOpen);
  };

  const handleCancel = () => {
    form.reset(defaultValues);
    setOrderItems([]);
    setSearchQuery("");
    setOpen(false);
  };

  // Add product from inventory
  const handleAddProduct = (inventoryItem: typeof inventory[0]) => {
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      inventoryId: inventoryItem.id,
      name: inventoryItem.name,
      sku: inventoryItem.sku,
      price: Number(inventoryItem.price),
      quantity: 1,
      isCustomWork: false,
      measurementId: null,
    };
    
    setOrderItems([...orderItems, newItem]);
    setShowProductSearch(false);
    setSearchQuery("");
  };

  // Add custom item (not from inventory)
  const handleAddCustomItem = () => {
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      inventoryId: null,
      name: searchQuery || "Custom Item",
      sku: "",
      price: 0,
      quantity: 1,
      isCustomWork: true,
      measurementId: null,
    };
    
    setOrderItems([...orderItems, newItem]);
    setShowProductSearch(false);
    setSearchQuery("");
  };

  // Try add product by query (used by Enter key or scanner)
  const tryAddByQuery = (raw: string) => {
    const q = (raw || "").trim();
    if (!q) return;

    // Try exact SKU match
    const found = inventory.find((it) => (it.sku || "").toLowerCase() === q.toLowerCase());
    let itemToAdd = found;

    if (!itemToAdd) {
      const matches = inventory.filter((it) => {
        const sku = (it.sku || "").toLowerCase();
        const name = (it.name || "").toLowerCase();
        return sku.includes(q.toLowerCase()) || name.includes(q.toLowerCase());
      });
      if (matches.length === 1) itemToAdd = matches[0];
    }

    if (itemToAdd) {
      handleAddProduct(itemToAdd);
      toast({ title: 'Added', description: `${itemToAdd.name} added to order` });
      setSearchQuery("");
      return;
    }

    // If no item found, notify
    toast({ title: 'Not found', description: `No product found for SKU "${q}"` });
  };

  const [showScanner, setShowScanner] = useState(false);

  // Handle measurement requirement response (after order creation)
  const handleMeasurementRequired = (required: boolean) => {
    setShowMeasurementPrompt(false);
    if (required) {
      setShowMeasurementForm(true);
    } else {
      // Done, close everything
      setCreatedOrderCustomerId(null);
      setCreatedOrderId(null);
      onSuccess?.();
    }
  };

  // Handle measurement form completion - link measurement to order
  const handleMeasurementComplete = async (measurementId?: string) => {
    setShowMeasurementForm(false);
    
    // If we have both a measurement and order ID, link them
    if (measurementId && createdOrderId) {
      const { error } = await supabase
        .from("orders")
        .update({ measurement_id: measurementId })
        .eq("id", createdOrderId);
      
      if (error) {
        toast({
          title: "Warning",
          description: "Failed to link measurement to order.",
          variant: "destructive",
        });
      }
    }
    
    setShowAnotherMeasurementPrompt(true);
  };

  // Handle "another measurement" response
  const handleAnotherMeasurement = (addAnother: boolean) => {
    setShowAnotherMeasurementPrompt(false);
    if (addAnother) {
      setShowMeasurementForm(true);
    } else {
      // Done with measurements
      setCreatedOrderCustomerId(null);
      setCreatedOrderId(null);
      onSuccess?.();
    }
  };

  // Remove item from order
  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId));
  };

  // Update item quantity
  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setOrderItems(
      orderItems.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  // Update item price (for custom items)
  const handleUpdatePrice = (itemId: string, price: number) => {
    setOrderItems(
      orderItems.map((item) =>
        item.id === itemId ? { ...item, price: Math.max(0, price) } : item
      )
    );
  };

  const submitOrder = async (data: OrderFormData, isDraft: boolean) => {
    if (orderItems.length === 0 && !isDraft) {
      return;
    }

    createOrder.mutate(
      {
        customer_id: data.customerId,
        store_id: data.storeId || null,
        assigned_employee_id: data.assigneeId || null,
        due_date: data.dueDate ? format(data.dueDate, "yyyy-MM-dd") : null,
        deposit_amount: 0,
        total_amount: totalAmount,
        remaining_balance: totalAmount,
        notes: data.notes || null,
        order_number: "", // Will be auto-generated by database trigger
        status: isDraft ? "draft" : "pending",
      },
      {
        onSuccess: async (createdOrder) => {
          // Insert order items if order was created successfully
          if (createdOrder && orderItems.length > 0) {
            const orderItemsToInsert = orderItems.map((item) => ({
              order_id: createdOrder.id,
              description: item.name,
              unit_price: item.price,
              quantity: item.quantity,
              total_price: item.price * item.quantity,
              inventory_id: item.inventoryId,
              measurement_id: item.measurementId,
              is_custom_work: item.isCustomWork,
            }));

            const { error } = await supabase
              .from("order_items")
              .insert(orderItemsToInsert);

            if (error) {
              toast({
                title: "Warning",
                description: "Order created but failed to add some items.",
                variant: "destructive",
              });
            }
              // After items are inserted, send WhatsApp order confirmation including items
              try {
                // Fetch customer details
                const { data: customer } = await supabase
                  .from("customers")
                  .select("name, phone")
                  .eq("id", createdOrder.customer_id)
                  .single();

                const itemsList = orderItems
                  .map((it) => `${it.name} x ${it.quantity}`)
                  .join("; ") || "-";

                const orderDate = createdOrder.created_at
                  ? format(new Date(createdOrder.created_at), "yyyy-MM-dd")
                  : "";

                // Prefer local proxy when developing on localhost
                function getWaUrl() {
                  const envUrl = import.meta.env.VITE_WA_PROXY_URL || "";
                  const forceRemote = (import.meta.env.VITE_WA_FORCE_REMOTE as string) === "true";
                  if (!forceRemote && import.meta.env.DEV && typeof window !== "undefined") {
                    const host = window.location.hostname;
                    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4001";
                  }
                  return envUrl || "http://localhost:4001";
                }
                const waUrl = getWaUrl();

                if (customer && customer.phone) {
                  const components = [
                    {
                      type: "body",
                      parameters: [
                        { type: "text", text: customer.name },
                        { type: "text", text: createdOrder.order_number },
                        { type: "text", text: orderDate },
                        { type: "text", text: itemsList },
                        { type: "text", text: createdOrder.due_date ?? "" },
                        { type: "text", text: createdOrder.is_settled ? "Paid" : "Pending" },
                      ],
                    },
                  ];

                  const rawPhone = customer.phone || "";
                  const toPhone = formatToE164(rawPhone);
                  if (!toPhone) {
                    waInfo('OrderForm: skipping WA send, invalid phone', { rawPhone, orderId: createdOrder.id });
                  } else {
                    try {
                      await waFetch(`${waUrl}/api/whatsapp/send`, {
                        method: "POST",
                        body: JSON.stringify({
                          to: toPhone,
                          template: "order_confirmation",
                          language: "en",
                          components,
                        }),
                      });
                      waInfo('order_confirmation sent', { to: toPhone, orderId: createdOrder.id });
                    } catch (err) {
                      waWarn('order_confirmation send failed', { err: err && err.message ? err.message : err });
                    }
                  }
                }
              } catch (err) {
                // don't block user flow; just log
                waError('WhatsApp send error', err && err.message ? err.message : err);
              }
          }
          
          // Close the order form first
          form.reset(defaultValues);
          setOrderItems([]);
          setOpen(false);
          
          // Store order and customer ID for measurement linking
          setCreatedOrderId(createdOrder.id);
          setCreatedOrderCustomerId(data.customerId);
          setShowMeasurementPrompt(true);
          setShowMeasurementPrompt(true);
        },
      }
    );
  };

  const onSubmit = (data: OrderFormData) => {
    if (orderItems.length === 0) {
      return;
    }
    submitOrder(data, false);
  };

  const handleSaveAsDraft = () => {
    const data = form.getValues();
    // For drafts, only customer is required
    if (!data.customerId) {
      form.setError("customerId", { message: "Please select a customer" });
      return;
    }
    submitOrder(data, true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Order</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Create New Order</DialogTitle>
            <DialogDescription>
              Add order details, items, and payment information.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer & Store Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select store" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Previous Outstanding Balance Info */}
              {selectedCustomerId && previousBalance > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">Previous Outstanding Balance</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        This customer has an outstanding balance of <span className="font-semibold">₹{previousBalance.toLocaleString()}</span> from previous orders:
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-400">
                        {customerOutstandingOrders.map((o) => (
                          <div key={o.id} className="flex justify-between">
                            <span>{o.order_number}</span>
                            <span>₹{Number(o.remaining_balance).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Due Date & Assignee - Moved above Order Items */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Order Items / Products Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Order Items *</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProductSearch(true)}
                    disabled={!selectedCustomerId}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Item
                  </Button>
                </div>

                {!selectedCustomerId && (
                  <p className="text-sm text-muted-foreground">Select a customer first to add items</p>
                )}

                {orderItems.length === 0 && selectedCustomerId && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No items added yet</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowProductSearch(true)}
                      className="mt-2"
                    >
                      Add your first item
                    </Button>
                  </div>
                )}

                {orderItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.isCustomWork && (
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                          )}
                          {item.measurementId && (
                            <Badge variant="outline" className="text-xs">Has Measurement</Badge>
                          )}
                        </div>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Price (₹)</label>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value))}
                          className="mt-1"
                          disabled={!item.isCustomWork && item.inventoryId !== null}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Total</label>
                        <p className="mt-1 py-2 font-medium">₹{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {orderItems.length === 0 && selectedCustomerId && (
                  <p className="text-sm text-destructive">Add at least one item</p>
                )}
              </div>

              {/* Payment Summary */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="mb-3 font-medium text-foreground">Payment Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order Total</span>
                    <span className="font-medium text-foreground">₹{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-sm">
                    <span className="font-medium text-foreground">Balance Payable</span>
                    <span className={cn("font-semibold", totalAmount > 0 ? "text-amber-600" : "text-emerald-600")}>
                      ₹{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Special instructions, fabric preferences, etc..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleSaveAsDraft}
                  disabled={createOrder.isPending}
                >
                  Save as Draft
                </Button>
                <Button type="submit" disabled={createOrder.isPending || orderItems.length === 0}>
                  {createOrder.isPending ? "Creating..." : "Create Order"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ScannerDialog
        open={showScanner}
        onOpenChange={setShowScanner}
        onDetected={(code) => tryAddByQuery(code)}
      />

      {/* Product Search Dialog */}
      <Dialog open={showProductSearch} onOpenChange={setShowProductSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Search by name or scan SKU code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or enter SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  tryAddByQuery(searchQuery);
                }}
                className="pl-9 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground"
                aria-label="Open scanner"
              >
                <Barcode className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddProduct(item)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.sku} • {item.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{Number(item.price).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.quantity}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No products found</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomItem}
                  >
                    Add as Custom Item
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Start typing to search products
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Measurement Required Prompt - After Order Creation */}
      <AlertDialog open={showMeasurementPrompt} onOpenChange={setShowMeasurementPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Measurements?</AlertDialogTitle>
            <AlertDialogDescription>
              Order created successfully! Would you like to add measurements for this order?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleMeasurementRequired(false)}>
              No, Skip
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleMeasurementRequired(true)}>
              Yes, Add Measurement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Measurement Form Dialog */}
      <MeasurementForm
        open={showMeasurementForm}
        onOpenChange={(isOpen) => {
          setShowMeasurementForm(isOpen);
          if (!isOpen) {
            // If form was closed without completing, ask if they want to add another
            setShowAnotherMeasurementPrompt(true);
          }
        }}
        defaultOrderId={createdOrderId || ""}
        onSuccess={(measurementId) => {
          handleMeasurementComplete(measurementId);
        }}
      />

      {/* Another Measurement Prompt */}
      <AlertDialog open={showAnotherMeasurementPrompt} onOpenChange={setShowAnotherMeasurementPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Another Measurement?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add another measurement profile for this order?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleAnotherMeasurement(false)}>
              No, Done
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAnotherMeasurement(true)}>
              Yes, Add Another
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
