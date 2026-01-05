import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { /*Plus*/ } from "lucide-react";
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
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { MaterialsUploadDialog } from "@/components/dialogs/MaterialsUploadDialog";
import { useMeasurements } from "@/hooks/useMeasurements";
import { measurementFields } from "@/lib/measurementFields";

// Build schema dynamically
const measurementSchemaObj: Record<string, z.ZodTypeAny> = {
  garmentType: z.string().trim().min(2, "Garment type is required").max(100),
  custom_notes: z.string().trim().max(500).optional(),
};
measurementFields.forEach(f => {
  measurementSchemaObj[f.key] = z.number().min(0).max(200).optional();
});
const measurementSchema = z.object(measurementSchemaObj);

type MeasurementFormData = z.infer<typeof measurementSchema>;

const garmentPresets = [
  "Standard Blouse",
  "Lehenga",
  "Saree Blouse",
  "Kurta",
  "Salwar",
  "Evening Gown",
  "Custom",
];

interface MeasurementFormProps {
  trigger?: React.ReactNode;
  onSuccess?: (measurementId?: string) => void;
  /** Externally control dialog open state */
  open?: boolean;
  /** Callback when dialog open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Pre-select order (useful when embedding in order form) */
  defaultOrderId?: string;
}

export function MeasurementForm({ 
  trigger, 
  onSuccess, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
  defaultOrderId
}: MeasurementFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [createdMeasurementId, setCreatedMeasurementId] = useState<string | null>(null);
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false);
  const { createMeasurement } = useMeasurements();
  
  // Use external control if provided, otherwise internal
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (externalOnOpenChange || (() => {})) : setInternalOpen;

  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      garmentType: "",
      custom_notes: "",
    },
  });
  

  const onSubmit = (data: MeasurementFormData) => {
    const measurementData: Record<string, any> = {
      // Measurements are linked to orders (order_id). Use the provided
      // `defaultOrderId` when embedded in an order flow, otherwise null.
      order_id: defaultOrderId || null,
      garment_type: data.garmentType,
      custom_notes: (data.custom_notes as string) || null,
    };
    
    measurementFields.forEach(f => {
      measurementData[f.key] = (data as any)[f.key] || null;
    });

    createMeasurement.mutate(measurementData as any, {
      onSuccess: (createdMeasurement) => {
        const id = createdMeasurement?.id || null;
        setCreatedMeasurementId(id);
        // open materials upload dialog to allow uploading images for this measurement
        setMaterialsDialogOpen(true);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Only render a trigger if one is provided by the caller. */}
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-2xl">
          <DialogHeader>
          <DialogTitle className="font-display">New Measurement Profile</DialogTitle>
          <DialogDescription>
            Record measurements for an order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="garmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garment Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value as string}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {garmentPresets.map((preset) => (
                              <SelectItem key={preset} value={preset}>
                                {preset}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Measurements Grid */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Measurements (in inches)</h4>
                  <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5">
                    {measurementFields.map((mf) => (
                      <FormField
                        key={mf.key}
                        control={form.control}
                        name={mf.key as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{mf.label}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="custom_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Fit preferences, adjustments, etc..."
                          rows={2}
                          {...field}
                          value={field.value as string || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMeasurement.isPending}>
                {createMeasurement.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      <MaterialsUploadDialog
        measurementId={createdMeasurementId}
        open={materialsDialogOpen}
        onOpenChange={(open) => setMaterialsDialogOpen(open)}
        onComplete={() => {
          // finalize: call external onSuccess, reset forms and close dialogs
          onSuccess?.(createdMeasurementId || undefined);
          form.reset();
          setCreatedMeasurementId(null);
          setMaterialsDialogOpen(false);
          setOpen(false);
        }}
      />
    </Dialog>
  );
}
