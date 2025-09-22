import React, { useState } from 'react';
import { X, Copy, Share, Lock, Clock, Download } from 'lucide-react';
import { FileNode } from '../../types';
import { sharingAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  file: FileNode;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ file, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState<number>(24); // hours
  const [usePassword, setUsePassword] = useState(false);
  const [useExpiration, setUseExpiration] = useState(true);

  const createShareLink = async () => {
    try {
      setLoading(true);
      const result = await sharingAPI.createShare(
        file.id,
        usePassword ? password : undefined,
        useExpiration ? expiresIn : undefined
      );
      setShareData(result);
      toast.success('Share link created successfully!');
    } catch (error) {
      toast.error('Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const formatExpirationDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Share className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Share File</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* File Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">{file.original_name}</h4>
            <p className="text-sm text-gray-500">
              Size: {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>

          {!shareData ? (
            <>
              {/* Share Options */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3">
                  <input
                    id="usePassword"
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="usePassword" className="flex items-center space-x-2 text-sm text-gray-700">
                    <Lock className="h-4 w-4" />
                    <span>Password protect</span>
                  </label>
                </div>

                {usePassword && (
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full input-field"
                  />
                )}

                <div className="flex items-center space-x-3">
                  <input
                    id="useExpiration"
                    type="checkbox"
                    checked={useExpiration}
                    onChange={(e) => setUseExpiration(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="useExpiration" className="flex items-center space-x-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4" />
                    <span>Set expiration</span>
                  </label>
                </div>

                {useExpiration && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(parseInt(e.target.value) || 24)}
                      className="w-20 input-field"
                    />
                    <span className="text-sm text-gray-600">hours from now</span>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <button
                onClick={createShareLink}
                disabled={loading || (usePassword && !password)}
                className="w-full btn-primary"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating link...
                  </div>
                ) : (
                  'Create Share Link'
                )}
              </button>
            </>
          ) : (
            <>
              {/* Share Link Created */}
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Share className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Share link created!</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={getShareUrl(shareData.token)}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-green-300 rounded-lg bg-white"
                    />
                    <button
                      onClick={() => copyToClipboard(getShareUrl(shareData.token))}
                      className="p-2 text-green-600 hover:text-green-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Share Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  {shareData.expires_at && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Expires: {formatExpirationDate(shareData.expires_at)}</span>
                    </div>
                  )}
                  
                  {password && (
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Password protected</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Downloads: {shareData.downloads}</span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full btn-secondary"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
