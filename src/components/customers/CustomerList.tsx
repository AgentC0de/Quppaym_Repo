import { Crown, Phone, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  isVip: boolean;
  totalOrders: number;
  totalSpent: number;
  lastVisit: Date;
}

interface CustomerListProps {
  customers: Customer[];
}

export function CustomerList({ customers }: CustomerListProps) {
  return (
    <div className="card-luxury overflow-hidden">
      <div className="border-b border-border px-2 py-2 md:px-4 lg:px-5 xl:px-6 lg:py-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          VIP Customers
        </h3>
      </div>
      <div className="divide-y divide-border">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="flex items-center justify-between px-2 py-2 md:px-4 lg:px-5 xl:px-6 transition-colors hover:bg-muted/20"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
                {customer.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {customer.name}
                  </span>
                  {customer.isVip && (
                    <Crown className="h-4 w-4 text-gold" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{customer.phone}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium text-foreground">
                  ₹{customer.totalSpent.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {customer.totalOrders} orders
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                  <DropdownMenuItem>New Order</DropdownMenuItem>
                  <DropdownMenuItem>Send WhatsApp</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
