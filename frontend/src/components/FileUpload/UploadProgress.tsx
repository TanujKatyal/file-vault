import React from 'react';
import { Upload } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress }) => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <div className="flex flex-col items-center space-y-4">
        <Upload className="h-12 w-12 text-blue-500 animate-pulse" />
        
        <div className="w-full max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Uploading...</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <p className="text-sm text-gray-500">
          Please wait while your files are being uploaded...
        </p>
      </div>
    </div>
  );
};