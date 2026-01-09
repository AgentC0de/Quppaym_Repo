import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function ServiceImport() {
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createService } = useServices();
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = ["name", "description", "price", "unit", "duration_minutes", "category", "taxable"];
    const sampleRow = ["Hand Embroidery", "Intricate hand embroidery", "1500", "per_piece", "60", "Embellishment", "true"];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "services_template.csv";
    link.click();
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCSV = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCSV && !isExcel) {
      toast({ title: "Invalid file type", description: "Please upload a CSV or Excel file.", variant: "destructive" });
      return;
    }

    if (isExcel) {
      toast({ title: "Excel files", description: "Please save your Excel file as CSV before uploading.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) throw new Error("File must contain at least a header row and one data row.");

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const requiredFields = ["name", "price"];
      const missingFields = requiredFields.filter(f => !headers.includes(f));
      if (missingFields.length > 0) throw new Error(`Missing required columns: ${missingFields.join(", ")}`);

      const importResult: ImportResult = { success: 0, failed: 0, errors: [] };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;
        try {
          const getValue = (field: string): string => {
            const index = headers.indexOf(field);
            return index >= 0 ? row[index]?.trim() || "" : "";
          };

          const name = getValue("name");
          const description = getValue("description") || undefined;
          const priceStr = getValue("price");
          const unit = getValue("unit") || "per_piece";
          const durationStr = getValue("duration_minutes");
          const duration_minutes = durationStr ? parseInt(durationStr, 10) : undefined;
          const category = getValue("category") || undefined;
          const taxableStr = getValue("taxable");
          const taxable = taxableStr ? taxableStr.toLowerCase() === "true" : false;

          if (!name || !priceStr) throw new Error(`Row ${rowNum}: Missing required fields (name, price)`);

          const price = parseFloat(priceStr.replace(/[₹,]/g, ""));
          if (isNaN(price) || price < 0) throw new Error(`Row ${rowNum}: Invalid price value`);

          const svc: ServiceInsert = {
            name,
            description,
            price,
            unit,
            duration_minutes: duration_minutes ?? null,
            // category_id may not be available by name; leave null and rely on manual mapping later
            category_id: null,
            taxable,
            active: true,
          } as any;

          await createService.mutateAsync(svc);
          importResult.success++;
        } catch (err) {
          importResult.failed++;
          importResult.errors.push(err instanceof Error ? err.message : `Row ${rowNum}: Unknown error`);
        }
      }

      setResult(importResult);
      if (importResult.success > 0) {
        toast({ title: "Import completed", description: `Successfully imported ${importResult.success} services.` });
      }
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Failed to parse file.", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetState = () => {
    setResult(null);
    setIsImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="inline">Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Services
          </DialogTitle>
          <DialogDescription>
            Import services from a CSV file. Download the template to see the expected format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="mb-2 font-medium text-foreground">Instructions</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Download the CSV template below</li>
              <li>2. Fill in your service data</li>
              <li>3. <strong>Required columns:</strong> name, price</li>
              <li>4. <strong>Optional columns:</strong> description, unit, duration_minutes, category, taxable</li>
              <li>5. Upload your completed CSV file</li>
            </ol>
          </div>

          <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download CSV Template
          </Button>

          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" id="service-file-upload" />
            <Button variant="default" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full gap-2">
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload CSV File
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-4">
                {result.success > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{result.success} imported</span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{result.failed} failed</span>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded border border-destructive/20 bg-destructive/5 p-2">
                  <p className="mb-1 text-xs font-medium text-destructive">Errors:</p>
                  {result.errors.slice(0, 5).map((error, i) => (
                    <p key={i} className="text-xs text-destructive/80">{error}</p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="mt-1 text-xs text-muted-foreground">...and {result.errors.length - 5} more errors</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
