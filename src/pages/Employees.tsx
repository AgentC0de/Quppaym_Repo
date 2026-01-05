import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmployeeForm } from "@/components/forms/EmployeeForm";
import { EmployeeViewDialog } from "@/components/dialogs/EmployeeViewDialog";
import { Search, MoreHorizontal, UserCheck, UserX, Loader2, Eye, Pencil, Calendar, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Employee = Database["public"]["Tables"]["employees"]["Row"] & {
  store?: { id: string; name: string } | null;
};

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { employees, isLoading } = useEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) =>
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout title="Employees" subtitle="Team management and task assignments">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Employees" subtitle="Team management and task assignments">
      {/* Actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <EmployeeForm />
      </div>

      {/* Employee Cards Grid */}
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description={searchQuery ? "No employees match your search." : "Add your first employee to get started."}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <div 
              key={employee.id} 
              className="card-luxury p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleViewEmployee(employee)}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{employee.name}</h3>
                    <p className="text-sm text-muted-foreground">{formatRole(employee.role)}</p>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewEmployee(employee)} className="gap-2">
                        <Eye className="h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewEmployee(employee)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit Employee
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Assign Task
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <Calendar className="h-4 w-4" />
                        View Schedule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Store</span>
                  <span className="text-foreground">{employee.store?.name || "Not assigned"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground truncate max-w-[150px]">{employee.email}</span>
                </div>
                {employee.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="text-foreground">{employee.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  {employee.is_active ? (
                    <>
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-600">Active</span>
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Inactive</span>
                    </>
                  )}
                </div>
                <span
                  className={cn(
                    "status-badge",
                    employee.is_active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {employee.is_active ? "active" : "inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmployeeViewDialog
        employee={selectedEmployee}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </AppLayout>
  );
};

export default Employees;