import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { useOrders } from "@/hooks/useOrders";
import { useOrderStatusSettings } from "@/hooks/useStatusSettings";
// Note: no enum checks — dropdown loads dynamic settings only
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

// keep an internal fallback (empty) — we prefer dynamic settings
const fallbackStatusOptions: { value: OrderStatus; label: string }[] = [];

interface UpdateOrderStatusDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateOrderStatusDialog({ order, open, onOpenChange }: UpdateOrderStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const { updateOrderStatus } = useOrders();
  const { orderStatuses } = useOrderStatusSettings();

  useEffect(() => {
    if (open && order) {
      setNewStatus(order.status);
    }
  }, [open, order]);

  // Build options: use active entries from settings only
  const dynamicOptions: { value: OrderStatus; label: string }[] = (orderStatuses || [])
    .filter((s) => s.is_active)
    .map((s) => ({ value: s.code as OrderStatus, label: s.label }));

  const statusOptions = dynamicOptions.length > 0 ? dynamicOptions : fallbackStatusOptions;

  const handleClose = () => {
    onOpenChange(false);
    setNewStatus("");
  };

  const handleUpdate = () => {
    if (!order || !newStatus) return;
    updateOrderStatus.mutate(
      { id: order.id, status: newStatus },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Update Order Status</DialogTitle>
          <DialogDescription>
            Change the status for order #{order.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Current Status:</span>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={!newStatus || newStatus === order.status || updateOrderStatus.isPending}
          >
            {updateOrderStatus.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
