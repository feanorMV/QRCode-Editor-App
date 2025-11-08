
import React, { useState, useEffect } from 'react';
import { DetectedQrCode } from '../types';
import { isValidUrl } from '../utils/helpers';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface QrCodeEditorProps {
  qrCodes: DetectedQrCode[];
  selectedQrId: string | null;
  onQrSelect: (id: string) => void;
  onQrUpdate: (qrCode: DetectedQrCode, newText: string) => void;
  processedFileUrl: string | null;
  originalFilename: string;
  onReset: () => void;
  editedQrCodes: Map<string, string>;
}

export const QrCodeEditor: React.FC<QrCodeEditorProps> = ({
  qrCodes,
  selectedQrId,
  onQrSelect,
  onQrUpdate,
  processedFileUrl,
  originalFilename,
  onReset,
  editedQrCodes
}) => {
  const [editedText, setEditedText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedQr = qrCodes.find(qr => qr.id === selectedQrId);

  useEffect(() => {
    if (selectedQr) {
      setEditedText(editedQrCodes.get(selectedQr.id) || selectedQr.data);
      setValidationError(null);
    } else {
      setEditedText('');
    }
  }, [selectedQrId, selectedQr, editedQrCodes]);

  const handleUpdateClick = () => {
    if (!selectedQr) return;
    const textToValidate = editedText.trim();
    if (isValidUrl(textToValidate)) {
        onQrUpdate(selectedQr, textToValidate);
        setValidationError(null);
    } else if (textToValidate.toLowerCase().startsWith('http:') || textToValidate.toLowerCase().startsWith('https://')) {
        setValidationError('Invalid URL format.');
    } else {
        // Not a URL, allow update
        onQrUpdate(selectedQr, textToValidate);
        setValidationError(null);
    }
  };

  const getModifiedFilename = () => {
    const parts = originalFilename.split('.');
    const ext = parts.pop();
    return `${parts.join('.')}_modified.${ext}`;
  };

  if (qrCodes.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center">
        <QrCodeIcon className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold">No QR Codes Found</h3>
        <p className="text-slate-400 mt-2">We couldn't detect any QR codes in this file or page.</p>
        <button onClick={onReset} className="mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Upload Another File
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4 border-b border-slate-700 pb-2">Found {qrCodes.length} QR Codes</h2>
      <div className="flex-grow overflow-y-auto pr-2">
        {qrCodes.map((qr, index) => (
          <div
            key={qr.id}
            onClick={() => onQrSelect(qr.id)}
            className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
              selectedQrId === qr.id ? 'bg-slate-700 ring-2 ring-cyan-500' : 'bg-slate-900 hover:bg-slate-700/50'
            }`}
          >
            <p className="font-semibold text-slate-300">QR Code #{index + 1}</p>
            <p className="text-sm text-cyan-400 break-words truncate">{editedQrCodes.get(qr.id) || qr.data}</p>
          </div>
        ))}
      </div>
      {selectedQr && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h3 className="font-bold text-lg mb-2">Edit QR Code #{qrCodes.findIndex(qr => qr.id === selectedQrId) + 1}</h3>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
            rows={4}
          />
           {validationError && <p className="text-red-400 text-sm mt-1">{validationError}</p>}
          <button
            onClick={handleUpdateClick}
            disabled={!editedText || editedText === (editedQrCodes.get(selectedQr.id) || selectedQr.data) }
            className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            Update QR Code
          </button>
        </div>
      )}
      <div className="mt-auto pt-4 border-t border-slate-700">
        {processedFileUrl ? (
          <a
            href={processedFileUrl}
            download={getModifiedFilename()}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-center"
          >
            <DownloadIcon className="w-5 h-5"/>
            Download Modified File
          </a>
        ) : (
             <div className="w-full flex items-center justify-center gap-2 bg-slate-700 text-slate-400 font-bold py-3 px-4 rounded-lg transition-colors text-center">
                <DownloadIcon className="w-5 h-5"/>
                Download will be available after editing.
             </div>
        )}
         <button onClick={onReset} className="w-full mt-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Start Over
        </button>
      </div>
    </div>
  );
};
