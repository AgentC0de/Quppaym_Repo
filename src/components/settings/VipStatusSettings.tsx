import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useVipStatusSettings, VipStatusSetting } from "@/hooks/useStatusSettings";
import { Pencil, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const colorOptions = [
  { value: "slate", label: "Slate", class: "bg-slate-500" },
  { value: "zinc", label: "Zinc", class: "bg-zinc-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
  { value: "amber", label: "Amber/Gold", class: "bg-amber-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
];

interface VipFormData {
  label: string;
  color: string;
}

export const VipStatusSettings = () => {
  const { vipStatuses, isLoading, updateVipStatus } = useVipStatusSettings();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<VipStatusSetting | null>(null);
  const [formData, setFormData] = useState<VipFormData>({
    label: "",
    color: "gray",
  });

  const openEditDialog = (status: VipStatusSetting) => {
    setEditingStatus(status);
    setFormData({
      label: status.label,
      color: status.color,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingStatus || !formData.label) return;

    await updateVipStatus.mutateAsync({
      id: editingStatus.id,
      label: formData.label,
      color: formData.color,
    });

    setIsDialogOpen(false);
    setEditingStatus(null);
  };

  const getColorClass = (color: string) => {
    return colorOptions.find((c) => c.value === color)?.class || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Customize VIP tier labels and colors
      </p>

      <div className="space-y-2">
        {vipStatuses?.map((status) => (
          <div
            key={status.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <div className={`h-3 w-3 rounded-full ${getColorClass(status.color)}`} />
              <div>
                <span className="font-medium">{status.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">({status.code})</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditDialog(status)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit VIP Level</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vip-label">Display Label</Label>
              <Input
                id="vip-label"
                placeholder="e.g., Diamond"
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.label}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
