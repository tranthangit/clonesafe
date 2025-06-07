
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
import { Eye, Trash2, MessageCircle, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

const AdminCommunity: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-community-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          author:profiles!user_id (name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      // First delete related comments and likes
      await supabase.from('post_comments').delete().eq('post_id', postId);
      await supabase.from('post_likes').delete().eq('post_id', postId);
      
      // Then delete the post
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-posts'] });
      toast.success('Xóa bài viết thành công');
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xóa bài viết');
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý bài viết cộng đồng</h1>
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

  const getPrivacyBadge = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return <Badge variant="default">Công khai</Badge>;
      case 'private':
        return <Badge variant="secondary">Riêng tư</Badge>;
      case 'friends':
        return <Badge variant="outline">Bạn bè</Badge>;
      default:
        return <Badge variant="outline">{privacy}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý bài viết cộng đồng</h1>
        <p className="text-gray-600">Tổng số: {posts?.length || 0} bài viết</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tác giả</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Quyền riêng tư</TableHead>
              <TableHead>Tương tác</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts?.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {post.author?.avatar_url && (
                      <img 
                        src={post.author.avatar_url} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium">{post.author?.name || 'Người dùng ẩn danh'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-md">
                    <p className="text-sm text-gray-900 line-clamp-3">
                      {post.content}
                    </p>
                    {post.images && post.images.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {post.images.length} hình ảnh
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getPrivacyBadge(post.privacy_level || 'public')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.comments_count || 0}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {post.created_at && formatDistanceToNow(new Date(post.created_at), { 
                    addSuffix: true, 
                    locale: vi 
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement view post details
                        toast.info('Tính năng xem chi tiết sẽ được thêm sau');
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xóa bài viết này? Tất cả bình luận và lượt thích sẽ bị xóa.')) {
                          deleteMutation.mutate(post.id);
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

export default AdminCommunity;
