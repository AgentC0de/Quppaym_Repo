import { useState } from "react";
import { format } from "date-fns";
import { Crown, Phone, Calendar, Store, User, Trash2, CreditCard, RotateCcw, Plus, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronUp, Package, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { useOrders } from "@/hooks/useOrders";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import { useOrderItems } from "@/hooks/useOrderItems";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

interface OrderViewDialogProps {
  order: (Order & {
    customer?: { id: string; name: string; phone: string; vip_status: string } | null;
    store?: { id: string; name: string } | null;
    assigned_employee?: { id: string; name: string } | null;
  }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderViewDialog({ order, open, onOpenChange }: OrderViewDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showOrderItems, setShowOrderItems] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const { updateOrder, deleteOrder } = useOrders();
  const { payments, recordPayment, netReceived } = usePaymentHistory(order?.id);
  const { items: orderItems } = useOrderItems(order?.id);

  const handleClose = () => {
    onOpenChange(false);
    setShowPaymentForm(false);
    setShowRefundForm(false);
    setShowOrderItems(true);
    setPaymentAmount("");
    setRefundAmount("");
  };

  const isCancelled = order?.status === "cancelled";
  const isSettled = order?.is_settled ?? false;

  const handleMarkAsSettled = () => {
    if (!order) return;
    updateOrder.mutate({ id: order.id, is_settled: true });
  };

  const handleRecordPayment = () => {
    if (!order) return;
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) return;

    const newTotalReceived = netReceived + amount;
    const totalAmount = Number(order.total_amount);
    const remainingBalance = Math.max(0, totalAmount - newTotalReceived);

    recordPayment.mutate(
      { orderId: order.id, amount, paymentType: "payment" },
      {
        onSuccess: () => {
          updateOrder.mutate({
            id: order.id,
            deposit_amount: newTotalReceived,
            remaining_balance: remainingBalance,
          });
          setShowPaymentForm(false);
          setPaymentAmount("");
        },
      }
    );
  };

  const handleRecordRefund = () => {
    if (!order) return;
    const amount = parseFloat(refundAmount) || 0;
    if (amount <= 0) return;

    const newNetReceived = Math.max(0, netReceived - amount);
    const totalAmount = Number(order.total_amount);
    const remainingBalance = Math.max(0, totalAmount - newNetReceived);

    recordPayment.mutate(
      { orderId: order.id, amount, paymentType: "refund" },
      {
        onSuccess: () => {
          updateOrder.mutate({
            id: order.id,
            deposit_amount: newNetReceived,
            remaining_balance: remainingBalance,
          });
          setShowRefundForm(false);
          setRefundAmount("");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!order) return;
    deleteOrder.mutate(order.id, {
      onSuccess: () => {
        setShowDeleteAlert(false);
        handleClose();
      },
    });
  };

  if (!order) return null;

  const remainingBalance = Number(order.total_amount) - netReceived;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-display">#{order.order_number}</DialogTitle>
                <DialogDescription>
                  Created {format(new Date(order.created_at), "MMM d, yyyy")}
                </DialogDescription>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                    {order.customer?.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.customer?.name}</span>
                      {order.customer?.vip_status && order.customer.vip_status !== "regular" && (
                        <Crown className="h-4 w-4 text-gold" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{order.customer?.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items / Products Section */}
              <Collapsible open={showOrderItems} onOpenChange={setShowOrderItems}>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between gap-2 -m-2">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Order Items ({orderItems.length})
                      </span>
                      {showOrderItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {orderItems.length > 0 ? (
                      orderItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Qty: {item.quantity}</span>
                              <span>×</span>
                              <span>₹{Number(item.unit_price).toLocaleString()}</span>
                              {item.is_custom_work && (
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">Custom</span>
                              )}
                            </div>
                          </div>
                          <p className="font-medium text-sm">₹{Number(item.total_price).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">No items added to this order</p>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Financial Summary */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Financial Summary
                </p>
                <div className="space-y-2">
                  {Number(order.subtotal) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{Number(order.subtotal).toLocaleString()}</span>
                    </div>
                  )}
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
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                    <span>Total Amount</span>
                    <span>₹{Number(order.total_amount).toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Received</p>
                    <p className="text-sm font-medium text-emerald-600">₹{netReceived.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${remainingBalance > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                    <p className="text-[10px] text-muted-foreground">Balance</p>
                    <p className={`text-sm font-medium ${remainingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      ₹{Math.max(0, remainingBalance).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment History
                  </p>
                  {!isCancelled && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPaymentForm(true)}
                        className="gap-1 h-7 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        Payment
                      </Button>
                    </div>
                  )}
                  {isCancelled && netReceived > 0 && !isSettled && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowRefundForm(true)}
                      className="gap-1 h-7 text-xs border-amber-500/50 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Refund
                    </Button>
                  )}
                </div>

                {/* Payment Form */}
                {showPaymentForm && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <label className="text-xs text-muted-foreground">Payment Amount (₹)</label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter payment amount"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleRecordPayment} 
                        disabled={recordPayment.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      >
                        {recordPayment.isPending ? "Recording..." : "Record Payment"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Refund Form */}
                {showRefundForm && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <label className="text-xs text-muted-foreground">Refund Amount (₹)</label>
                    <Input
                      type="number"
                      min={0}
                      max={netReceived}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="Enter refund amount"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max refundable: ₹{netReceived.toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowRefundForm(false)}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleRecordRefund} 
                        disabled={recordPayment.isPending || !refundAmount || parseFloat(refundAmount) <= 0}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        {recordPayment.isPending ? "Processing..." : "Process Refund"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Payment Records */}
                {payments && payments.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {payments.map((payment) => (
                      <div 
                        key={payment.id} 
                        className={`flex items-center justify-between p-2 rounded-md text-sm ${
                          payment.payment_type === "refund" 
                            ? "bg-amber-500/10 border border-amber-500/20" 
                            : "bg-emerald-500/10 border border-emerald-500/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {payment.payment_type === "refund" ? (
                            <ArrowUpCircle className="h-4 w-4 text-amber-600" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                          )}
                          <span className={payment.payment_type === "refund" ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}>
                            {payment.payment_type === "refund" ? "Refund" : "Payment"}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${payment.payment_type === "refund" ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                            {payment.payment_type === "refund" ? "-" : "+"}₹{Number(payment.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No payment records yet</p>
                )}
              </div>

              {/* Order Details */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span>{order.store?.name || "No store assigned"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{order.assigned_employee?.name || "Unassigned"}</span>
                </div>
                {order.due_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Due: {format(new Date(order.due_date), "PPP")}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2">
              {!isCancelled && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAlert(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Cancel Order
                </Button>
              )}
              {isCancelled && !isSettled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsSettled}
                  disabled={updateOrder.isPending}
                  className="gap-2 border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                >
                  {updateOrder.isPending ? "Settling..." : "Mark as Settled"}
                </Button>
              )}
            </div>
            <div />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order #{order.order_number}? This will mark the order as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteOrder.isPending ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
    </>
  );
}
