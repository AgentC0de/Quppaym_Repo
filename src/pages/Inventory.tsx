import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { InventoryItemForm } from "@/components/forms/InventoryItemForm";
import { InventoryImport } from "@/components/inventory/InventoryImport";
import { InventoryViewDialog } from "@/components/dialogs/InventoryViewDialog";
import { Search, Download, AlertTriangle, Package, Loader2, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { exportTableToPdf, type ColumnDef } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useInventory } from "@/hooks/useInventory";
import { useCategories } from "@/hooks/useCategories";
import { useStores } from "@/hooks/useStores";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"] & {
  store?: { id: string; name: string } | null;
};

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { inventory, isLoading } = useInventory();
  const { stores } = useStores();

  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => item.quantity <= item.min_stock_level);
  }, [inventory]);

  const { categories: canonicalCategories = [] } = useCategories();
  const categories = useMemo(() => {
    return canonicalCategories.map((c) => c.name);
  }, [canonicalCategories]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStore =
        storeFilter === "all" || item.store_id === storeFilter || !item.store_id;
      return matchesSearch && matchesCategory && matchesStore;
    });
  }, [inventory, searchQuery, categoryFilter, storeFilter]);

  const totalPages = Math.ceil(filteredInventory.length / pageSize);
  const paginatedInventory = filteredInventory.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout title="Inventory" subtitle="Product catalog and stock management">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Inventory" subtitle="Product catalog and stock management">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center dark:border-amber-900/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">{lowStockItems.length} items</span> are running low on stock
            </p>
          </div>
          <Button variant="outline" size="sm" className="sm:ml-auto">
            View Low Stock
          </Button>
        </div>
      )}

      {/* Filters and Actions - stacked on mobile: 1) search, 2) dropdowns, 3) buttons */}
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search */}
          <div className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Row 2: Dropdowns (left) and Actions (right) - stacked on mobile, single-line on sm+ */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-3 w-full sm:flex-row sm:items-center sm:justify-start">
              <div className="w-full sm:w-auto">
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <Select
                  value={storeFilter}
                  onValueChange={(value) => {
                    setStoreFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end sm:ml-auto">
              <div className="flex items-center gap-3">
                <InventoryImport />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const cols: ColumnDef<InventoryItem>[] = [
                      { header: "SKU", render: (i) => i.sku },
                      { header: "Name", render: (i) => i.name },
                      { header: "Stock", render: (i) => String(i.quantity) },
                      { header: "Price", render: (i) => `₹${Number(i.price).toLocaleString()}` },
                      { header: "Updated", render: (i) => i.updated_at ? format(new Date(i.updated_at), "MMM d, yyyy") : "" },
                    ];
                    exportTableToPdf("Inventory", cols, filteredInventory);
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span className="inline">Export</span>
                </Button>
              </div>

              <div className="ml-3">
                <InventoryItemForm />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card-luxury overflow-hidden p-0">
        {paginatedInventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items found"
            description="No inventory items match your current search or filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Product
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell md:px-6">
                      SKU
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell md:px-6">
                      Category
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Stock
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Price
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell md:px-6">
                      Location
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedInventory.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleViewItem(item)}
                    >
                      <td className="whitespace-nowrap px-4 py-4 md:px-6">
                        <div className="flex items-center gap-3">
                          <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-muted sm:flex">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{item.name}</span>
                            {/* Mobile: Show SKU */}
                            <p className="text-xs text-muted-foreground sm:hidden">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-muted-foreground sm:table-cell md:px-6">
                        {item.sku}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-4 lg:table-cell md:px-6">
                        <span className="status-badge bg-secondary text-secondary-foreground">
                          {item.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 md:px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-medium",
                              item.quantity <= item.min_stock_level
                                ? "text-amber-600"
                                : "text-foreground"
                            )}
                          >
                            {item.quantity}
                          </span>
                          {item.quantity <= item.min_stock_level && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-foreground md:px-6">
                        ₹{Number(item.price).toLocaleString()}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-4 text-muted-foreground md:table-cell md:px-6">
                        {item.store?.name || "All Stores"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right md:px-6" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewItem(item)} className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewItem(item)} className="gap-2">
                              <Pencil className="h-4 w-4" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Trash2 className="h-4 w-4" />
                              Remove Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex justify-center px-4">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredInventory.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
      

      <InventoryViewDialog
        item={selectedItem}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </AppLayout>
  );
};

export default Inventory;