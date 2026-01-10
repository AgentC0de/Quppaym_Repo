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
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderForm } from "@/components/forms/OrderForm";
import { OrderViewDialog } from "@/components/dialogs/OrderViewDialog";
import { UpdateOrderStatusDialog } from "@/components/dialogs/UpdateOrderStatusDialog";
import { ScheduleFittingDialog } from "@/components/dialogs/ScheduleFittingDialog";
import { OrderMeasurementsDialog } from "@/components/dialogs/OrderMeasurementsDialog";
import { InvoiceViewDialog } from "@/components/dialogs/InvoiceViewDialog";
import { Crown, MoreHorizontal, Search, Download, Upload, Eye, FileText, ShoppingBag, Loader2, Pencil, MessageCircle, Calendar, Ruler } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { exportTableToPdf, type ColumnDef } from "@/lib/utils";
import { useOrders } from "@/hooks/useOrders";
import { useStores } from "@/hooks/useStores";
import { useOrderStatusSettings } from "@/hooks/useStatusSettings";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

type Order = OrderRow & {
  customer?: { id: string; name: string; phone: string; vip_status: string } | null;
  store?: { id: string; name: string } | null;
  assigned_employee?: { id: string; name: string } | null;
};

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [fittingDialogOpen, setFittingDialogOpen] = useState(false);
  const [measurementsDialogOpen, setMeasurementsDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const { orders, isLoading, error } = useOrders();
  const { stores } = useStores();
  const { orderStatuses } = useOrderStatusSettings();

  if (error) {
    return (
      <AppLayout title="Orders" subtitle="Track and manage all customer orders">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-2">Failed to load orders</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </AppLayout>
    );
  }

  const filteredOrders = useMemo(() => {
    return (orders as Order[]).filter((order) => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesStore = storeFilter === "all" || order.store_id === storeFilter;
      return matchesSearch && matchesStatus && matchesStore;
    });
  }, [orders, searchQuery, statusFilter, storeFilter]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleScheduleFitting = (order: Order) => {
    setSelectedOrder(order);
    setFittingDialogOpen(true);
  };

  const handleViewMeasurements = (order: Order) => {
    setSelectedOrder(order);
    setMeasurementsDialogOpen(true);
  };

  const handleViewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setInvoiceDialogOpen(true);
  };

  const handleWhatsApp = (phone: string | undefined) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (isLoading) {
    return (
      <AppLayout title="Orders" subtitle="Track and manage all customer orders">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Orders" subtitle="Track and manage all customer orders">
      {/* Filters and Actions - stacked on mobile: 1) search, 2) dropdowns, 3) buttons */}
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search (full width on mobile) */}
          <div className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
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
            <div className="flex gap-3 w-full sm:justify-start">
              <div className="w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {orderStatuses && orderStatuses.length > 0 ? (
                      orderStatuses
                        .filter((s) => s.is_active)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.code}>
                            {s.label}
                          </SelectItem>
                        ))
                    ) : (
                      <>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                        <SelectItem value="materials_ordered">Materials Ordered</SelectItem>
                        <SelectItem value="in_production">In Production</SelectItem>
                        <SelectItem value="ready_for_fitting">Ready for Fitting</SelectItem>
                        <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </>
                    )}
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
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="inline">Import</span>
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const cols: ColumnDef<any>[] = [
                      { header: "Order #", render: (r) => r.order_number },
                      { header: "Customer", render: (r) => r.customer_name },
                      { header: "Total", render: (r) => r.total_amount },
                      { header: "Status", render: (r) => r.status },
                      { header: "Placed", render: (r) => format(new Date(r.created_at), "MMM d, yyyy") },
                    ];
                    exportTableToPdf("Orders", cols, filteredOrders);
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span className="inline">Export</span>
                </Button>
              </div>

              <div className="ml-3">
                <OrderForm />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-luxury overflow-hidden p-0">
        {paginatedOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description="No orders match your current filters. Try adjusting your search or filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Order
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell md:px-6">
                      Customer
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Total
                    </th>
                    <th className="hidden px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell md:px-6">
                      Due Date
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleViewOrder(order)}
                    >
                      <td className="whitespace-nowrap px-4 py-4 md:px-6">
                        <div>
                          <span className="font-medium text-foreground">
                            #{order.order_number}
                          </span>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {order.store?.name || "No store"}
                          </p>
                          {/* Mobile: Show customer name */}
                          <p className="mt-1 text-sm text-foreground sm:hidden">
                            {order.customer?.name}
                            {order.customer?.vip_status && order.customer.vip_status !== "regular" && (
                              <Crown className="ml-1 inline h-3 w-3 text-gold" />
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-4 sm:table-cell md:px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{order.customer?.name}</span>
                          {order.customer?.vip_status && order.customer.vip_status !== "regular" && (
                            <Crown className="h-4 w-4 text-gold" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {order.customer?.phone}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 md:px-6">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 md:px-6">
                        <div>
                          <span className="font-medium text-foreground">
                            ₹{Number(order.total_amount).toLocaleString()}
                          </span>
                          {order.status === "cancelled" ? (
                            // Cancelled orders: show settlement status
                            order.is_settled ? (
                              order.deposit_amount > 0 ? (
                                <p className="mt-0.5 text-xs text-green-600">
                                  Refunded & Settled
                                </p>
                              ) : (
                                <p className="mt-0.5 text-xs text-green-600">
                                  Settled
                                </p>
                              )
                            ) : order.deposit_amount > 0 ? (
                              <p className="mt-0.5 text-xs text-red-600">
                                Refund: ₹{Number(order.deposit_amount).toLocaleString()}
                              </p>
                            ) : null
                          ) : order.remaining_balance === 0 && order.total_amount > 0 ? (
                            // Fully paid orders
                            <p className="mt-0.5 text-xs text-green-600">
                              Payment Received
                            </p>
                          ) : order.remaining_balance > 0 ? (
                            // Outstanding balance
                            <p className="mt-0.5 text-xs text-amber-600">
                              Bal: ₹{Number(order.remaining_balance).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-4 text-muted-foreground md:table-cell md:px-6">
                        {order.due_date ? format(new Date(order.due_date), "MMM d, yyyy") : "No due date"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right md:px-6" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewOrder(order)} className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrder(order);
                                setUpdateStatusOpen(true);
                              }}
                              className="gap-2"
                            >
                              <Pencil className="h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewInvoice(order)} className="gap-2">
                              <FileText className="h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleScheduleFitting(order)} className="gap-2">
                              <Calendar className="h-4 w-4" />
                              Schedule Fitting
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewMeasurements(order)} className="gap-2">
                              <Ruler className="h-4 w-4" />
                              View Measurements
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleWhatsApp(order.customer?.phone)} className="gap-2">
                              <MessageCircle className="h-4 w-4" />
                              Send WhatsApp Update
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
          totalItems={filteredOrders.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
      

      <OrderViewDialog
        order={selectedOrder as any}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <UpdateOrderStatusDialog
        order={selectedOrder as any}
        open={updateStatusOpen}
        onOpenChange={setUpdateStatusOpen}
      />

      <ScheduleFittingDialog
        order={selectedOrder as any}
        open={fittingDialogOpen}
        onOpenChange={setFittingDialogOpen}
      />

      <OrderMeasurementsDialog
        order={selectedOrder as any}
        open={measurementsDialogOpen}
        onOpenChange={setMeasurementsDialogOpen}
      />

      <InvoiceViewDialog
        order={selectedOrder as any}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
      />
    </AppLayout>
  );
};

export default Orders;
