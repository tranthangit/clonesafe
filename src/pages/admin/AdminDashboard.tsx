
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Users, AlertTriangle, MapPin, MessageSquare } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, sosRes, supportPointsRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('sos_requests').select('id', { count: 'exact', head: true }),
        supabase.from('support_points').select('id', { count: 'exact', head: true }),
        supabase.from('community_posts').select('id', { count: 'exact', head: true })
      ]);

      return {
        users: usersRes.count || 0,
        sosRequests: sosRes.count || 0,
        supportPoints: supportPointsRes.count || 0,
        communityPosts: postsRes.count || 0
      };
    }
  });

  const { data: recentSOS, isLoading: sosLoading } = useQuery({
    queryKey: ['recent-sos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sos_requests')
        .select(`
          *,
          requester:profiles!user_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats?.users || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Yêu cầu SOS',
      value: stats?.sosRequests || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Điểm hỗ trợ',
      value: stats?.supportPoints || 0,
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Bài đăng',
      value: stats?.communityPosts || 0,
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Tổng quan hệ thống</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent SOS Requests */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Yêu cầu SOS gần đây</h2>
        {sosLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {recentSOS?.map((sos) => (
              <div key={sos.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{sos.type}</p>
                  <p className="text-sm text-gray-600">
                    {sos.requester?.name} - {sos.urgency}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    sos.status === 'active' ? 'bg-red-100 text-red-800' :
                    sos.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {sos.status === 'active' ? 'Đang chờ' :
                     sos.status === 'in_progress' ? 'Đang xử lý' : 'Hoàn thành'}
                  </span>
                </div>
              </div>
            ))}
            {(!recentSOS || recentSOS.length === 0) && (
              <p className="text-gray-500 text-center py-4">Không có yêu cầu SOS nào</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
