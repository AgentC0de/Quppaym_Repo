import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { List, Edit2, Trash2, Plus } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

export function CategorySettings() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Product Categories</p>
          <p className="text-sm text-muted-foreground">Manage categories used for inventory items.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); setName(""); setEditing(null); }}>Cancel</Button>
                <Button onClick={() => {
                  if (!name) return;
                  if (editing) {
                    updateCategory.mutate({ id: editing, name });
                  } else {
                    createCategory.mutate({ name });
                  }
                  setOpen(false);
                  setName("");
                }}>{editing ? "Save" : "Add"}</Button>
              </div>
            </div>
            <DialogFooter />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <List className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(c.id); setName(c.name); setOpen(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteCategory.mutate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CategorySettings;
