import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, RotateCcw } from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraCapture = ({ open, onClose, onCapture }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStarted(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("Kamerazugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
      } else {
        setError("Kamera konnte nicht gestartet werden.");
      }
    }
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setStarted(false);
      setError(null);
      onClose();
    }
  }, [onClose]);

  // Start camera when dialog opens - called from button click
  const handleStartCamera = useCallback(() => {
    startCamera(facingMode);
  }, [startCamera, facingMode]);

  const handleFlip = useCallback(() => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror if using front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
        // Stop stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setStarted(false);
        onCapture(file);
        onClose();
      }
    }, "image/jpeg", 0.9);
  }, [facingMode, onCapture, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Foto aufnehmen</DialogTitle>
        <div className="relative bg-black aspect-square flex items-center justify-center">
          {!started && !error && (
            <Button onClick={handleStartCamera} variant="secondary" className="gap-2">
              <Camera className="h-5 w-5" /> Kamera starten
            </Button>
          )}
          {error && (
            <p className="text-destructive text-sm text-center px-6">{error}</p>
          )}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""} ${started ? "" : "hidden"}`}
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        {started && (
          <div className="flex items-center justify-center gap-4 p-4 bg-background">
            <Button variant="outline" size="icon" onClick={handleFlip}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className="rounded-full h-16 w-16 p-0"
              onClick={handleCapture}
            >
              <div className="h-12 w-12 rounded-full border-4 border-primary-foreground" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
