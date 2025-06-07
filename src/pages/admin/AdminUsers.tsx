
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
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const AdminUsers: React.FC = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
        <p className="text-gray-600">Tổng số: {users?.length || 0} người dùng</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tình trạng tình nguyện</TableHead>
              <TableHead>Uy tín</TableHead>
              <TableHead>Ngày tham gia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} />
                      ) : (
                        <div className="bg-gray-200 flex items-center justify-center text-gray-600 text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.location || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_verified ? "default" : "secondary"}>
                    {user.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_volunteer_ready ? "default" : "outline"}>
                    {user.is_volunteer_ready ? 'Sẵn sàng' : 'Không sẵn sàng'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{user.reputation || 0} điểm</span>
                </TableCell>
                <TableCell>
                  {user.created_at && formatDistanceToNow(new Date(user.created_at), { 
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

export default AdminUsers;
