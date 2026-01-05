import { format } from "date-fns";
import { OrderStatusBadge, OrderStatus } from "./OrderStatusBadge";
import { Crown } from "lucide-react";

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  isVip: boolean;
  status: OrderStatus;
  total: number;
  paidAmount: number;
  dueDate: Date;
  store: string;
}

interface RecentOrdersTableProps {
  orders: Order[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div className="card-luxury overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Recent Orders
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Due Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="transition-colors hover:bg-muted/20"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-medium text-foreground">
                    #{order.orderNumber}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{order.customerName}</span>
                    {order.isVip && (
                      <Crown className="h-4 w-4 text-gold" />
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-foreground">
                  ₹{order.total.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={
                      order.total - order.paidAmount > 0
                        ? "font-medium text-amber-600"
                        : "text-muted-foreground"
                    }
                  >
                    ₹{(order.total - order.paidAmount).toLocaleString()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                  {format(order.dueDate, "MMM d, yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
