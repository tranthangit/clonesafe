import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Heart, Bell, MoreHorizontal, Edit, Trash, ArrowLeft, MessageSquare, CheckCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import CommentSection from '@/components/CommentSection';
import { Skeleton } from '@/components/ui/skeleton';

interface CommunityPost {
  id: string;
  content: string;
  images: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  likes_count: number | null;
  comments_count: number | null;
  privacy_level: string;
  user_id: string;
  hashtags: string[] | null;
  profiles?: {
    name: string;
    avatar_url?: string;
    is_verified: boolean;
  };
  post_likes?: Array<{ user_id: string }>;
}

const POSTS_PER_PAGE = 10;

// Skeleton Card Component for loading state
const SkeletonPostCard: React.FC = () => {
  return (
    <Card className="mb-4 w-full max-w-2xl mx-auto shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        <Skeleton className="h-32 w-full rounded-lg mb-4" /> {/* For image placeholder */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  );
};

const PostSkeleton = () => {
  return (
    <Card className="overflow-hidden border-0 shadow-md rounded-xl bg-background/80 backdrop-blur-sm dark:bg-background/40 animate-pulse">
      <CardHeader className="p-3 md:p-4 border-b border-border/50 bg-background/50 dark:bg-background/30 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex flex-col">
              <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="flex space-x-2 mt-2">
          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative bg-black/10 dark:bg-black/30 overflow-hidden border-b border-border/50 h-64 md:h-80 bg-background/10"></CardContent>
      <CardFooter className="flex flex-col items-start p-4 relative overflow-hidden bg-background/50 dark:bg-background/30 border-t border-border/50">
        <div className="flex justify-between items-center w-full mb-2 text-muted-foreground text-sm">
          <div className="flex space-x-4 items-center">
            <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

const HashtagPage: React.FC = () => {
  const { hashtag } = useParams<{ hashtag: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (hashtag) {
      fetchHashtagPosts();
    }
  }, [hashtag]);

  const fetchHashtagPosts = useCallback(async (offset = 0, limit = POSTS_PER_PAGE) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles!community_posts_user_id_fkey (
            name,
            avatar_url,
            is_verified
          ),
          post_likes!post_likes_post_id_fkey (
            user_id
          )
        `)
        .filter('hashtags', 'cs', `{${hashtag}}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      console.log('Fetched posts for hashtag', hashtag, data);

      const processedData = (data || []).map(post => ({
        ...post,
        created_at: post.created_at ?? new Date(0).toISOString(),
        updated_at: post.updated_at ?? new Date(0).toISOString(),
        likes_count: post.likes_count ?? 0,
        comments_count: post.comments_count ?? 0,
        privacy_level: post.privacy_level ?? '',
        user_id: post.user_id,
        hashtags: post.hashtags ?? [],
        images: post.images ?? [],
        profiles: {
          name: post.profiles?.name ?? '', // Default to empty string
          avatar_url: post.profiles?.avatar_url ?? undefined, // Convert null to undefined
          is_verified: post.profiles?.is_verified ?? false, // Default to false
        },
      }));

      if (offset === 0) {
        setPosts(processedData);
      } else {
        setPosts(prev => [...prev, ...processedData]);
      }

      setHasMore((data || []).length === limit);
    } catch (error) {
      console.error('Error fetching hashtag posts:', error);
      toast.error('Không thể tải bài viết');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hashtag]);

  const renderPostImages = (images: string[] | null) => {
    if (!images || images.length === 0) return null;

    if (images.length === 1) {
      return (
        <div className="my-2 sm:my-3 rounded-lg overflow-hidden max-w-2xl mx-auto">
          <img 
            src={images[0]} 
            alt="Post image" 
            className="w-full h-auto object-contain max-h-[300px] sm:max-h-[400px] md:max-h-[500px]" 
          />
        </div>
      );
    }

    const gridClasses = images.length >= 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2';

    return (
      <div className={`grid ${gridClasses} gap-1 sm:gap-2 my-2 sm:my-3`}>
        {images.map((src, index) => (
          <div key={index} className="aspect-square rounded overflow-hidden bg-gray-100">
            <img 
              src={src} 
              alt={`Post image ${index + 1}`} 
              className="w-full h-full object-cover" 
            />
          </div>
        ))}
      </div>
    );
  };

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchHashtagPosts(posts.length);
    }
  }, [posts.length, loadingMore, hasMore, hashtag]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || loadingMore) {
        return;
      }
      loadMorePosts();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts, loadingMore]);

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để thích bài viết');
      return;
    }

    try {
      const existingLike = posts.find(p => p.id === postId)?.post_likes?.find(l => l.user_id === user.id);

      if (existingLike) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });

        if (error) throw error;
      }

      fetchHashtagPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Không thể cập nhật trạng thái thích');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Xóa bài viết thành công!');
      fetchHashtagPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Không thể xóa bài viết');
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Không rõ thời gian';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi });
  };

  const isPostLikedByUser = (post: CommunityPost) => {
    return user && post.post_likes?.some(like => like.user_id === user.id);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleHashtagClick = (tag: string) => {
    navigate(`/hashtag/${tag}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-6 max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <div className="mb-4 sm:mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="p-2 sm:p-2.5">
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold ml-2 sm:ml-4">Bài viết với #{hashtag}</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <PostSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">#{hashtag}</h1>
          <Button variant="outline" onClick={() => navigate('/community')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
          </Button>
        </div>
        <p className="text-center text-gray-500">Không tìm thấy bài viết nào với hashtag #{hashtag}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 max-w-3xl lg:max-w-5xl xl:max-w-6xl">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/community')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">#{hashtag}</h1>
          <p className="text-gray-600">{posts.length} bài viết</p>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    className="w-10 h-10 cursor-pointer" 
                    onClick={() => handleUserClick(post.user_id)}
                  >
                    <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.name} />
                    <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-1">
                      <p className="font-semibold text-base sm:text-lg">{post.profiles?.name || 'Ẩn danh'}</p>
                      {post.profiles?.is_verified && (
                        <CheckCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</p>
                  </div>
                </div>

                {/* Post Actions Menu */}
                {user && user.id === post.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate('/community')}>
                        <Edit className="w-4 h-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash className="w-4 h-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa bài viết</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Post Content */}
              <div className="mb-4">
                <p className="text-gray-800 leading-relaxed">{post.content}</p>
                
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.hashtags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className={`text-xs cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors ${
                          tag === hashtag ? 'bg-blue-100 text-blue-700' : ''
                        }`}
                        onClick={() => handleHashtagClick(tag)}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {renderPostImages(post.images)}
                
              </div>

              {/* Post Actions */}
              <CardFooter className="flex flex-col items-start p-4 relative overflow-hidden bg-background/50 dark:bg-background/30 border-t border-border/50">
                <div className="flex justify-between items-center w-full mb-2 text-muted-foreground text-sm">
                  <div className="flex space-x-4 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-gray-500 ${isPostLikedByUser(post) ? 'text-red-500' : ''}`}
                      disabled={!user}
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart className="w-5 h-5 mr-1" />
                      <span>Thích ({post.likes_count})</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-blue-500"
                      onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                    >
                      <MessageSquare className="w-5 h-5 mr-1" />
                      <span>Bình luận ({post.comments_count})</span>
                    </Button>
                  </div>
                </div>
              </CardFooter>
              {expandedPostId === post.id && (
                <CardContent className="p-4 border-t">
                  <CommentSection postId={post.id} onCommentAdded={() => {
                    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
                  }} />
                </CardContent>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
        </div>
      )}
    </div>
  );
};

export default HashtagPage;