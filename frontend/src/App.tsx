import React, { useState, useEffect } from 'react';
import { authAPI, filesAPI } from './services/api';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, File, Download, Trash2, LogOut, HardDrive } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  quota_used: number;
  quota_max: number;
  storage_saved: number;
}

interface FileItem {
  id: number;
  original_name: string;
  size: number;
  is_deduped: boolean;
  downloads: number;
  created_at: string;
  actual_mime_type: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      loadFiles();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.login(loginForm.email, loginForm.password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      toast.success('Welcome back!');
      loadFiles();
    } catch (error: any) {
      toast.error(error.response?.data || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.register(registerForm.username, registerForm.email, registerForm.password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      toast.success('Account created successfully!');
      loadFiles();
    } catch (error: any) {
      toast.error(error.response?.data || 'Registration failed');
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    setLoading(true);
    
    try {
      const response = await filesAPI.uploadFiles(selectedFiles);
      toast.success(`Successfully uploaded ${response.uploaded_files?.length || selectedFiles.length} files`);
      if (response.errors && response.errors.length > 0) {
        response.errors.forEach((error: string) => toast.error(error));
      }
      loadFiles();
      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      toast.error('Upload failed');
    }
    setLoading(false);
  };

  const loadFiles = async () => {
    try {
      const response = await filesAPI.getFiles();
      setFiles(response);
    } catch (error) {
      console.error('Failed to load files');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setFiles([]);
    toast.success('Logged out successfully');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  const quotaPercentage = user ? (user.quota_used / user.quota_max) * 100 : 0;

  // Login/Register Screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <HardDrive className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {showRegister ? 'Create Account' : 'File Vault Login'}
            </h2>
          </div>

          {!showRegister ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="input-field"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="input-field"
                required
              />
              <button type="submit" disabled={loading} className="w-full btn-primary">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                className="input-field"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                className="input-field"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                className="input-field"
                required
              />
              <button type="submit" disabled={loading} className="w-full btn-primary">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="text-center">
            <button
              onClick={() => setShowRegister(!showRegister)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {showRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Demo Admin: admin@filevault.com / admin123</p>
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">File Vault</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user.username}</span>
                {user.role === 'admin' && <span className="ml-2 text-purple-600">(Admin)</span>}
              </div>
              <button onClick={handleLogout} className="btn-secondary">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Storage Used</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatFileSize(user.quota_used)}
                </p>
                <p className="text-sm text-gray-500">of {formatFileSize(user.quota_max)}</p>
              </div>
              <HardDrive className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    quotaPercentage > 90 ? 'bg-red-500' :
                    quotaPercentage > 75 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{quotaPercentage.toFixed(1)}% used</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Files</p>
                <p className="text-2xl font-semibold text-gray-900">{files.length}</p>
              </div>
              <File className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Space Saved</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatFileSize(user.storage_saved)}
                </p>
                <p className="text-sm text-gray-500">by deduplication</p>
              </div>
              <Upload className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Files
          </h2>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          <p className="text-sm text-gray-500 mt-2">
            Select multiple files to upload. Duplicate files will be automatically deduplicated.
          </p>
        </div>

        {/* Files List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">My Files ({files.length})</h2>
          </div>
          
          {files.length === 0 ? (
            <div className="text-center py-12">
              <File className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No files yet</h3>
              <p className="text-gray-500">Upload some files to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file) => (
                <div key={file.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {file.original_name}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.created_at)}</span>
                          {file.is_deduped && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 font-medium">Deduplicated</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Download className="h-4 w-4" />
                        <span>{file.downloads}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default App;