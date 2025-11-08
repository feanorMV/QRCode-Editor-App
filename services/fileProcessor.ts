import jsQR from 'jsqr';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import qrcode from 'qrcode';
import { DetectedQrCode, FileType } from '../types';

const RENDER_SCALE = 2.0;

async function renderPdfPageToDataUrl(pdfDoc: any, pageNum: number): Promise<string> {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    return canvas.toDataURL('image/png');
}

async function scanCanvasForQrCodes(canvas: HTMLCanvasElement): Promise<DetectedQrCode[]> {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const codes = jsQR(imageData.data, imageData.width, imageData.height);
    if (!codes) return [];
    
    // jsQR can return a single object or an array, so we normalize it
    const codesArray = Array.isArray(codes) ? codes : [codes];

    return codesArray.map((code, index) => ({
        ...code,
        id: `${Date.now()}-${index}`
    }));
}


export async function processFileForQrCodes(file: File, pageNum: number): Promise<{ codes: DetectedQrCode[], dataUrl: string, pageCount?: number }> {
    const fileBuffer = await file.arrayBuffer();
    
    if (file.type === 'application/pdf') {
        const pdfDoc = await (window as any).pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const dataUrl = await renderPdfPageToDataUrl(pdfDoc, pageNum);

        const img = new Image();
        return new Promise((resolve, reject) => {
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if(!ctx) return reject(new Error("No canvas context"));
                ctx.drawImage(img, 0, 0);
                const codes = await scanCanvasForQrCodes(canvas);
                resolve({ codes, dataUrl, pageCount: pdfDoc.numPages });
            };
            img.onerror = () => reject(new Error("Failed to load PDF page as image"));
            img.src = dataUrl;
        });

    } else if (file.type.startsWith('image/')) {
        const dataUrl = URL.createObjectURL(file);
        const img = new Image();
        return new Promise((resolve, reject) => {
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if(!ctx) return reject(new Error("No canvas context"));
                ctx.drawImage(img, 0, 0);
                const codes = await scanCanvasForQrCodes(canvas);
                resolve({ codes, dataUrl });
                URL.revokeObjectURL(dataUrl);
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = dataUrl;
        });
    }

    throw new Error('Unsupported file type');
}


export async function modifyFileWithNewQr(
    originalFile: File,
    fileType: FileType,
    qrToReplace: DetectedQrCode,
    newText: string,
    currentPage: number
): Promise<{ newFileDataUrl: string, newFileBlob: Blob }> {
    const newQrDataUrl = await qrcode.toDataURL(newText, {
        errorCorrectionLevel: 'H',
        margin: 1,
    });
    
    if (fileType === 'pdf') {
        return modifyPdf(originalFile, qrToReplace, newQrDataUrl, currentPage);
    } else if (fileType === 'image') {
        return modifyImage(originalFile, qrToReplace, newQrDataUrl);
    }
    
    throw new Error('Unsupported file type for modification.');
}


async function modifyPdf(
    pdfFile: File,
    qrToReplace: DetectedQrCode,
    newQrDataUrl: string,
    pageNum: number
): Promise<{ newFileDataUrl: string, newFileBlob: Blob }> {
    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[pageNum - 1];
    
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    const newQrImageBytes = await fetch(newQrDataUrl).then(res => res.arrayBuffer());
    const newQrImage = await pdfDoc.embedPng(newQrImageBytes);
    
    // Fix: Use correct corner property names from the 'jsqr' location object.
    const { topLeftCorner: topLeft, topRightCorner: topRight, bottomLeftCorner: bottomLeft } = qrToReplace.location;
    
    // Calculate position and size in PDF points.
    // We need to convert from canvas pixel coordinates (scaled by RENDER_SCALE, y-down from top-left)
    // to PDF points (unscaled, y-up from bottom-left).
    const canvasWidth = Math.sqrt(Math.pow(topRight.x - topLeft.x, 2) + Math.pow(topRight.y - topLeft.y, 2));
    const canvasHeight = Math.sqrt(Math.pow(bottomLeft.x - topLeft.x, 2) + Math.pow(bottomLeft.y - topLeft.y, 2));
    
    const qrWidthInPoints = canvasWidth / RENDER_SCALE;
    const qrHeightInPoints = canvasHeight / RENDER_SCALE;
    const qrXInPoints = topLeft.x / RENDER_SCALE;
    const qrYInPoints = pageHeight - (topLeft.y / RENDER_SCALE) - qrHeightInPoints;
    
    // Cover old QR code with a white rectangle
    page.drawRectangle({
        x: qrXInPoints,
        y: qrYInPoints,
        width: qrWidthInPoints,
        height: qrHeightInPoints,
        color: rgb(1, 1, 1),
    });

    // Draw new QR code
    page.drawImage(newQrImage, {
        x: qrXInPoints,
        y: qrYInPoints,
        width: qrWidthInPoints,
        height: qrHeightInPoints,
    });

    const pdfBytes = await pdfDoc.save();
    const newFileBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    const pdfJsDoc = await (window as any).pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const newFileDataUrl = await renderPdfPageToDataUrl(pdfJsDoc, pageNum);

    return { newFileDataUrl, newFileBlob };
}

async function modifyImage(
    imageFile: File,
    qrToReplace: DetectedQrCode,
    newQrDataUrl: string
): Promise<{ newFileDataUrl: string, newFileBlob: Blob }> {

    return new Promise((resolve, reject) => {
        const originalImg = new Image();
        const newQrImg = new Image();
        
        let loadedCount = 0;
        const onLoaded = () => {
            loadedCount++;
            if (loadedCount === 2) {
                const canvas = document.createElement('canvas');
                canvas.width = originalImg.width;
                canvas.height = originalImg.height;
                const ctx = canvas.getContext('2d');
                if(!ctx) return reject(new Error("No canvas context"));

                // 1. Draw original image
                ctx.drawImage(originalImg, 0, 0);

                // 2. Cover old QR
                // Fix: Use correct corner property names from the 'jsqr' location object.
                const { topLeftCorner: topLeft, topRightCorner: topRight, bottomLeftCorner: bottomLeft, bottomRightCorner: bottomRight } = qrToReplace.location;
                ctx.beginPath();
                ctx.moveTo(topLeft.x, topLeft.y);
                ctx.lineTo(topRight.x, topRight.y);
                ctx.lineTo(bottomRight.x, bottomRight.y);
                ctx.lineTo(bottomLeft.x, bottomLeft.y);
                ctx.closePath();
                ctx.fillStyle = 'white';
                ctx.fill();

                // 3. Draw new QR
                const width = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
                const height = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
                
                // Approximate rotation and draw rotated. A simpler axis-aligned box is easier.
                const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
                const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
                const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
                const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
                const boxWidth = maxX - minX;
                const boxHeight = maxY - minY;

                ctx.drawImage(newQrImg, minX, minY, boxWidth, boxHeight);
                
                const newFileDataUrl = canvas.toDataURL(imageFile.type);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({ newFileDataUrl, newFileBlob: blob });
                    } else {
                        reject(new Error("Failed to create blob from canvas"));
                    }
                }, imageFile.type);
            }
        };
        
        originalImg.onload = onLoaded;
        newQrImg.onload = onLoaded;
        originalImg.onerror = () => reject(new Error("Failed to load original image for modification"));
        newQrImg.onerror = () => reject(new Error("Failed to load new QR image for modification"));
        
        originalImg.src = URL.createObjectURL(imageFile);
        newQrImg.src = newQrDataUrl;
    });
}