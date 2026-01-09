import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Phone, Mail, Clock, Pencil, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStores } from "@/hooks/useStores";
import type { Database } from "@/integrations/supabase/types";

type Store = Database["public"]["Tables"]["stores"]["Row"];

const storeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  address: z.string().trim().min(1, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(100),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  opening_hours: z.string().trim().max(200).optional(),
});

type StoreFormData = z.infer<typeof storeSchema>;

interface StoreViewDialogProps {
  store: Store | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreViewDialog({ store, open, onOpenChange }: StoreViewDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateAlert, setShowDeactivateAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { updateStore, deleteStore, reactivateStore, permanentDeleteStore } = useStores();

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    values: store ? {
      name: store.name,
      address: store.address,
      city: store.city,
      phone: store.phone || "",
      email: store.email || "",
      opening_hours: store.opening_hours || "",
    } : undefined,
  });

  const handleClose = () => {
    setIsEditing(false);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = (data: StoreFormData) => {
    if (!store) return;
    updateStore.mutate(
      {
        id: store.id,
        name: data.name,
        address: data.address,
        city: data.city,
        phone: data.phone || null,
        email: data.email || null,
        opening_hours: data.opening_hours || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDeactivate = () => {
    if (!store) return;
    deleteStore.mutate(store.id, {
      onSuccess: () => {
        setShowDeactivateAlert(false);
        handleClose();
      },
    });
  };

  const handleReactivate = () => {
    if (!store) return;
    reactivateStore.mutate(store.id, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const handlePermanentDelete = () => {
    if (!store) return;
    permanentDeleteStore.mutate(store.id, {
      onSuccess: () => {
        setShowDeleteAlert(false);
        handleClose();
      },
    });
  };

  if (!store) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{store.name}</DialogTitle>
            <DialogDescription>{store.city}</DialogDescription>
          </DialogHeader>

          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="opening_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Mon-Sat 10am-8pm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateStore.isPending}>
                    {updateStore.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span>{store.address}</span>
                  </div>
                  {store.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{store.email}</span>
                    </div>
                  )}
                  {store.opening_hours && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{store.opening_hours}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`status-badge ${store.is_active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {store.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <div className="flex gap-2">
                  {store.is_active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeactivateAlert(true)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReactivate}
                      disabled={reactivateStore.isPending}
                      className="gap-2 text-emerald-600 hover:text-emerald-700"
                    >
                      {reactivateStore.isPending ? "Reactivating..." : "Reactivate"}
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
            <AlertDialogTitle>Deactivate Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {store.name}? It will no longer appear in active store lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-amber-600 text-white hover:bg-amber-700">
              {deleteStore.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {store.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {permanentDeleteStore.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}