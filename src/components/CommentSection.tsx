import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, MoreHorizontal, Trash2, User, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles: {
    name: string;
    avatar_url: string | null;
    is_verified: boolean | null;
  };
}

interface CommentSectionProps {
  postId: string;
  initialCommentsCount?: number;
  onCommentAdded?: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, initialCommentsCount = 0, onCommentAdded }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, postId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles!post_comments_user_id_fkey (
            name,
            avatar_url,
            is_verified
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Không thể tải bình luận');
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) {
      toast.error('Vui lòng nhập nội dung bình luận');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      toast.success('Bình luận thành công!');
      setNewComment('');
      fetchComments();
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Không thể gửi bình luận');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
      setComments(comments.filter(comment => comment.id !== commentId));
      toast.success('Đã xóa bình luận');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Không thể xóa bình luận');
    }
  };

  return (
    <div className="space-y-3">
      {showComments && (
        <div className="space-y-3 pl-4 border-l-2 border-gray-100">
          {/* Add new comment */}
          {user && (
            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận..."
                rows={2}
                className="text-sm"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={loading || !newComment.trim()}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Đang gửi...' : 'Bình luận'}
              </Button>
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div className="flex items-start space-x-2" key={comment.id}>
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                  <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col space-y-0.5">
                      <div className="flex items-center space-x-1">
                        <p className="text-sm font-semibold">{comment.profiles?.name || 'Ẩn danh'}</p>
                        {comment.profiles?.is_verified && (
                          <CheckCircle className="w-4 h-4 text-red-500 ml-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{comment.created_at ? new Date(comment.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    {user?.id === comment.user_id && (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0"
                          onClick={() => setDeleteMenuOpen(deleteMenuOpen === comment.id ? null : comment.id)}
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-500" />
                        </Button>
                        {deleteMenuOpen === comment.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-border">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-red-500"
                              onClick={() => {
                                handleDeleteComment(comment.id);
                                setDeleteMenuOpen(null);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Xóa
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{comment.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi }) : 'Không xác định'}</p>
                </div>
              </div>
            ))}
          </div>

          {comments.length === 0 && showComments && (
            <p className="text-sm text-gray-500 text-center py-4">
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
