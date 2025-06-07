
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

const AdminSupportPoints: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: supportPoints, isLoading } = useQuery({
    queryKey: ['admin-support-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_points')
        .select(`
          *,
          owner:profiles!owner_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, isVerified }: { id: string; isVerified: boolean }) => {
      const { error } = await supabase
        .from('support_points')
        .update({ is_verified: isVerified })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-points'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi cập nhật');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_points')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-points'] });
      toast.success('Xóa điểm hỗ trợ thành công');
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xóa');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('support_points')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-points'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi cập nhật');
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý điểm hỗ trợ</h1>
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

  const getStatusBadge = (point: any) => {
    if (!point.is_active) {
      return <Badge variant="secondary">Không hoạt động</Badge>;
    }
    if (point.is_verified) {
      return <Badge variant="default">Đã duyệt</Badge>;
    }
    return <Badge variant="outline">Chờ duyệt</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý điểm hỗ trợ</h1>
        <p className="text-gray-600">Tổng số: {supportPoints?.length || 0} điểm</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên điểm hỗ trợ</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Chủ sở hữu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian tạo</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supportPoints?.map((point) => (
              <TableRow key={point.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{point.name}</p>
                    <p className="text-sm text-gray-600">{point.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{point.type}</span>
                </TableCell>
                <TableCell>
                  {point.owner?.name || 'Không xác định'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(point)}
                </TableCell>
                <TableCell>
                  {point.created_at && formatDistanceToNow(new Date(point.created_at), { 
                    addSuffix: true, 
                    locale: vi 
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {!point.is_verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveMutation.mutate({ id: point.id, isVerified: true })}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: point.id, 
                        isActive: !point.is_active 
                      })}
                    >
                      {point.is_active ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement edit functionality
                        toast.info('Tính năng chỉnh sửa sẽ được thêm sau');
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xóa điểm hỗ trợ này?')) {
                          deleteMutation.mutate(point.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminSupportPoints;
