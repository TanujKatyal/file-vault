import React from 'react';
import { FileList } from '../components/FileManager/FileList';
import { DragDropUpload } from '../components/FileUpload/DragDropUpload';

export const Files: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Files</h1>
        <p className="text-gray-600">
          Manage and organize your files with advanced search and sharing capabilities
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <DragDropUpload onUploadComplete={() => window.location.reload()} />
      </div>

      {/* File List */}
      <FileList />
    </div>
  );
};
