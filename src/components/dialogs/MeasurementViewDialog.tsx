import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Ruler, ShoppingBag, Pencil, Trash2, Download, FileText, History, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
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
// alert dialog removed for measurement delete UI
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMeasurements } from "@/hooks/useMeasurements";
import { useMeasurementVersions } from "@/hooks/useMeasurementVersions";
import { useToast } from "@/hooks/use-toast";
import { measurementFields } from "@/lib/measurementFields";
import type { Database } from "@/integrations/supabase/types";

type MeasurementRow = Database["public"]["Tables"]["measurements"]["Row"];

interface Measurement extends MeasurementRow {
  order?: {
    id: string;
    order_number: string;
    customer?: { id: string; name: string } | null;
  } | null;
}

// Build zod schema dynamically
const measurementSchemaObj: Record<string, z.ZodTypeAny> = {
  garment_type: z.string().trim().min(1, "Garment type is required").max(100),
  custom_notes: z.string().trim().max(1000).optional(),
};
measurementFields.forEach(f => {
  measurementSchemaObj[f.key] = z.number().min(0).optional();
});
const measurementSchema = z.object(measurementSchemaObj);

type MeasurementFormData = z.infer<typeof measurementSchema>;

interface MeasurementViewDialogProps {
  measurement: Measurement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeasurementViewDialog({ measurement, open, onOpenChange }: MeasurementViewDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const { updateMeasurement } = useMeasurements();
  const { versions, hasExcessVersions, cleanupOldVersions } = useMeasurementVersions(measurement?.id);
  const { toast } = useToast();

  // Auto-cleanup excess versions when they exist
  useEffect(() => {
    if (hasExcessVersions) {
      cleanupOldVersions.mutate();
    }
  }, [hasExcessVersions]);

  // Build default values dynamically
  const getDefaultValues = () => {
    if (!measurement) return undefined;
    const values: Record<string, any> = {
      garment_type: measurement.garment_type,
      custom_notes: measurement.custom_notes || "",
    };
    measurementFields.forEach(f => {
      const val = (measurement as any)[f.key];
      values[f.key] = val ? Number(val) : undefined;
    });
    return values;
  };

  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    values: getDefaultValues(),
  });

  const handleClose = () => {
    setIsEditing(false);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = (data: MeasurementFormData) => {
    if (!measurement) return;
    
    const updateData: Record<string, any> = {
      id: measurement.id,
      garment_type: data.garment_type,
      custom_notes: (data.custom_notes as string) || null,
    };
    
    measurementFields.forEach(f => {
      updateData[f.key] = (data as any)[f.key] || null;
    });

    updateMeasurement.mutate(updateData as any, {
      onSuccess: () => {
        setIsEditing(false);
        toast({
          title: "Version saved",
          description: "A new version of this measurement has been created.",
        });
      },
    });
  };

  // delete action intentionally removed from UI. Use admin tools or backend to delete measurements.

  const generateMeasurementText = () => {
    if (!measurement) return "";
    
    const customerName = measurement.order?.customer?.name || "Unknown";
    const orderNumber = measurement.order?.order_number || "Unlinked";
    
    const lines = [
      `📐 Measurement Profile`,
      `Order: #${orderNumber}`,
      `Customer: ${customerName}`,
      `Garment: ${measurement.garment_type}`,
      ``,
      `--- Measurements (inches) ---`,
    ];
    
    measurementFields.forEach((mf) => {
      const value = (measurement as any)[mf.key];
      if (value) {
        lines.push(`${mf.label}: ${Number(value)}"`);
      }
    });
    
    if (measurement.custom_notes) {
      lines.push(``, `Notes: ${measurement.custom_notes}`);
    }
    
    lines.push(``, `Last Updated: ${format(new Date(measurement.updated_at), "MMM d, yyyy")}`);
    
    return lines.join("\n");
  };

  const handleExportCSV = () => {
    if (!measurement) return;
    
    const customerName = measurement.order?.customer?.name || "";
    const orderNumber = measurement.order?.order_number || "";
    
    const headers = ["Field", "Value"];
    const rows = [
      ["Order Number", orderNumber],
      ["Customer", customerName],
      ["Garment Type", measurement.garment_type],
      ...measurementFields.map((mf) => [mf.label, (measurement as any)[mf.key] ? `${Number((measurement as any)[mf.key])}"` : ""]),
      ["Notes", measurement.custom_notes || ""],
      ["Last Updated", format(new Date(measurement.updated_at), "yyyy-MM-dd")],
    ];
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `measurement-${orderNumber || "profile"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Exported", description: "Measurement exported as CSV." });
  };

  const handleExportPDF = () => {
    if (!measurement) return;

    const customerName = measurement.order?.customer?.name || "";
    const orderNumber = measurement.order?.order_number || "";

    const rows = measurementFields.map((mf) => ({ label: mf.label, value: (measurement as any)[mf.key] ? `${Number((measurement as any)[mf.key])}"` : "" }));

    const html = `
      <html>
      <head>
        <title>Measurement ${orderNumber}</title>
        <style>body{font-family: Arial, Helvetica, sans-serif; padding:20px} h1{font-size:18px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ddd;padding:8px;text-align:left}</style>
      </head>
      <body>
        <h1>Measurement Profile</h1>
        <p><strong>Order:</strong> #${orderNumber}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Garment:</strong> ${measurement.garment_type}</p>
        <table>
          <thead><tr><th>Field</th><th>Value</th></tr></thead>
          <tbody>
            ${rows.map(r => `<tr><td>${r.label}</td><td>${r.value || "-"}</td></tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) {
      toast({ title: "Blocked", description: "Popup blocked. Allow popups to export PDF.", variant: "destructive" });
      return;
    }
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  const [showImagesOpen, setShowImagesOpen] = useState(false);
  const handleViewImages = () => {
    if (!measurement || !(measurement.materials_images && measurement.materials_images.length > 0)) {
      toast({ title: "No images", description: "No material images uploaded for this measurement." });
      return;
    }
    setShowImagesOpen(true);
  };

  // copy-as-text removed

  if (!measurement) return null;

  const customerName = measurement.order?.customer?.name || "Unknown";
  const orderNumber = measurement.order?.order_number || "Unlinked";

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="font-display">Order #{orderNumber}</DialogTitle>
                <DialogDescription>
                  {customerName} - {measurement.garment_type}
                </DialogDescription>
              </div>
              {measurement.is_primary && (
                <span className="status-badge bg-primary/10 text-primary">Primary</span>
              )}
            </div>
          </DialogHeader>

          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="garment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garment Type *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value as string} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
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
                              step="0.1"
                              min={0}
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="custom_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} value={field.value as string || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  <strong>Note:</strong> Saving changes will create a new version. Previous orders retain their original measurements.
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMeasurement.isPending}>
                    {updateMeasurement.isPending ? "Saving..." : "Save New Version"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <>
              <div className="space-y-4">
                {/* All Measurements Grid */}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {measurementFields.map((mf) => {
                    const value = (measurement as any)[mf.key];
                    return (
                      <div key={mf.key} className={`rounded-lg px-3 py-2 ${value ? "bg-muted/50" : "bg-muted/20 border border-dashed border-border"}`}>
                        <p className="text-xs text-muted-foreground">{mf.label}</p>
                        <p className={`font-medium ${value ? "" : "text-muted-foreground"}`}>
                          {value ? `${Number(value)}"` : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {measurement.custom_notes && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{measurement.custom_notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Ruler className="h-3.5 w-3.5" />
                  Last updated {format(new Date(measurement.updated_at), "MMM d, yyyy 'at' h:mm a")}
                </div>

                {/* Version History */}
                {versions.length > 0 && (
                  <Collapsible open={showVersionHistory} onOpenChange={setShowVersionHistory}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Version History ({versions.length} versions)
                        </span>
                        {showVersionHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      {versions.map((version) => (
                        <div 
                          key={version.id} 
                          className="rounded-lg border border-border p-3 text-sm bg-muted/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Version {version.version_number}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            {measurementFields.map((mf) => {
                              const val = (version as any)[mf.key];
                              if (!val) return null;
                              return (
                                <div key={mf.key}>
                                  <span className="text-muted-foreground">{mf.label}:</span>{" "}
                                  <span className="font-medium">{Number(val)}"</span>
                                </div>
                              );
                            })}
                          </div>
                          {version.change_reason && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Reason: {version.change_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex gap-2">
                  {/* Delete removed */}
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleViewImages} className="gap-2">
                          <ImageIcon className="h-4 w-4" />
                          View Images
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                          <FileText className="h-4 w-4" />
                          Download CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                          <FileText className="h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showImagesOpen} onOpenChange={setShowImagesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Material Images</DialogTitle>
            <DialogDescription>
              Uploaded material photos for this measurement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {measurement?.materials_images && measurement.materials_images.length > 0 ? (
                measurement.materials_images.map((url, idx) => (
                  <div key={idx} className="rounded-md overflow-hidden border border-border">
                    <img src={url} alt={`material-${idx}`} className="w-full h-40 object-cover" />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No images available.</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImagesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirmation removed from UI */}
    </>
  );
}
