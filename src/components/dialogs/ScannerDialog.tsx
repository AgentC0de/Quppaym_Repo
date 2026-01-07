import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}

export function ScannerDialog({ open, onOpenChange, onDetected }: ScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (e) {}
        readerRef.current = null;
      }
      setScanning(false);
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;
    setScanning(true);

    // Choose first available video device
    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices && devices.length > 0 ? devices[0].deviceId : undefined;
        await codeReader.decodeFromVideoDevice(deviceId, videoRef.current as HTMLVideoElement, (result, err) => {
          if (result) {
            try {
              onDetected(result.getText());
            } finally {
              codeReader.reset();
              onOpenChange(false);
            }
          }
        });
      } catch (err) {
        // If something goes wrong, stop scanning and close
        try {
          codeReader.reset();
        } catch (e) {}
        onOpenChange(false);
      }
    })();

    return () => {
      try {
        codeReader.reset();
      } catch (e) {}
      readerRef.current = null;
      setScanning(false);
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan SKU</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="w-full h-64 bg-black/5 rounded overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
