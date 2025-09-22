import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  HardDrive, Files, Settings, LogOut, User, 
  Menu, X 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const quotaPercentage = user ? (user.quota_used / user.quota_max) * 100 : 0;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HardDrive },
    { name: 'My Files', href: '/files', icon: Files },
    ...(isAdmin() ? [{ name: 'Admin Panel', href: '/admin', icon: Settings }] : []),
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <HardDrive className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">File Vault</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex ml-8 space-x-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Quota Display */}
            {user && (
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <div className="flex flex-col items-end">
                  <span className="text-xs">
                    {formatFileSize(user.quota_used)} / {formatFileSize(user.quota_max)}
                  </span>
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        quotaPercentage > 90 ? 'bg-red-500' :
                        quotaPercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:block text-sm text-gray-700">
                <div className="font-medium">{user?.username}</div>
                <div className="text-xs text-gray-500">{user?.role}</div>
              </div>
              
              <div className="bg-gray-300 p-2 rounded-full">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Mobile Quota Display */}
            {user && (
              <div className="px-3 py-2 border-t border-gray-200 mt-2">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between items-center mb-1">
                    <span>Storage Used</span>
                    <span>{formatFileSize(user.quota_used)} / {formatFileSize(user.quota_max)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        quotaPercentage > 90 ? 'bg-red-500' :
                        quotaPercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
