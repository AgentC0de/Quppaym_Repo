import { useState } from "react";
import { Ruler, Plus, Trash2, GripVertical, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMeasurementTemplates, TemplateField } from "@/hooks/useMeasurementTemplates";
import { allPossibleTemplateFields, getDefaultTemplateFields } from "@/lib/measurementFields";

export function MeasurementTemplateSettings() {
  const { templates, isLoading, updateTemplate, createTemplate, deleteTemplate } = useMeasurementTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newGarmentName, setNewGarmentName] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleFieldToggle = (fieldName: string, enabled: boolean) => {
    if (!selectedTemplate) return;
    
    const updatedFields = selectedTemplate.fields.map(f => 
      f.name === fieldName ? { ...f, enabled } : f
    );
    
    updateTemplate.mutate({ id: selectedTemplate.id, fields: updatedFields });
  };

  const handleAddField = (field: TemplateField) => {
    if (!selectedTemplate) return;
    
    // Check if field already exists
    if (selectedTemplate.fields.some(f => f.name === field.name)) return;
    
    const updatedFields = [...selectedTemplate.fields, { ...field, enabled: true }];
    updateTemplate.mutate({ id: selectedTemplate.id, fields: updatedFields });
  };

  const handleRemoveField = (fieldName: string) => {
    if (!selectedTemplate) return;
    
    const updatedFields = selectedTemplate.fields.filter(f => f.name !== fieldName);
    updateTemplate.mutate({ id: selectedTemplate.id, fields: updatedFields });
  };

  const handleCreateTemplate = () => {
    if (!newGarmentName.trim()) return;
    
    createTemplate.mutate(
      { 
        garment_type: newGarmentName.trim(), 
        fields: getDefaultTemplateFields() as TemplateField[]
      },
      {
        onSuccess: () => {
          setNewGarmentName("");
          setAddDialogOpen(false);
        }
      }
    );
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate.mutate(id);
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const availableFieldsToAdd = allPossibleTemplateFields.filter(
    af => !selectedTemplate?.fields.some(f => f.name === af.name)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Garment Templates</h3>
          <p className="text-sm text-muted-foreground">
            Configure which measurement fields appear for each garment type
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Garment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Garment Type</DialogTitle>
              <DialogDescription>
                Create a new garment template with customizable measurement fields.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="garmentName">Garment Name</Label>
              <Input
                id="garmentName"
                placeholder="e.g., Kurta, Saree Blouse"
                value={newGarmentName}
                onChange={(e) => setNewGarmentName(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTemplate} 
                disabled={!newGarmentName.trim() || createTemplate.isPending}
              >
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Template List */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Garment Types</Label>
          <ScrollArea className="h-[300px] rounded-lg border border-border">
            <div className="p-2 space-y-1">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTemplateId === template.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div className="flex items-center gap-3">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{template.garment_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.fields.filter(f => f.enabled).length} fields enabled
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the "{template.garment_type}" template? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No templates yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Field Configuration */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {selectedTemplate ? `Fields for "${selectedTemplate.garment_type}"` : "Select a template"}
          </Label>
          <ScrollArea className="h-[300px] rounded-lg border border-border">
            {selectedTemplate ? (
              <div className="p-2 space-y-1">
                {selectedTemplate.fields.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <span className="font-medium">{field.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={(checked) => handleFieldToggle(field.name, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveField(field.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {availableFieldsToAdd.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-xs text-muted-foreground px-3 py-1">Add more fields:</p>
                    <div className="flex flex-wrap gap-2 px-3 py-2">
                      {availableFieldsToAdd.map((field) => (
                        <Button
                          key={field.name}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleAddField(field as TemplateField)}
                        >
                          <Plus className="h-3 w-3" />
                          {field.label}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Select a template to configure fields</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
