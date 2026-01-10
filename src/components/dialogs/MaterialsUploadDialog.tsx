import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MaterialsUploadDialogProps {
  measurementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function MaterialsUploadDialog({ 
  measurementId, 
  open, 
  onOpenChange, 
  onComplete 
}: MaterialsUploadDialogProps) {
  const [materialsProvided, setMaterialsProvided] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Invalid file type",
            description: "Please upload only image files.",
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${measurementId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from("materials")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("materials")
          .getPublicUrl(fileName);

        newImages.push(urlData.publicUrl);
      }

      setUploadedImages((prev) => [...prev, ...newImages]);
      toast({
        title: "Images uploaded",
        description: `${newImages.length} image(s) uploaded successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    // Extract the file path from the URL
    const urlParts = imageUrl.split("/materials/");
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from("materials").remove([filePath]);
    }
    setUploadedImages((prev) => prev.filter((url) => url !== imageUrl));
  };

  const handleSave = async () => {
    if (!measurementId || materialsProvided === null) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("measurements")
        .update({
          materials_provided_by_customer: materialsProvided === "yes",
          materials_images: materialsProvided === "yes" ? uploadedImages : [],
        })
        .eq("id", measurementId);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Measurement details updated successfully.",
      });
      
      handleClose();
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setMaterialsProvided(null);
    setUploadedImages([]);
    onOpenChange(false);
  };

  const handleSkip = () => {
    handleClose();
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Materials Information</DialogTitle>
          <DialogDescription>
            Were materials provided by the customer for this order?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="materialsProvided"
                value="yes"
                checked={materialsProvided === "yes"}
                onChange={() => setMaterialsProvided("yes")}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Yes, customer provided materials</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="materialsProvided"
                value="no"
                checked={materialsProvided === "no"}
                onChange={() => setMaterialsProvided("no")}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">No, using store materials</span>
            </label>
          </div>

          {materialsProvided === "yes" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Upload Material Images</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Take photos of the materials for reference
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Images
                  </>
                )}
              </Button>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Material ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(url)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button
            onClick={handleSave}
            disabled={materialsProvided === null || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
