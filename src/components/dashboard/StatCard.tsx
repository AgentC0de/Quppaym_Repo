import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={cn("card-luxury p-2 md:p-3 lg:p-3 xl:p-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 font-display text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-foreground">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                // show secondary change text only on extra-large screens for compact desktops
                "mt-1 text-sm font-medium hidden xl:block",
                changeType === "positive" && "text-emerald-600",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="flex h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 xl:h-12 xl:w-12 items-center justify-center rounded-xl bg-primary/10">
          {icon}
        </div>
      </div>
    </div>
  );
}
