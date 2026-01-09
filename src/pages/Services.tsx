import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Package, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { exportTableToPdf, type ColumnDef } from "@/lib/utils";
import { ServiceImport } from "@/components/services/ServiceImport";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useServices } from "@/hooks/useServices";
import { ServiceForm } from "@/components/forms/ServiceForm";

export default function ServicesPage() {
  const { services = [], isLoading, deleteService } = useServices();
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const filtered = useMemo(() => {
    return services.filter((s: any) => {
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
    });
  }, [services, query]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleEdit = (s: any) => {
    setSelectedService(s);
    setOpenForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this service?")) return;
    deleteService.mutate(id);
  };

  return (
    <AppLayout title="Services" subtitle="Manage provided services (stitching, stonework, etc)">
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search services..." className="pl-10 w-full" value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }} />
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <ServiceImport />
            <Button variant="outline" className="gap-2" onClick={() => {
              const cols: ColumnDef<any>[] = [
                { header: "Name", render: (r) => r.name },
                { header: "Price", render: (r) => `₹${Number(r.price).toLocaleString()}` },
                { header: "Unit", render: (r) => r.unit },
              ];
              exportTableToPdf("Services", cols, filtered);
            }}>
              <Download className="h-4 w-4" />
              <span className="inline">Export</span>
            </Button>

            <Button onClick={() => { setSelectedService(null); setOpenForm(true); }}>
              <span className="inline">Add Service</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="card-luxury overflow-hidden p-0">
        {paginated.length === 0 ? (
          <EmptyState icon={Package} title={isLoading ? "Loading..." : "No services"} description={isLoading ? "" : "No services match your search."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">Service</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">Price</th>
                  <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell md:px-6">Unit</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((s: any) => (
                  <tr key={s.id} className="transition-colors hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-4 md:px-6">
                      <div className="flex items-center gap-3">
                        <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-muted sm:flex">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{s.name}</span>
                          <p className="text-xs text-muted-foreground sm:hidden">{s.unit} • ₹{Number(s.price).toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground md:px-6">₹{Number(s.price).toLocaleString()}</td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-muted-foreground lg:table-cell md:px-6">{s.unit}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right md:px-6" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { /* view placeholder */ }} className="gap-2"><Eye className="h-4 w-4" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(s)} className="gap-2"><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-center px-4">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      <ServiceForm open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) setSelectedService(null); }} service={selectedService} onSaved={() => { /* no-op */ }} />
    </AppLayout>
  );
}
