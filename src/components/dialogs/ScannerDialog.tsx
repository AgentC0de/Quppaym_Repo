import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // onDetected should return true if the detected code resulted in adding an item.
  onDetected: (code: string) => boolean | Promise<boolean>;
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

    // Start scanning. Prefer the rear/environment camera when possible.
    (async () => {
      try {
        // Try constraints with facingMode first (works on most mobile browsers)
        const constraints: MediaStreamConstraints = { video: { facingMode: { ideal: "environment" } } };
        let started = false;
        try {
          // decodeFromConstraints may not be available on all versions; try it and fall back if it fails
          // @ts-ignore - method exists in @zxing/browser
          if (typeof codeReader.decodeFromConstraints === "function") {
            // @ts-ignore
            await codeReader.decodeFromConstraints(constraints, videoRef.current as HTMLVideoElement, async (result, err) => {
              if (result) {
                try {
                  const added = await Promise.resolve(onDetected(result.getText()));
                  if (added) {
                    try { codeReader.reset(); } catch (e) {}
                    onOpenChange(false);
                  }
                } catch (e) {}
              }
            });
            started = true;
          }
        } catch (e) {
          started = false;
        }

        if (!started) {
          // Fallback: pick a device that likely corresponds to the rear camera by checking labels
          const devices = await BrowserMultiFormatReader.listVideoInputDevices();
          let deviceId: string | undefined = undefined;
          if (devices && devices.length > 0) {
            const rear = devices.find((d) => /rear|back|environment|wide|0/i.test(d.label || ""));
            deviceId = (rear && rear.deviceId) || devices[0].deviceId;
          }

          await codeReader.decodeFromVideoDevice(deviceId, videoRef.current as HTMLVideoElement, async (result, err) => {
            if (result) {
              try {
                const added = await Promise.resolve(onDetected(result.getText()));
                if (added) {
                  try { codeReader.reset(); } catch (e) {}
                  onOpenChange(false);
                }
              } catch (e) {}
            }
          });
        }
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
