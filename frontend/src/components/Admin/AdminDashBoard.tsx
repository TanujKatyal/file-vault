import React, { useState, useEffect } from 'react';
import { 
  Users, Files, HardDrive, TrendingUp, 
  Activity, Database 
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { User, StorageStats } from '../../types';
import { adminAPI } from '../../services/api';
import { UserManagement } from './UserManagement';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, logsData] = await Promise.all([
        adminAPI.getStorageStats(),
        adminAPI.getUsers(),
        adminAPI.getAuditLogs(),
      ]);
      
      setStats(statsData);
      setUsers(usersData);
      setAuditLogs(logsData);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'Used Space', value: stats.physical_size, color: '#3B82F6' },
    { name: 'Saved Space', value: stats.space_saved, color: '#10B981' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: TrendingUp },
            { id: 'users', name: 'Users', icon: Users },
            { id: 'logs', name: 'Audit Logs', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Files className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Files</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_files}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Unique Blocks</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.unique_blocks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Storage Saved</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatFileSize(stats.space_saved)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Dedup Ratio</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.efficiency}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Storage Usage Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Efficiency</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatFileSize(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Physical Storage</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Space Saved</span>
                </div>
              </div>
            </div>

            {/* User Stats */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Users</span>
                  <span className="font-semibold">{users.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Admin Users</span>
                  <span className="font-semibold">{users.filter(u => u.role === 'admin').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Quota Used</span>
                  <span className="font-semibold">
                    {formatFileSize(users.reduce((sum, user) => sum + user.quota_used, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Quota Available</span>
                  <span className="font-semibold">
                    {formatFileSize(users.reduce((sum, user) => sum + user.quota_max, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Deduplication Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Logical Size</p>
                <p className="text-xl font-semibold text-gray-900">{formatFileSize(stats.logical_size)}</p>
                <p className="text-xs text-gray-400">Total size if no deduplication</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Physical Size</p>
                <p className="text-xl font-semibold text-gray-900">{formatFileSize(stats.physical_size)}</p>
                <p className="text-xs text-gray-400">Actual storage used</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Space Saved</p>
                <p className="text-xl font-semibold text-green-600">{formatFileSize(stats.space_saved)}</p>
                <p className="text-xs text-gray-400">Storage saved by deduplication</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <UserManagement users={users} onUsersChange={setUsers} />
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.user?.username || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.user?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.action === 'upload' ? 'bg-green-100 text-green-800' :
                        log.action === 'download' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'delete' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
