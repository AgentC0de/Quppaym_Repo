import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrderStatusSettings, OrderStatusSetting } from "@/hooks/useStatusSettings";
// Removed enum checks and migration helper per user request
import { Plus, Pencil, Trash2, GripVertical, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const colorOptions = [
  { value: "slate", label: "Slate", class: "bg-slate-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "amber", label: "Amber", class: "bg-amber-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
];

interface StatusFormData {
  code: string;
  label: string;
  color: string;
  is_active: boolean;
}

export const OrderStatusSettings = () => {
  const {
    orderStatuses,
    isLoading,
    createOrderStatus,
    updateOrderStatus,
    deleteOrderStatus,
  } = useOrderStatusSettings();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<OrderStatusSetting | null>(null);
  const [formData, setFormData] = useState<StatusFormData>({
    code: "",
    label: "",
    color: "gray",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({ code: "", label: "", color: "gray", is_active: true });
    setEditingStatus(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (status: OrderStatusSetting) => {
    setEditingStatus(status);
    setFormData({
      code: status.code,
      label: status.label,
      color: status.color,
      is_active: status.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.label) return;

    if (editingStatus) {
      await updateOrderStatus.mutateAsync({
        id: editingStatus.id,
        label: formData.label,
        color: formData.color,
        is_active: formData.is_active,
      });
    } else {
      const maxSortOrder = Math.max(...(orderStatuses?.map((s) => s.sort_order) || [0]), 0);
      await createOrderStatus.mutateAsync({
        code: formData.code.toLowerCase().replace(/\s+/g, "_"),
        label: formData.label,
        color: formData.color,
        is_active: formData.is_active,
        is_system: false,
        sort_order: maxSortOrder + 1,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  // no enum checks

  const handleDelete = async (status: OrderStatusSetting) => {
    if (status.is_system) return;
    if (confirm(`Are you sure you want to delete "${status.label}"?`)) {
      await deleteOrderStatus.mutateAsync(status.id);
    }
  };

  const getColorClass = (color: string) => {
    return colorOptions.find((c) => c.value === color)?.class || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage order workflow statuses
        </p>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Status
        </Button>
      </div>

      {/* removed enum note and migration helper as requested */}

      <div className="space-y-2">
        {orderStatuses?.map((status) => (
          <div
            key={status.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <div className={`h-3 w-3 rounded-full ${getColorClass(status.color)}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{status.label}</span>
                  {status.is_system && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                  {!status.is_active && (
                    <span className="text-xs text-muted-foreground">(Inactive)</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{status.code}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditDialog(status)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!status.is_system && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(status)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Edit Order Status" : "Add Order Status"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingStatus && (
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., quality_check"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Internal identifier (lowercase, underscores)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="label">Display Label</Label>
              <Input
                id="label"
                placeholder="e.g., Quality Check"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) =>
                  setFormData({ ...formData, color: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>

            {/* removed Copy Migration SQL button per request */}

            <Button
              onClick={handleSubmit}
              disabled={!formData.code || !formData.label}
            >
              {editingStatus ? "Save Changes" : "Add Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
