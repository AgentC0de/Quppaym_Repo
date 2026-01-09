import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StoreForm } from "@/components/forms/StoreForm";
import { StoreViewDialog } from "@/components/dialogs/StoreViewDialog";
import { MapPin, Phone, Clock, Mail, Loader2, Store, MoreHorizontal, Eye, Pencil, Search, Trash } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStores } from "@/hooks/useStores";
import { EmptyState } from "@/components/ui/empty-state";
import type { Database } from "@/integrations/supabase/types";

type StoreType = Database["public"]["Tables"]["stores"]["Row"];

const Stores = () => {
  const { stores, isLoading, deleteStore, reactivateStore, permanentDeleteStore } = useStores();
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleViewStore = (store: StoreType) => {
    setSelectedStore(store);
    setViewDialogOpen(true);
  };

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.address || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [stores, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <AppLayout title="Store Locations" subtitle="Manage your boutique locations">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Store Locations" subtitle="Manage your boutique locations">
      {/* Actions: optional search + actions row */}
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
              <div className="w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-between sm:justify-end sm:ml-auto w-full sm:w-auto">
              <div />
              <div className="ml-3">
                <StoreForm />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Store Cards Grid */}
      {filteredStores.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No stores found"
          description={searchQuery ? "No stores match your search." : "Add your first store location to get started."}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map((store) => (
            <div 
              key={store.id} 
              className="card-luxury overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleViewStore(store)}
            >
              {/* Header with gradient */}
              <div className="luxury-gradient px-6 py-4 flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-semibold text-primary-foreground">
                    {store.name}
                  </h3>
                  <p className="mt-1 text-sm text-primary-foreground/80">{store.city}</p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/10">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewStore(store)} className="gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewStore(store)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit Store
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => {
                        if (store.is_active) {
                          if (confirm("Deactivate this store?")) {
                            deleteStore.mutate(store.id);
                          }
                        } else {
                          reactivateStore.mutate(store.id);
                        }
                      }}>
                        {store.is_active ? (
                          <Trash className="h-4 w-4" />
                        ) : (
                          <Trash className="h-4 w-4" />
                        )}
                        {store.is_active ? "Deactivate" : "Reactivate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive" onClick={() => {
                        const ok = confirm("Permanently delete this store? This action cannot be undone.");
                        if (ok) permanentDeleteStore.mutate(store.id);
                      }}>
                        <Trash className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <p className="text-sm text-foreground">{store.address}</p>
                  </div>
                  {store.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-foreground">{store.phone}</p>
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-foreground">{store.email}</p>
                    </div>
                  )}
                  {store.opening_hours && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-foreground">{store.opening_hours}</p>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="mt-6 w-full" onClick={() => handleViewStore(store)}>
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <StoreViewDialog
        store={selectedStore}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </AppLayout>
  );
};

export default Stores;