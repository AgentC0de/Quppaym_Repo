import { useState } from "react";
import { format } from "date-fns";
import { Ruler, User, Download, FileText, History, ChevronDown, ChevronUp, FileDown, Package, Image } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useMeasurementVersions } from "@/hooks/useMeasurementVersions";
import { useToast } from "@/hooks/use-toast";
import { measurementFields } from "@/lib/measurementFields";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  customer?: { id: string; name: string; phone: string } | null;
};

type Measurement = Database["public"]["Tables"]["measurements"]["Row"];

interface MeasurementCardProps {
  measurement: Measurement;
  isExpanded: boolean;
  onToggle: () => void;
  order: Order;
}

function MeasurementCard({ measurement, isExpanded, onToggle, order }: MeasurementCardProps) {
  const { versions } = useMeasurementVersions(measurement.id);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showImagesOpen, setShowImagesOpen] = useState(false);
  const { toast } = useToast();

  const generateMeasurementText = () => {
    const lines = [
      `📐 Measurement Profile`,
      `Order: #${order.order_number}`,
      `Customer: ${order.customer?.name || "Unknown"}`,
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
    
    return lines.join("\n");
  };

  const handleExportCSV = () => {
    const headers = ["Field", "Value"];
    const rows = [
      ["Order Number", order.order_number],
      ["Customer", order.customer?.name || ""],
      ["Garment Type", measurement.garment_type],
      ...measurementFields.map((mf) => {
        const value = (measurement as any)[mf.key];
        return [mf.label, value ? `${Number(value)}"` : ""];
      }),
      ["Notes", measurement.custom_notes || ""],
    ];
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `measurements-${order.order_number}-${measurement.garment_type}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Exported", description: "Measurements exported as CSV." });
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Error", description: "Please allow popups to export PDF", variant: "destructive" });
      return;
    }

    const fieldsHtml = measurementFields
      .filter(mf => (measurement as any)[mf.key])
      .map(mf => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${mf.label}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${Number((measurement as any)[mf.key])}"</td>
        </tr>
      `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Measurement - ${measurement.garment_type}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            .info { margin-bottom: 16px; }
            @media print { body { padding: 20px; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>${measurement.garment_type}</h1>
          <div class="info">
            <p><strong>Order:</strong> #${order.order_number}</p>
            <p><strong>Updated:</strong> ${format(new Date(measurement.updated_at), "PPP")}</p>
          </div>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr>
                <th style="text-align:left; padding: 12px 8px; background: #f9fafb; border-bottom: 2px solid #e5e7eb;">Measurement</th>
                <th style="text-align:left; padding: 12px 8px; background: #f9fafb; border-bottom: 2px solid #e5e7eb;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${fieldsHtml}
            </tbody>
          </table>
          ${measurement.custom_notes ? `<div style="padding:16px; background:#f9fafb; border-radius:8px;"><p style="font-weight:600; margin-bottom:8px;">Notes</p><p>${measurement.custom_notes}</p></div>` : ""}
          <div style="margin-top:24px; text-align:center;" class="no-print">
            <button onclick="window.print()" style="padding:12px 24px; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">Save as PDF / Print</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    toast({ title: "PDF Ready", description: "Use your browser's print function to save as PDF." });
  };

  // copy text function removed

  // Filter to only show fields that have values
  const fieldsWithValues = measurementFields.filter(mf => (measurement as any)[mf.key]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`rounded-lg border ${isExpanded ? "border-primary" : "border-border"} overflow-hidden`}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className={`w-full justify-between px-4 py-3 h-auto rounded-none ${isExpanded ? "bg-primary/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{measurement.garment_type}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {format(new Date(measurement.updated_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {measurement.materials_provided_by_customer && (
                <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                  Materials
                </span>
              )}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Measurements Grid - show all fields */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {measurementFields.map((mf) => {
                const value = (measurement as any)[mf.key];
                return (
                  <div 
                    key={mf.key} 
                    className={`rounded-lg px-2 py-1.5 ${value ? "bg-muted/50" : "bg-muted/20 border border-dashed border-border"}`}
                  >
                    <p className="text-[10px] text-muted-foreground truncate">{mf.label}</p>
                    <p className={`font-medium text-sm ${value ? "" : "text-muted-foreground"}`}>
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

            {/* Version History */}
            {versions.length > 0 && (
              <Collapsible open={showVersionHistory} onOpenChange={setShowVersionHistory}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Version History ({versions.length})
                    </span>
                    {showVersionHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {versions.slice(0, 3).map((version) => (
                    <div 
                      key={version.id} 
                      className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Version {version.version_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(version.created_at), "MMM d, yyyy")}
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
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Export Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowImagesOpen(true)} className="gap-2">
                <Image className="h-4 w-4" />
                Images
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                <FileDown className="h-4 w-4" />
                CSV
              </Button>
            </div>

            <Dialog open={showImagesOpen} onOpenChange={setShowImagesOpen}>
              <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Measurement Images</DialogTitle>
                  <DialogDescription>
                    Images uploaded for this measurement
                  </DialogDescription>
                </DialogHeader>
                <div className="p-2">
                  {measurement.materials_images && measurement.materials_images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {measurement.materials_images.map((src, idx) => (
                        <div key={idx} className="rounded overflow-hidden border border-border">
                          <img src={src} alt={`measurement-${idx}`} className="w-full h-48 object-contain bg-black/5" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">No images uploaded for this measurement.</div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowImagesOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface OrderMeasurementsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderMeasurementsDialog({ order, open, onOpenChange }: OrderMeasurementsDialogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch measurements for this order
  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ["measurements", "order", order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from("measurements")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Measurement[];
    },
    enabled: !!order?.id && open,
  });

  if (!order) return null;

  const handleExportAllCSV = () => {
    if (measurements.length === 0) return;
    
    const allRows: string[][] = [];
    allRows.push(["Garment Type", "Field", "Value"]);
    
    measurements.forEach((m) => {
      measurementFields.forEach((mf) => {
        const value = (m as any)[mf.key];
        if (value) {
          allRows.push([m.garment_type, mf.label, `${Number(value)}"`]);
        }
      });
      if (m.custom_notes) {
        allRows.push([m.garment_type, "Notes", m.custom_notes]);
      }
      allRows.push(["", "", ""]); // separator
    });
    
    const csvContent = allRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-measurements-${order.order_number}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Exported", description: "All measurements exported as CSV." });
  };

  const handleExportAllPDF = () => {
    if (measurements.length === 0) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Error", description: "Please allow popups to export PDF", variant: "destructive" });
      return;
    }

    const measurementsHtml = measurements.map((m) => {
      const fieldsHtml = measurementFields
        .filter(mf => (m as any)[mf.key])
        .map(mf => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${mf.label}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${Number((m as any)[mf.key])}"</td>
          </tr>
        `).join("");

      return `
        <div style="margin-bottom: 32px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; margin-bottom: 8px; color: #1f2937;">${m.garment_type}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px 8px; background: #f9fafb; border-bottom: 2px solid #e5e7eb;">Measurement</th>
                <th style="text-align: left; padding: 12px 8px; background: #f9fafb; border-bottom: 2px solid #e5e7eb;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${fieldsHtml}
            </tbody>
          </table>
          ${m.custom_notes ? `
            <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
              <p style="font-weight: 600; margin-bottom: 8px;">Notes</p>
              <p>${m.custom_notes}</p>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Measurements - Order #${order.order_number}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .subtitle { color: #6b7280; margin-bottom: 24px; }
            .info { margin-bottom: 24px; }
            .info p { margin: 4px 0; }
            .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Measurement Profiles</h1>
          <p class="subtitle">Order #${order.order_number}</p>
          
          <div class="info">
            <p><strong>Customer:</strong> ${order.customer?.name || "Unknown"}</p>
            <p><strong>Total Measurements:</strong> ${measurements.length}</p>
          </div>
          
          ${measurementsHtml}
          
          <div class="footer">
            Generated on ${format(new Date(), "PPP 'at' p")}
          </div>
          
          <div class="no-print" style="margin-top: 24px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Save as PDF / Print
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    toast({ title: "PDF Ready", description: "Use your browser's print function to save as PDF." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-display">{order.customer?.name}</DialogTitle>
              <DialogDescription>
                Order #{order.order_number} • {measurements.length} measurement{measurements.length !== 1 ? "s" : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : measurements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Ruler className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No measurements linked to this order</p>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule a fitting to add measurements
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {measurements.map((measurement) => (
                <MeasurementCard
                  key={measurement.id}
                  measurement={measurement}
                  order={order}
                  isExpanded={expandedId === measurement.id}
                  onToggle={() => setExpandedId(expandedId === measurement.id ? null : measurement.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {measurements.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Download className="h-4 w-4" />
                  Export All
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportAllPDF} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAllCSV} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
