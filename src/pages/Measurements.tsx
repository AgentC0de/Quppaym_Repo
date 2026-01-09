import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { MeasurementViewDialog } from "@/components/dialogs/MeasurementViewDialog";
import { Search, MoreHorizontal, Ruler, ShoppingBag, Loader2, Eye, FileDown, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useMeasurements } from "@/hooks/useMeasurements";
import { EmptyState } from "@/components/ui/empty-state";
import { measurementFields } from "@/lib/measurementFields";
import type { Database } from "@/integrations/supabase/types";

type MeasurementRow = Database["public"]["Tables"]["measurements"]["Row"];

interface MeasurementWithOrder extends MeasurementRow {
  order?: {
    id: string;
    order_number: string;
    customer?: { id: string; name: string } | null;
  } | null;
}

const Measurements = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { measurements, isLoading, error } = useMeasurements();
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementWithOrder | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  if (error) {
    return (
      <AppLayout title="Measurements" subtitle="Order measurement profiles and fitting records">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-2">Failed to load measurements</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </AppLayout>
    );
  }

  const filteredMeasurements = useMemo(() => {
    return (measurements as MeasurementWithOrder[]).filter((measurement) => {
      const customerName = measurement.order?.customer?.name || "";
      const orderNumber = measurement.order?.order_number || "";
      return (
        customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        measurement.garment_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [measurements, searchQuery]);

  const handleViewMeasurement = (measurement: MeasurementWithOrder) => {
    setSelectedMeasurement(measurement);
    setViewDialogOpen(true);
  };

  // Get first 4 fields that have values for preview
  const getPreviewFields = (measurement: MeasurementWithOrder) => {
    return measurementFields
      .filter(f => (measurement as any)[f.key])
      .slice(0, 4);
  };

  if (isLoading) {
    return (
      <AppLayout title="Measurements" subtitle="Order measurement profiles and fitting records">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Measurements" subtitle="Order measurement profiles and fitting records">
      {/* Actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order or garment type..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Measurements are created via the Order → Schedule Fitting workflow
        </p>
      </div>

      {/* Measurement Cards Grid */}
      {filteredMeasurements.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No measurements found"
          description={searchQuery ? "No measurements match your search." : "Measurements are created through the Schedule Fitting action on orders."}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredMeasurements.map((measurement) => {
            const previewFields = getPreviewFields(measurement);
            return (
              <div 
                key={measurement.id} 
                className="card-luxury p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewMeasurement(measurement)}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {measurement.order?.order_number || "Unlinked"}
                      </h3>
                      <p className="text-sm text-muted-foreground">{measurement.garment_type}</p>
                      {measurement.order?.customer?.name && (
                        <p className="text-xs text-muted-foreground">
                          {measurement.order.customer.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewMeasurement(measurement)} className="gap-2">
                          <Eye className="h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          // Export as PDF: open a print window with measurement details
                          const rowsHtml = measurementFields.map((mf) => {
                            const val = (measurement as any)[mf.key];
                            return `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${mf.label}</td><td style="padding:8px;border-bottom:1px solid #eee;">${val ? `${Number(val)}"` : ''}</td></tr>`;
                          }).join('');
                          const html = `<!doctype html><html><head><meta charset="utf-8"><title>Measurement ${measurement.id}</title><style>body{font-family:system-ui, sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse}th,td{padding:8px}</style></head><body><h1>Measurement Profile</h1><p><strong>Order:</strong> ${measurement.order?.order_number || 'Unlinked'}</p><p><strong>Garment:</strong> ${measurement.garment_type}</p><table>${rowsHtml}${measurement.custom_notes?`<tr><td style="padding:8px;border-top:1px solid #eee">Notes</td><td style="padding:8px;border-top:1px solid #eee">${String(measurement.custom_notes)}</td></tr>`:''}</table></body></html>`;
                          const w = window.open('','_blank');
                          if (!w) return;
                          w.document.write(html);
                          w.document.close();
                        }} className="gap-2">
                          <Printer className="h-4 w-4" />
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          // Build CSV for single measurement and trigger download
                          const rows: string[][] = [];
                          rows.push(["Field","Value"]);
                          rows.push(["Order Number", measurement.order?.order_number || "Unlinked"]);
                          rows.push(["Garment Type", measurement.garment_type || ""]);
                          measurementFields.forEach((mf) => {
                            const val = (measurement as any)[mf.key];
                            rows.push([mf.label, val ? String(val) : ""]);
                          });
                          if (measurement.custom_notes) rows.push(["Notes", measurement.custom_notes]);
                          const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(",")).join("\n");
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `measurement-${measurement.id || 'profile'}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }} className="gap-2">
                          <FileDown className="h-4 w-4" />
                          Export CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  {previewFields.map((field) => (
                    <div key={field.key} className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      <p className="font-medium text-foreground">{Number((measurement as any)[field.key])}"</p>
                    </div>
                  ))}
                </div>

                {measurement.custom_notes && (
                  <p className="mb-4 text-sm text-muted-foreground italic line-clamp-2">"{measurement.custom_notes}"</p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-4">
                  <Ruler className="h-3.5 w-3.5" />
                  Updated {format(new Date(measurement.updated_at), "MMM d, yyyy")}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MeasurementViewDialog
        measurement={selectedMeasurement}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </AppLayout>
  );
};

export default Measurements;
