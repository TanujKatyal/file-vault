import { useState } from 'react';
import { filesAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFiles = async (files: File[], directory?: string) => {
    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await filesAPI.uploadFiles(files, directory);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);

      toast.success(`Successfully uploaded ${files.length} file(s)`);
      return result;
    } catch (error) {
      setUploading(false);
      setProgress(0);
      toast.error('Upload failed');
      throw error;
    }
  };

  return {
    uploading,
    progress,
    uploadFiles,
  };
};