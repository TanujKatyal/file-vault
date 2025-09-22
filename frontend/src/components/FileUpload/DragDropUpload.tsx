import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileIcon } from 'lucide-react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { UploadProgress } from './UploadProgress';

interface DragDropUploadProps {
  onUploadComplete?: () => void;
  directory?: string;
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({ 
  onUploadComplete, 
  directory 
}) => {
  const { uploadFiles, uploading, progress } = useFileUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      try {
        await uploadFiles(acceptedFiles, directory);
        onUploadComplete?.();
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [uploadFiles, directory, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  if (uploading) {
    return <UploadProgress progress={progress} />;
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center space-y-4">
        {isDragActive ? (
          <Upload className="h-12 w-12 text-blue-500" />
        ) : (
          <FileIcon className="h-12 w-12 text-gray-400" />
        )}
        
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag & drop files here, or click to select files'
            }
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Upload multiple files at once
          </p>
        </div>
      </div>
    </div>
  );
};