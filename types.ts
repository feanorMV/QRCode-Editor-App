import { QRCode } from 'jsqr';

// Fix: The QRCode type from 'jsqr' seems to be incomplete in this environment.
// We are augmenting the DetectedQrCode interface with the properties that are used in the app
// but are reported as missing by the TypeScript compiler.
export interface DetectedQrCode extends QRCode {
  id: string;
  page?: number;
  data: string;
  location: {
    topRightCorner: { x: number; y: number };
    topLeftCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
    topRightFinderPattern: { x: number; y: number };
    topLeftFinderPattern: { x: number; y: number };
    bottomLeftFinderPattern: { x: number; y: number };
    bottomRightAlignmentPattern?: { x: number; y: number };
  };
}

export type FileType = 'pdf' | 'image' | null;
