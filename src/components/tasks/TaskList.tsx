import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Task {
  id: string;
  title: string;
  orderNumber: string;
  assignee: string;
  dueTime: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="card-luxury overflow-hidden">
      <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Today's Tasks
        </h3>
      </div>
      <div className="divide-y divide-border">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 px-2 py-2 md:px-4 lg:px-5 xl:px-6 transition-colors hover:bg-muted/20",
              task.completed && "opacity-60"
            )}
          >
            <button
              className={cn(
                "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                task.completed
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-border hover:border-primary"
              )}
            >
              {task.completed ? (
                <Check className="h-3 w-3 text-white" />
              ) : (
                <Circle className="h-3 w-3 text-transparent" />
              )}
            </button>
                <div className="flex-1">
              <p
                className={cn(
                  "font-medium",
                  task.completed
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                )}
              >
                {task.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Order #{task.orderNumber} • {task.assignee}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "status-badge",
                  task.priority === "high" && "bg-red-100 text-red-800",
                  task.priority === "medium" && "bg-amber-100 text-amber-800",
                  task.priority === "low" && "bg-blue-100 text-blue-800"
                )}
              >
                {task.priority}
              </span>
              <span className="text-sm text-muted-foreground">{task.dueTime}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
