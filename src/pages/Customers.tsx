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
import { CustomerForm } from "@/components/forms/CustomerForm";
import { CustomerViewDialog } from "@/components/dialogs/CustomerViewDialog";
import { useCustomers } from "@/hooks/useCustomers";
import { Crown, Phone, Mail, MoreHorizontal, Search, Download, Users, Loader2, Eye, Pencil, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { exportTableToPdf, type ColumnDef } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

const Customers = () => {
  const { customers, isLoading } = useCustomers();
  const [searchQuery, setSearchQuery] = useState("");
  const [vipFilter, setVipFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        customer.phone.includes(searchQuery);
      const matchesVip =
        vipFilter === "all" ||
        (vipFilter === "vip" && customer.vip_status !== "regular") ||
        (vipFilter === "regular" && customer.vip_status === "regular");
      return matchesSearch && matchesVip;
    });
  }, [customers, searchQuery, vipFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (isLoading) {
    return (
      <AppLayout title="Customers" subtitle="Manage your customer relationships">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Customers" subtitle="Manage your customer relationships">
      {/* Filters and Actions - stacked on mobile: 1) search, 2) dropdowns, 3) buttons */}
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search */}
          <div className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1 sm:justify-start">
              <div className="w-full sm:w-auto sm:flex-1">
                <Select
                  value={vipFilter}
                  onValueChange={(value) => {
                    setVipFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="VIP Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="vip">VIP Only</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end sm:ml-auto">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const cols: ColumnDef<Customer>[] = [
                      { header: "Name", render: (c) => c.name },
                      { header: "Phone", render: (c) => c.phone },
                      { header: "Email", render: (c) => c.email || "" },
                      { header: "VIP", render: (c) => c.vip_status },
                      { header: "Created", render: (c) => format(new Date(c.created_at), "MMM d, yyyy") },
                    ];
                    exportTableToPdf("Customers", cols, filteredCustomers);
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span className="inline">Export</span>
                </Button>
              </div>

              <div className="ml-3">
                <CustomerForm />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card-luxury overflow-hidden p-0">
        {paginatedCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={customers.length === 0 
              ? "Add your first customer to get started." 
              : "No customers match your current search or filters."}
          />
        ) : (
          <>
            {/* Mobile: stacked customer cards */}
            <div className="space-y-3 sm:hidden">
              {paginatedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="card-luxury p-4 transition-colors hover:bg-muted/20 cursor-pointer"
                  onClick={() => handleViewCustomer(customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{customer.name}</span>
                          {customer.vip_status !== "regular" && (
                            <Crown className="h-4 w-4 text-gold" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{customer.phone}</p>
                        {customer.email && (
                          <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className={`status-badge ${
                        customer.vip_status === "platinum" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" :
                        customer.vip_status === "gold" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                        customer.vip_status === "silver" ? "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400" :
                        "bg-secondary text-secondary-foreground"
                      }`}>{customer.vip_status}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewCustomer(customer)} className="gap-2">View Profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewCustomer(customer)} className="gap-2">Edit Customer</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleWhatsApp(customer.phone)} className="gap-2">Send WhatsApp</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/table view */}
            <div className="overflow-x-auto hidden sm:block">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Customer
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell md:px-6">
                      Contact
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Status
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell md:px-6">
                      Created
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition-colors hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <td className="whitespace-nowrap px-4 py-4 md:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {customer.name}
                              </span>
                              {customer.vip_status !== "regular" && (
                                <Crown className="h-4 w-4 text-gold" />
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                              {customer.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-4 sm:table-cell md:px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 md:px-6">
                        <span className={`status-badge ${
                          customer.vip_status === "platinum" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" :
                          customer.vip_status === "gold" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                          customer.vip_status === "silver" ? "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400" :
                          "bg-secondary text-secondary-foreground"
                        }`}>
                          {customer.vip_status}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-4 text-muted-foreground lg:table-cell md:px-6">
                        {format(new Date(customer.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right md:px-6" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer)} className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer)} className="gap-2">
                              <Pencil className="h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => handleWhatsApp(customer.phone)} className="gap-2">
                              <MessageCircle className="h-4 w-4" />
                              Send WhatsApp
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
          totalItems={filteredCustomers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
      

      <CustomerViewDialog
        customer={selectedCustomer}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </AppLayout>
  );
};

export default Customers;