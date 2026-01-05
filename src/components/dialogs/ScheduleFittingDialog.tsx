import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, Ruler, Plus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useStores } from "@/hooks/useStores";
import { useMeasurements } from "@/hooks/useMeasurements";
import { measurementFields } from "@/lib/measurementFields";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  customer?: { id: string; name: string; phone: string } | null;
  store?: { id: string; name: string } | null;
};

const fittingSchema = z.object({
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  storeId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Build measurement schema dynamically
const measurementSchemaObj: Record<string, z.ZodTypeAny> = {
  garmentType: z.string().min(2, "Garment type is required"),
  custom_notes: z.string().max(500).optional(),
};
measurementFields.forEach(f => {
  measurementSchemaObj[f.key] = z.number().min(0).max(200).optional();
});
const measurementSchema = z.object(measurementSchemaObj);

type FittingFormData = z.infer<typeof fittingSchema>;
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

interface ScheduleFittingDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleFittingDialog({ order, open, onOpenChange }: ScheduleFittingDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("fitting");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { stores } = useStores();
  const { createMeasurement } = useMeasurements();
  const { toast } = useToast();

  const fittingForm = useForm<FittingFormData>({
    resolver: zodResolver(fittingSchema),
    defaultValues: {
      scheduledDate: format(new Date(), "yyyy-MM-dd"),
      scheduledTime: "10:00",
      storeId: "",
      notes: "",
    },
  });

  const measurementForm = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      garmentType: "",
      custom_notes: "",
    },
  });

  useEffect(() => {
    if (order?.store_id) {
      fittingForm.setValue("storeId", order.store_id);
    }
  }, [order, fittingForm]);

  const handleClose = () => {
    fittingForm.reset();
    measurementForm.reset();
    setActiveTab("fitting");
    onOpenChange(false);
  };

  const handleScheduleFitting = async (data: FittingFormData) => {
    if (!order?.customer?.id) return;
    
    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      
      const { error } = await supabase.from("fitting_appointments").insert({
        order_id: order.id,
        customer_id: order.customer.id,
        scheduled_at: scheduledAt.toISOString(),
        store_id: data.storeId || null,
        notes: data.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Fitting scheduled",
        description: `Fitting scheduled for ${format(scheduledAt, "PPP 'at' p")}`,
      });
      handleClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMeasurement = (data: MeasurementFormData) => {
    if (!order?.id) return;
    
    const measurementData: Record<string, any> = {
      order_id: order.id,
      garment_type: data.garmentType,
      custom_notes: (data.custom_notes as string) || null,
    };
    
    measurementFields.forEach(f => {
      measurementData[f.key] = (data as any)[f.key] || null;
    });

    createMeasurement.mutate(measurementData as any, {
      onSuccess: () => {
        toast({
          title: "Measurement saved",
          description: "Customer measurement profile has been created.",
        });
        measurementForm.reset();
        setActiveTab("fitting");
      },
    });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-auto flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="font-display">Schedule Fitting</DialogTitle>
          <DialogDescription>
            Order #{order.order_number}{order.customer?.name ? ` - ${order.customer.name}` : ""}
          </DialogDescription>
        </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fitting" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="measurement" className="gap-2">
              <Ruler className="h-4 w-4" />
              New Measurement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fitting" className="mt-4 flex-1">
            <Form {...fittingForm}>
              <form onSubmit={fittingForm.handleSubmit(handleScheduleFitting)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={fittingForm.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={fittingForm.control}
                    name="scheduledTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={fittingForm.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select store" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.filter(s => s.is_active).map((store) => (
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

                <FormField
                  control={fittingForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes for the fitting..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Scheduling..." : "Schedule Fitting"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="measurement" className="mt-4 flex-1 flex flex-col min-h-0">
            <Form {...measurementForm}>
              <form onSubmit={measurementForm.handleSubmit(handleCreateMeasurement)} className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 pr-4 overflow-y-auto min-h-0">
                  <div className="space-y-4">
                    {/* Customer block intentionally hidden per UI preference */}

                    <FormField
                      control={measurementForm.control}
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

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Measurements (inches)</h4>
                      <div className="grid gap-3 grid-cols-3 sm:grid-cols-4">
                        {measurementFields.map((mf) => (
                          <FormField
                            key={mf.key}
                            control={measurementForm.control}
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
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <FormField
                      control={measurementForm.control}
                      name="custom_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Fit preferences, adjustments..."
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
                  <Button type="button" variant="outline" onClick={() => setActiveTab("fitting")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={createMeasurement.isPending} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {createMeasurement.isPending ? "Saving..." : "Save Measurement"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
