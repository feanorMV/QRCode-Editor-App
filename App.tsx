
import React, { useState, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { DocumentViewer } from './components/DocumentViewer';
import { QrCodeEditor } from './components/QrCodeEditor';
import { Spinner } from './components/Spinner';
import { DetectedQrCode, FileType } from './types';
import { processFileForQrCodes, modifyFileWithNewQr } from './services/fileProcessor';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<DetectedQrCode[]>([]);
  const [editedQrCodes, setEditedQrCodes] = useState<Map<string, string>>(new Map());
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetState = () => {
    setFile(null);
    setFileType(null);
    setFileDataUrl(null);
    setQrCodes([]);
    setEditedQrCodes(new Map());
    setSelectedQrId(null);
    setProcessedFileUrl(null);
    setTotalPages(0);
    setCurrentPage(1);
    if (processedFileUrl) {
      URL.revokeObjectURL(processedFileUrl);
    }
  };

  const handleFileChange = useCallback(async (selectedFile: File) => {
    resetState();
    setIsLoading(true);
    setLoadingMessage('Analyzing file for QR codes...');
    setFile(selectedFile);

    const type = selectedFile.type.startsWith('image/') ? 'image' : selectedFile.type === 'application/pdf' ? 'pdf' : null;
    setFileType(type);

    try {
      const { codes, dataUrl, pageCount } = await processFileForQrCodes(selectedFile, 1);
      setQrCodes(codes);
      setFileDataUrl(dataUrl);
      if (type === 'pdf') {
        setTotalPages(pageCount || 1);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Could not process the file. It might be corrupted or in an unsupported format.");
      resetState();
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [processedFileUrl]);
  
  const handlePageChange = useCallback(async (newPage: number) => {
      if (!file || newPage < 1 || newPage > totalPages) return;
      setIsLoading(true);
      setLoadingMessage(`Loading page ${newPage}...`);
      try {
        const { codes, dataUrl } = await processFileForQrCodes(file, newPage);
        setQrCodes(codes);
        setFileDataUrl(dataUrl);
        setCurrentPage(newPage);
        setSelectedQrId(null);
      } catch (error) {
          console.error(`Error processing page ${newPage}:`, error);
          alert(`Failed to load page ${newPage}.`);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  }, [file, totalPages]);

  const handleQrUpdate = useCallback(async (qrToUpdate: DetectedQrCode, newText: string) => {
    if (!file || !fileType) return;
    setIsLoading(true);
    setLoadingMessage('Replacing QR code and updating file...');
    
    try {
      const { newFileDataUrl, newFileBlob } = await modifyFileWithNewQr(file, fileType, qrToUpdate, newText, currentPage);
      
      const newQrCodes = qrCodes.map(qr => qr.id === qrToUpdate.id ? { ...qr, data: newText } : qr);
      setQrCodes(newQrCodes);
      
      const updatedEditedCodes = new Map(editedQrCodes);
      updatedEditedCodes.set(qrToUpdate.id, newText);
      setEditedQrCodes(updatedEditedCodes);

      if (processedFileUrl) {
        URL.revokeObjectURL(processedFileUrl);
      }
      setProcessedFileUrl(URL.createObjectURL(newFileBlob));
      
      // Re-render the canvas with the modified content for visual feedback
      setFileDataUrl(newFileDataUrl);
      
    } catch (error) {
      console.error("Error updating QR code:", error);
      alert("Failed to update the QR code in the document.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [file, fileType, qrCodes, processedFileUrl, currentPage, editedQrCodes]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          QR Code Editor
        </h1>
        <p className="mt-2 text-slate-400 max-w-2xl mx-auto">
          Upload a PDF or image, and we'll find all QR codes. You can edit their content and download the updated file.
        </p>
      </header>
      
      <main className="flex-grow flex flex-col lg:flex-row gap-6">
        {!file ? (
          <div className="w-full flex items-center justify-center">
             <FileUpload onFileSelect={handleFileChange} />
          </div>
        ) : (
          <>
            <div className="flex-grow lg:w-2/3 xl:w-3/4 bg-slate-800 rounded-lg shadow-2xl p-4 flex flex-col items-center justify-center relative min-h-[60vh] lg:min-h-0">
              {isLoading && <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20 rounded-lg">
                <Spinner />
                <p className="mt-4 text-lg">{loadingMessage}</p>
              </div>}
              <DocumentViewer
                fileDataUrl={fileDataUrl}
                qrCodes={qrCodes}
                selectedQrId={selectedQrId}
                onQrSelect={setSelectedQrId}
                canvasRef={canvasRef}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                fileType={fileType}
              />
            </div>

            <aside className="w-full lg:w-1/3 xl:w-1/4 bg-slate-800 rounded-lg shadow-2xl p-4 flex flex-col">
              <QrCodeEditor
                qrCodes={qrCodes}
                selectedQrId={selectedQrId}
                onQrSelect={setSelectedQrId}
                onQrUpdate={handleQrUpdate}
                processedFileUrl={processedFileUrl}
                originalFilename={file?.name || 'document'}
                onReset={resetState}
                editedQrCodes={editedQrCodes}
              />
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
