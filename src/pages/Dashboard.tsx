import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentOrdersTable } from "@/components/orders/RecentOrdersTable";
import { CustomerList } from "@/components/customers/CustomerList";
import { TaskList } from "@/components/tasks/TaskList";
import { ShoppingBag, Users, IndianRupee, Clock, Loader2, Wallet } from "lucide-react";
import { OrderForm } from "@/components/forms/OrderForm";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { useOrders } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useTasks } from "@/hooks/useTasks";
import { useMemo } from "react";

const Dashboard = () => {
  const { orders, isLoading: ordersLoading, error: ordersError } = useOrders();
  const { customers, isLoading: customersLoading, error: customersError } = useCustomers();
  const { tasks, isLoading: tasksLoading, error: tasksError } = useTasks();

  const isLoading = ordersLoading || customersLoading || tasksLoading;
  const error = ordersError || customersError || tasksError;

  if (error) {
    return (
      <AppLayout title="Dashboard" subtitle="Welcome back to Quppayam">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-2">Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </AppLayout>
    );
  }

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime() && o.status === "completed";
    });

    const todaySales = completedToday.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const activeOrders = orders.filter(o => !["completed", "cancelled"].includes(o.status)).length;
    const readyForPickup = orders.filter(o => o.status === "ready_for_pickup").length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newCustomers = customers.filter(c => new Date(c.created_at) >= weekAgo).length;

    const pendingFittings = orders.filter(o => o.status === "ready_for_fitting").length;

    // Calculate total outstanding balance
    const totalOutstanding = orders
      .filter(o => !["completed", "cancelled"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.remaining_balance), 0);

    return { todaySales, activeOrders, readyForPickup, newCustomers, pendingFittings, totalOutstanding };
  }, [orders, customers]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 5).map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer?.name || "Unknown",
      isVip: order.customer?.vip_status !== "regular",
      status: order.status,
      total: Number(order.total_amount),
      paidAmount: Number(order.deposit_amount),
      dueDate: order.due_date ? new Date(order.due_date) : new Date(),
      store: order.store?.name || "No store",
    }));
  }, [orders]);

  const vipCustomers = useMemo(() => {
    return customers
      .filter(c => c.vip_status !== "regular")
      .slice(0, 5)
      .map(c => {
        const ordersForCustomer = orders.filter(o => o.customer?.id === c.id);
        const totalOrders = ordersForCustomer.length;
        const totalSpent = ordersForCustomer.reduce((sum, o) => sum + Number(o.total_amount), 0);
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || "",
          isVip: true,
          totalOrders,
          totalSpent,
          lastVisit: new Date(c.updated_at),
        };
      });
  }, [customers]);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== "completed")
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        orderNumber: t.order?.order_number || "",
        assignee: t.assigned_employee?.name || "Unassigned",
        dueTime: t.due_date ? new Date(t.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        priority: (t.priority >= 3 ? "high" : t.priority >= 2 ? "medium" : "low") as "high" | "medium" | "low",
        completed: t.status === "completed",
      }));
  }, [tasks]);

  if (isLoading) {
    return (
      <AppLayout title="Dashboard" subtitle="Welcome back to Quppayam">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle="Welcome back to Quppayam">
      {/* Quick Actions */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick Actions:</span>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
          <OrderForm />
          <CustomerForm trigger={
            <button className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto">
              <Users className="h-4 w-4" />
              Add Customer
            </button>
          } />
        </div>
      </div>

      {/* Stats Grid - responsive columns: denser as viewport shrinks */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:mb-6">
        <StatCard
          title="Today's Sales"
          value={`₹${stats.todaySales.toLocaleString()}`}
          change={`${stats.activeOrders} active orders`}
          changeType="neutral"
          icon={<IndianRupee className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="Active Orders"
          value={stats.activeOrders.toString()}
          change={`${stats.readyForPickup} ready for pickup`}
          changeType="neutral"
          icon={<ShoppingBag className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="Outstanding"
          value={`₹${stats.totalOutstanding.toLocaleString()}`}
          change="Total balance due"
          changeType={stats.totalOutstanding > 0 ? "negative" : "neutral"}
          icon={<Wallet className="h-6 w-6 text-amber-600" />}
        />
        <StatCard
          title="New Customers"
          value={stats.newCustomers.toString()}
          change="This week"
          changeType="positive"
          icon={<Users className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="Pending Fittings"
          value={stats.pendingFittings.toString()}
          change="Ready for fitting"
          changeType={stats.pendingFittings > 3 ? "negative" : "neutral"}
          icon={<Clock className="h-6 w-6 text-primary" />}
        />
      </div>

      {/* Main Content - stacked vertically on all screen sizes (Recent Orders, Customers, Today's Tasks) */}
      <div className="flex flex-col gap-6">
        <RecentOrdersTable orders={recentOrders} />
        <CustomerList customers={vipCustomers} />
        <TaskList tasks={pendingTasks} />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
