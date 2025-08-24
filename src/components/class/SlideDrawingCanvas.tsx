import React from "react";

export interface SlideDrawingCanvasProps {
  imageUrl?: string;
  disabled?: boolean;
  onSubmit?: (blob: Blob) => void;
  status?: string;
  fullScreen?: boolean;
}

export const SlideDrawingCanvas: React.FC<SlideDrawingCanvasProps> = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <span className="text-lg font-semibold text-muted-foreground">
        Feature coming soon
      </span>
    </div>
  );
};
