
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      onFileSelect(file);
    } else {
      alert('Please upload a valid PDF, PNG, JPG, or JPEG file.');
    }
  }, [onFileSelect]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleClick = () => {
    document.getElementById('file-input')?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const dropzoneClasses = `
    w-full max-w-2xl mx-auto p-8 sm:p-12 lg:p-16 border-4 border-dashed rounded-2xl 
    flex flex-col items-center justify-center text-center cursor-pointer 
    transition-all duration-300 ease-in-out transform hover:scale-105
    ${isDragging ? 'border-cyan-400 bg-slate-700' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800'}
  `;

  return (
    <div 
      className={dropzoneClasses}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input 
        id="file-input"
        type="file"
        accept=".pdf, .png, .jpg, .jpeg"
        className="hidden"
        onChange={handleInputChange}
      />
      <UploadIcon className="w-16 h-16 sm:w-20 sm:h-20 text-slate-500 mb-4 transition-colors duration-300" />
      <h2 className="text-xl sm:text-2xl font-bold text-slate-300">
        Drag & Drop Your File Here
      </h2>
      <p className="text-slate-400 mt-2">or click to browse</p>
      <p className="text-xs text-slate-500 mt-4">Supports PDF, PNG, JPG, JPEG</p>
    </div>
  );
};
