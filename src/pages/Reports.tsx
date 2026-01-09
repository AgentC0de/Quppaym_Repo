import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/StatCard";
import { Download, IndianRupee, ShoppingBag, Users, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const revenueData = [
  { month: "Jul", revenue: 420000 },
  { month: "Aug", revenue: 580000 },
  { month: "Sep", revenue: 650000 },
  { month: "Oct", revenue: 720000 },
  { month: "Nov", revenue: 890000 },
  { month: "Dec", revenue: 1150000 },
];

const storeData = [
  { name: "T. Nagar", revenue: 485000, orders: 124 },
  { name: "Anna Nagar", revenue: 392000, orders: 98 },
  { name: "Velachery", revenue: 168000, orders: 56 },
];

const categoryData = [
  { name: "Bridal Wear", value: 45 },
  { name: "Saree Blouses", value: 25 },
  { name: "Kurtas", value: 15 },
  { name: "Alterations", value: 10 },
  { name: "Others", value: 5 },
];

const COLORS = ["hsl(345, 60%, 28%)", "hsl(42, 70%, 50%)", "hsl(345, 40%, 45%)", "hsl(36, 30%, 70%)", "hsl(36, 20%, 85%)"];

const Reports = () => {
  return (
    <AppLayout title="Reports" subtitle="Business analytics and insights">
      <div className="mb-4 flex items-center">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Reports are temporarily disabled for updates.</p>
        </div>
        <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
          <div className="hidden sm:block ml-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
              Update Required
            </span>
          </div>
        </div>
      </div>

      <div className="opacity-60 pointer-events-none select-none">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select defaultValue="this_month">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="anna_nagar">Anna Nagar</SelectItem>
              <SelectItem value="t_nagar">T. Nagar</SelectItem>
              <SelectItem value="velachery">Velachery</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="₹10,45,000"
          change="+18.2% vs last month"
          changeType="positive"
          icon={<IndianRupee className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="Orders Completed"
          value="278"
          change="+12 vs last month"
          changeType="positive"
          icon={<ShoppingBag className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="New Customers"
          value="45"
          change="+8 vs last month"
          changeType="positive"
          icon={<Users className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="Avg. Order Value"
          value="₹3,760"
          change="+5.4% vs last month"
          changeType="positive"
          icon={<TrendingUp className="h-6 w-6 text-primary" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="card-luxury p-6">
          <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
            Revenue Trend
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(345, 60%, 28%)"
                  strokeWidth={3}
                  dot={{ fill: "hsl(345, 60%, 28%)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Store */}
        <div className="card-luxury p-6">
          <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
            Revenue by Store
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeData} layout="vertical">
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(345, 60%, 28%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="card-luxury p-6">
          <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
            Sales by Category
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="card-luxury p-6">
          <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
            Top Products
          </h3>
          <div className="space-y-4">
            {[
              { name: "Bridal Lehenga Custom", orders: 45, revenue: 2250000 },
              { name: "Kanjivaram Saree Blouse", orders: 89, revenue: 445000 },
              { name: "Designer Kurta Set", orders: 67, revenue: 335000 },
              { name: "Silk Saree Alterations", orders: 156, revenue: 234000 },
              { name: "Party Wear Blouse", orders: 78, revenue: 195000 },
            ].map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.orders} orders</p>
                  </div>
                </div>
                <p className="font-medium text-foreground">
                  ₹{(product.revenue / 1000).toFixed(0)}k
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
};

export default Reports;