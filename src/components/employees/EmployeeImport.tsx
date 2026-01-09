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
import { useEmployees } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function EmployeeImport() {
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createEmployee } = useEmployees();
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = ["name", "email", "phone", "role", "store_id", "is_active"];
    const sampleRow = ["Lakshmi", "lakshmi@example.com", "+919876543210", "tailor", "", "true"];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "employees_template.csv";
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

      const requiredFields = ["name", "phone"];
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
          const email = getValue("email") || null;
          const phone = getValue("phone");
          const rawRole = getValue("role") || "sales_associate";
          const store_id = getValue("store_id") || null;
          const is_active = (getValue("is_active") || "true").toLowerCase() === "true";

          if (!name || !phone) throw new Error(`Row ${rowNum}: Missing required fields (name, phone)`);

          // Normalize role: accept human labels (e.g. "Sales Associate") and map to enum values
          const roleMap: Record<string, string> = {
            admin: "admin",
            "store manager": "store_manager",
            "store_manager": "store_manager",
            "sales associate": "sales_associate",
            sales_associate: "sales_associate",
            sales: "sales_associate",
            tailor: "tailor",
            "tailor ": "tailor",
          };

          const normalizedKey = rawRole.trim().toLowerCase();
          const mappedRole = roleMap[normalizedKey] ?? normalizedKey.replace(/\s+/g, "_");

          // Validate against allowed roles
          const allowed = ["admin", "store_manager", "sales_associate", "tailor"];
          if (!allowed.includes(mappedRole)) {
            throw new Error(`Row ${rowNum}: Invalid role '${rawRole}'. Allowed: ${allowed.join(', ')}`);
          }

          const emp: EmployeeInsert = {
            name,
            email: email || undefined,
            phone,
            role: mappedRole as any,
            store_id: store_id || undefined,
            is_active,
          } as any;

          await createEmployee.mutateAsync(emp);
          importResult.success++;
        } catch (err) {
          importResult.failed++;
          importResult.errors.push(err instanceof Error ? err.message : `Row ${rowNum}: Unknown error`);
        }
      }

      setResult(importResult);
      if (importResult.success > 0) {
        toast({ title: "Import completed", description: `Successfully imported ${importResult.success} employees.` });
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
            Import Employees
          </DialogTitle>
          <DialogDescription>
            Import employees from a CSV file. Download the template to see the expected format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="mb-2 font-medium text-foreground">Instructions</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Download the CSV template below</li>
              <li>2. Fill in your employee data</li>
              <li>3. <strong>Required columns:</strong> name, phone</li>
              <li>4. <strong>Optional columns:</strong> email, role, store_id, is_active</li>
              <li>5. Upload your completed CSV file</li>
            </ol>
          </div>

          <Button variant="outline" onClick={downloadTemplate} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download CSV Template
          </Button>

          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" id="employee-file-upload" />
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
