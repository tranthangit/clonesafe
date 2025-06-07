
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const AdminSOSRequests: React.FC = () => {
  const { data: sosRequests, isLoading } = useQuery({
    queryKey: ['admin-sos-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sos_requests')
        .select(`
          *,
          requester:profiles!user_id (name),
          helper:profiles!helper_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu SOS</h1>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="destructive">Đang chờ</Badge>;
      case 'in_progress':
        return <Badge variant="default">Đang xử lý</Badge>;
      case 'completed':
        return <Badge variant="secondary">Hoàn thành</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive">Khẩn cấp</Badge>;
      case 'high':
        return <Badge variant="default">Cao</Badge>;
      case 'medium':
        return <Badge variant="secondary">Trung bình</Badge>;
      case 'low':
        return <Badge variant="outline">Thấp</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu SOS</h1>
        <p className="text-gray-600">Tổng số: {sosRequests?.length || 0} yêu cầu</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người yêu cầu</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Người hỗ trợ</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sosRequests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.requester?.name}</p>
                    <p className="text-sm text-gray-600">
                      {request.people_affected} người bị ảnh hưởng
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{request.type}</span>
                </TableCell>
                <TableCell>
                  {getUrgencyBadge(request.urgency)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(request.status || 'active')}
                </TableCell>
                <TableCell>
                  {request.helper?.name || 'Chưa có'}
                </TableCell>
                <TableCell>
                  {request.created_at && formatDistanceToNow(new Date(request.created_at), { 
                    addSuffix: true, 
                    locale: vi 
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminSOSRequests;
