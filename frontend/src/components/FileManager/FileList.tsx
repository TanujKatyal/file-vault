import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Trash2, Share,
  FileText, Image, Music, Video, Archive, File 
} from 'lucide-react';
import { FileNode, SearchFilters } from '../../types';
import { filesAPI } from '../../services/api';
import { SearchFilters as SearchFiltersComponent } from './SearchFilters';
import { ShareDialog } from '../Sharing/ShareDialog';
import toast from 'react-hot-toast';

export const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadFiles();
  }, [filters, searchTerm]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const searchFilters = {
        ...filters,
        ...(searchTerm && { name: searchTerm }),
      };
      const data = await filesAPI.getFiles(searchFilters);
      setFiles(data);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-6 w-6" />;
    if (mimeType.startsWith('video/')) return <Video className="h-6 w-6" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-6 w-6" />;
    if (mimeType.includes('pdf') || mimeType.startsWith('text/')) return <FileText className="h-6 w-6" />;
    if (mimeType.includes('zip') || mimeType.includes('tar')) return <Archive className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

    const downloadFile = async (file: FileNode) => {
    console.log('=== DOWNLOAD BUTTON CLICKED ===');
    console.log('File details:', file);
    
    try {
      console.log('Starting download for file:', file.id, file.original_name);
      
      const response = await filesAPI.downloadFile(file.id);
      console.log('Download response received:', response);
      
      // Check if response is valid
      if (!response.data) {
        console.error('No data received from server');
        throw new Error('No data received from server');
      }
      
      console.log('Creating blob URL...');
      const url = window.URL.createObjectURL(response.data);
      console.log('Blob URL created:', url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      
      console.log('Triggering download...');
      document.body.appendChild(a);
      a.click();
      
      console.log('Cleaning up...');
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Download completed successfully');
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('=== DOWNLOAD ERROR ===');
      console.error('Full error object:', error);
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        console.error('Error response headers:', error.response.headers);
        toast.error(`Failed to download file: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error('Failed to download file: No response from server');
      } else {
        console.error('Error message:', error.message);
        toast.error(`Failed to download file: ${error.message}`);
      }
    }
  };

  const deleteFile = async (file: FileNode) => {
    if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) return;
    
    try {
      await filesAPI.deleteFile(file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const openShareDialog = (file: FileNode) => {
    setSelectedFile(file);
    setShowShareDialog(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <SearchFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Files Display */}
      {files.length === 0 ? (
        <div className="text-center py-12">
          <File className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No files found</h3>
          <p className="text-gray-500">Upload some files to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {files.map((file) => (
            <div key={file.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-500">
                  {getFileIcon(file.actual_mime_type)}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      console.log('Download button clicked for file:', file.id);
                      downloadFile(file);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openShareDialog(file)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    title="Share"
                  >
                    <Share className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteFile(file)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-medium text-gray-900 truncate mb-2" title={file.original_name}>
                {file.original_name}
              </h3>
              
              <div className="text-sm text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{formatFileSize(file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Downloads:</span>
                  <span>{file.downloads}</span>
                </div>
                {file.is_deduped && (
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Deduplicated
                  </span>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {formatDate(file.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-gray-500 mr-3">
                          {getFileIcon(file.actual_mime_type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {file.original_name}
                          </div>
                          {file.is_deduped && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded mt-1">
                              Deduplicated
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.actual_mime_type.split('/')[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {file.downloads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            console.log('Download button clicked (list view) for file:', file.id);
                            downloadFile(file);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openShareDialog(file)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Share className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteFile(file)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {showShareDialog && selectedFile && (
        <ShareDialog
          file={selectedFile}
          onClose={() => {
            setShowShareDialog(false);
            setSelectedFile(null);
          }}
        />
      )}
    </div>
  );
};
