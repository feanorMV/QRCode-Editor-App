import React, { useEffect, RefObject } from 'react';
import { DetectedQrCode, FileType } from '../types';

interface DocumentViewerProps {
  fileDataUrl: string | null;
  qrCodes: DetectedQrCode[];
  selectedQrId: string | null;
  onQrSelect: (id: string) => void;
  canvasRef: RefObject<HTMLCanvasElement>;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  fileType: FileType;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  fileDataUrl,
  qrCodes,
  selectedQrId,
  onQrSelect,
  canvasRef,
  currentPage,
  totalPages,
  onPageChange,
  fileType,
}) => {

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fileDataUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.src = fileDataUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      drawQrCodeOutlines(ctx, qrCodes, selectedQrId);
    };
    img.onerror = () => {
        console.error("Failed to load image for canvas.");
    }
  }, [fileDataUrl, qrCodes, selectedQrId, canvasRef]);

  const drawQrCodeOutlines = (
    ctx: CanvasRenderingContext2D,
    codes: DetectedQrCode[],
    selectedId: string | null
  ) => {
    codes.forEach((code) => {
      // Fix: Use correct corner property names from the 'jsqr' location object.
      const { topLeftCorner: topLeft, topRightCorner: topRight, bottomLeftCorner: bottomLeft, bottomRightCorner: bottomRight } = code.location;
      
      const isSelected = code.id === selectedId;

      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(bottomLeft.x, bottomLeft.y);
      ctx.closePath();
      
      ctx.lineWidth = isSelected ? 6 : 4;
      ctx.strokeStyle = isSelected ? 'rgb(22 163 74)' : 'rgb(34 197 94)';
      ctx.fillStyle = isSelected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)';

      ctx.stroke();
      ctx.fill();
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Find if a QR code was clicked
    const clickedQr = qrCodes.find(qr => {
        // Fix: Use correct corner property names from the 'jsqr' location object.
        const {topLeftCorner: topLeft, topRightCorner: topRight, bottomLeftCorner: bottomLeft, bottomRightCorner: bottomRight} = qr.location;
        // Simple bounding box check
        const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    });

    if (clickedQr) {
        onQrSelect(clickedQr.id);
    }
  };

  const Pagination = () => {
    if (fileType !== 'pdf' || totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
        >
          &larr; Prev
        </button>
        <span className="text-slate-400">Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
        >
          Next &rarr;
        </button>
      </div>
    );
  };
  
  return (
    <>
        <div className="w-full h-full flex items-center justify-center overflow-auto">
            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain rounded-md" onClick={handleCanvasClick} />
        </div>
        <Pagination />
    </>
  );
};
