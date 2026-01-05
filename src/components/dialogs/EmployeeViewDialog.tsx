import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Phone, Mail, Store, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmployees } from "@/hooks/useEmployees";
import { useStores } from "@/hooks/useStores";
import type { Database } from "@/integrations/supabase/types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

const roles: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "store_manager", label: "Store Manager" },
  { value: "sales_associate", label: "Sales Associate" },
  { value: "tailor", label: "Tailor" },
];

const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["admin", "store_manager", "sales_associate", "tailor"]),
  store_id: z.string().optional(),
  hourly_rate: z.number().min(0).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeViewDialogProps {
  employee: (Employee & { store?: { id: string; name: string } | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeViewDialog({ employee, open, onOpenChange }: EmployeeViewDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateAlert, setShowDeactivateAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { updateEmployee, deactivateEmployee, reactivateEmployee, deleteEmployee } = useEmployees();
  const { stores } = useStores();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    values: employee ? {
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      role: employee.role,
      store_id: employee.store_id || "",
      hourly_rate: employee.hourly_rate || 0,
    } : undefined,
  });

  const formatRole = (role: string) => {
    return role.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const handleClose = () => {
    setIsEditing(false);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = (data: EmployeeFormData) => {
    if (!employee) return;
    updateEmployee.mutate(
      {
        id: employee.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        store_id: data.store_id || null,
        hourly_rate: data.hourly_rate || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDeactivate = () => {
    if (!employee) return;
    deactivateEmployee.mutate(employee.id, {
      onSuccess: () => {
        setShowDeactivateAlert(false);
        handleClose();
      },
    });
  };

  const handleReactivate = () => {
    if (!employee) return;
    reactivateEmployee.mutate(employee.id);
  };

  const handleDelete = () => {
    if (!employee) return;
    deleteEmployee.mutate(employee.id, {
      onSuccess: () => {
        setShowDeleteAlert(false);
        handleClose();
      },
    });
  };

  if (!employee) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
                {employee.name.charAt(0)}
              </div>
              <div className="flex-1">
                <DialogTitle className="font-display">{employee.name}</DialogTitle>
                <DialogDescription>
                  {formatRole(employee.role)}
                </DialogDescription>
              </div>
              {employee.is_active ? (
                <div className="flex items-center gap-1 text-emerald-600">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-xs">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <UserX className="h-4 w-4" />
                  <span className="text-xs">Inactive</span>
                </div>
              )}
            </div>
          </DialogHeader>

          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="store_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select store" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateEmployee.isPending}>
                    {updateEmployee.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.store?.name || "Not assigned"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <span className="status-badge bg-primary/10 text-primary">
                    {formatRole(employee.role)}
                  </span>
                  {employee.hourly_rate && (
                    <span className="text-sm text-muted-foreground">
                      ₹{employee.hourly_rate}/hr
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Added on {format(new Date(employee.created_at), "MMM d, yyyy")}
                </div>
              </div>

              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <div className="flex gap-2">
                  {employee.is_active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeactivateAlert(true)}
                      className="gap-2"
                    >
                      <UserX className="h-4 w-4" />
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReactivate}
                      disabled={reactivateEmployee.isPending}
                      className="gap-2 text-emerald-600 hover:text-emerald-700"
                    >
                      <UserCheck className="h-4 w-4" />
                      {reactivateEmployee.isPending ? "Reactivating..." : "Reactivate"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteAlert(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeactivateAlert} onOpenChange={setShowDeactivateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {employee.name}? They will no longer appear in dropdowns or be assignable to orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-amber-600 text-white hover:bg-amber-700">
              {deactivateEmployee.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {employee.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteEmployee.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}