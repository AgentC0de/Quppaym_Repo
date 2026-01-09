import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useServices } from "@/hooks/useServices";

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: any | null;
  onSaved?: () => void;
}

export function ServiceForm({ open, onOpenChange, service = null, onSaved }: ServiceFormProps) {
  const { createService, updateService } = useServices();
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [unit, setUnit] = useState("service");
  const [description, setDescription] = useState("");
  const [taxable, setTaxable] = useState(true);

  useEffect(() => {
    if (service) {
      setName(service.name || "");
      setPrice(service.price ?? "");
      setUnit(service.unit || "service");
      setDescription(service.description || "");
      setTaxable(service.taxable ?? true);
    } else if (!open) {
      setName("");
      setPrice("");
      setUnit("service");
      setDescription("");
      setTaxable(true);
    }
  }, [service, open]);

  const handleSave = () => {
    if (!name || price === "") return;
    if (service && service.id) {
      updateService.mutate({ id: service.id, name, price: Number(price), unit, description, taxable });
    } else {
      createService.mutate({ name, price: Number(price), unit, description, taxable, active: true });
    }
    onOpenChange(false);
    onSaved?.();
  };

  const title = service ? "Edit Service" : "Add Service";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Service Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Price (₹)</Label>
            <Input type="number" value={price as any} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div>
            <Label>Unit</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Taxable</Label>
              <div className="text-xs text-muted-foreground">Include taxes for this service</div>
            </div>
            <Switch checked={taxable} onCheckedChange={(c) => setTaxable(!!c)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name || price === ""}>{(createService.isPending || updateService.isPending) ? "Saving..." : "Save Service"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
