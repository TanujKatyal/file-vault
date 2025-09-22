import React, { useState } from 'react';
import { User } from '../../types';
import { adminAPI } from '../../services/api';
import { Edit, Save, X, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserManagementProps {
  users: User[];
  onUsersChange: (users: User[]) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, onUsersChange }) => {
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editQuota, setEditQuota] = useState<string>('');

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
    });
  };

  const startEditing = (user: User) => {
    setEditingUser(user.id);
    setEditQuota((user.quota_max / (1024 * 1024)).toString()); // Convert to MB
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditQuota('');
  };

  const saveQuota = async (userId: number) => {
    try {
      const quotaBytes = parseFloat(editQuota) * 1024 * 1024; // Convert MB to bytes
      const updatedUser = await adminAPI.updateUserQuota(userId, quotaBytes);
      
      onUsersChange(users.map(user => 
        user.id === userId ? updatedUser : user
      ));
      
      setEditingUser(null);
      setEditQuota('');
      toast.success('User quota updated successfully');
    } catch (error) {
      toast.error('Failed to update user quota');
    }
  };

  const getQuotaUsagePercentage = (used: number, max: number) => {
    return max > 0 ? (used / max) * 100 : 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        <p className="text-sm text-gray-500">Manage user quotas and permissions</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quota Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Storage Saved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const quotaPercentage = getQuotaUsagePercentage(user.quota_used, user.quota_max);
              const isEditing = editingUser === user.id;

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          {user.role === 'admin' ? (
                            <UserCheck className="h-5 w-5 text-gray-600" />
                          ) : (
                            <UserX className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{formatFileSize(user.quota_used)}</span>
                        <span className="text-gray-500">
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <span>/</span>
                              <input
                                type="number"
                                value={editQuota}
                                onChange={(e) => setEditQuota(e.target.value)}
                                className="w-16 px-1 py-0 text-xs border border-gray-300 rounded"
                                min="1"
                                step="1"
                              />
                              <span>MB</span>
                            </div>
                          ) : (
                            `/ ${formatFileSize(user.quota_max)}`
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            quotaPercentage > 90 ? 'bg-red-500' :
                            quotaPercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {quotaPercentage.toFixed(1)}% used
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="text-green-600 font-medium">
                      {formatFileSize(user.storage_saved)}
                    </div>
                    <div className="text-xs text-gray-500">
                      by deduplication
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveQuota(user.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Save"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-900"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit quota"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
};
