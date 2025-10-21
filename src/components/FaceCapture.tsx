import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FaceCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel?: () => void;
  mode: "register" | "verify";
}

export const FaceCapture = ({ onCapture, onCancel, mode }: FaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopCamera();
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const handleCancel = () => {
    stopCamera();
    if (onCancel) onCancel();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold">
        {mode === "register" ? "Register Your Face" : "Verify Your Identity"}
      </h3>
      
      <div className="relative w-full max-w-md aspect-video bg-muted rounded-lg overflow-hidden">
        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <img
            src={capturedImage}
            alt="Captured face"
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-2">
        {!capturedImage ? (
          <>
            <Button onClick={captureImage} size="lg">
              <Camera className="mr-2 h-5 w-5" />
              Capture Photo
            </Button>
            {onCancel && (
              <Button onClick={handleCancel} variant="outline" size="lg">
                <X className="mr-2 h-5 w-5" />
                Cancel
              </Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={confirmCapture} size="lg">
              <Check className="mr-2 h-5 w-5" />
              Confirm
            </Button>
            <Button onClick={retake} variant="outline" size="lg">
              <Camera className="mr-2 h-5 w-5" />
              Retake
            </Button>
          </>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-md">
        {mode === "register" 
          ? "Position your face in the frame and capture a clear photo for registration."
          : "Position your face in the frame to verify your identity."
        }
      </p>
    </div>
  );
};
