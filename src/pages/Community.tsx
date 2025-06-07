import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, ChevronLeft, ChevronRight, X, MoreHorizontal, Edit, Trash2, CheckCircle, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import ImageUpload from '@/components/ImageUpload';
import HashtagInput from '@/components/HashtagInput';
import CommentSection from '@/components/CommentSection';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  privacy_level: string;
  hashtags: string[] | null;
  tagged_users?: string[];
  tagged_users_profiles?: Array<{ id: string; name: string; avatar_url: string | null }>;
  profiles: {
    name: string;
    avatar_url: string | null;
    is_verified: boolean | null;
  } | null;
  post_likes?: Array<{ user_id: string }>;
}

const POSTS_PER_PAGE = 10;

// Skeleton component for post loading
// Skeleton component for post loading - Updated for responsiveness
const PostSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-3 mb-4">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
        </div>

        {/* Hashtags skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="h-6 w-16 bg-gray-200 rounded" />
          <div className="h-6 w-16 bg-gray-200 rounded" />
          <div className="h-6 w-16 bg-gray-200 rounded" />
        </div>

        {/* Images skeleton */}
        {/* Responsive Images skeleton - assuming 2 placeholders */}
        <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-4">
          <div className="aspect-video bg-gray-200 rounded" />
          <div className="aspect-video bg-gray-200 rounded" />
        </div>

        {/* Actions skeleton */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex space-x-2 sm:space-x-4">
            <div className="h-8 w-16 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Create Post Form Skeleton
// Create Post Form Skeleton - Updated for responsiveness
const CreatePostSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="h-24 bg-gray-200 rounded animate-pulse" />
      <div className="h-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 bg-gray-200 rounded animate-pulse" />
      <div className="flex items-center justify-between">
        <div className="h-10 w-full sm:w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full sm:w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

const Community: React.FC = () => {
  const { user } = useAuth(); // Removed 'profile' as it's not used in this component
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [postPrivacy, setPostPrivacy] = useState('public');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postHashtags, setPostHashtags] = useState<string[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);

  // Edit post state
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editHashtags, setEditHashtags] = useState<string[]>([]);
  const [editPrivacy, setEditPrivacy] = useState('public');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = useCallback(async (offset = 0, limit = POSTS_PER_PAGE) => {
    try {
      setLoading(offset === 0);
      setLoadingMore(offset > 0);

      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(name, avatar_url, is_verified), post_likes(user_id)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const processedData = (data || []).map(post => ({
        ...post,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        privacy_level: post.privacy_level || 'public',
        tagged_users_profiles: []
      })) as unknown as CommunityPost[];

      // Fetch tagged users for each post separately
      for (const post of processedData) {
        if (post.tagged_users && post.tagged_users.length > 0) {
          const { data: taggedData, error: taggedError } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', post.tagged_users);

          if (taggedError) {
            console.error(`Error fetching tagged users for post ${post.id}:`, taggedError);
            continue;
          }

          post.tagged_users_profiles = taggedData || [];
        }
      }

      if (offset === 0) {
        setPosts(processedData);
      } else {
        setPosts(prev => [...prev, ...processedData]);
      }

      setHasMore((data || []).length === limit);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Không thể tải bài viết');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(posts.length);
    }
  }, [posts.length, loadingMore, hasMore]);

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

  const handleHashtagClick = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    navigate(`/hashtag/${cleanHashtag}`);
  };

  const renderContentWithHashtags = (content: string) => {
    const hashtagRegex = /#\w+/g;
    const parts = content.split(hashtagRegex);
    const hashtags = content.match(hashtagRegex) || [];
    let result = [];
    for (let i = 0; i < parts.length; i++) {
      result.push(parts[i]);
      if (i < hashtags.length) {
        const hashtag = hashtags[i];
        result.push(
          <span
            key={`hashtag-${i}`}
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => handleHashtagClick(hashtag)}
          >
            {hashtag}
          </span>
        );
      }
    }
    return result;
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để thích bài viết');
      return;
    }

    try {
      const existingLike = posts.find(p => p.id === postId)?.post_likes?.find(l => l.user_id === user?.id);

      if (existingLike) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        // Update local state to reflect the unlike action
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  post_likes: post.post_likes?.filter(like => like.user_id !== user.id) || [], 
                  likes_count: (post.likes_count || 0) - 1 
                } 
              : post
          )
        );
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });

        if (error) throw error;
        
        // Update local state to reflect the like action
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  post_likes: [...(post.post_likes || []), { user_id: user.id }], 
                  likes_count: (post.likes_count || 0) + 1 
                } 
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error handling like:', error);
      toast.error('Không thể thực hiện hành động');
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPost.trim()) return;

    try {
      // Extract hashtags from the post content
      const hashtags = newPost.match(/#\w+/g)?.map(tag => tag.substring(1)) || [];
      
      // Create an array of tagged user IDs
      const taggedUserIds = taggedUsers.map(user => user.id);

      const { data, error } = await supabase
        .from('community_posts')
        .insert([
          {
            user_id: user.id,
            content: newPost,
            images: postImages,
            hashtags,
            tagged_users: taggedUserIds.length > 0 ? taggedUserIds : null,
            privacy_level: postPrivacy,
          },
        ])
        .select('*, profiles(name, avatar_url, is_verified), post_likes(user_id)')
        .single();

      if (error) throw error;

      // Fetch tagged users for the new post if any
      let taggedProfiles: Array<{ id: string; name: string; avatar_url: string | null }> = [];
      if (taggedUserIds.length > 0) {
        const { data: taggedData, error: taggedError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', taggedUserIds);

        if (taggedError) {
          console.error('Error fetching tagged users for new post:', taggedError);
        } else {
          taggedProfiles = taggedData || [];
        }
      }

      // Construct the post object to match CommunityPost interface
      const newPostData: CommunityPost = {
        id: data.id,
        user_id: data.user_id,
        content: data.content,
        images: data.images || [],
        created_at: data.created_at || new Date().toISOString(),
        likes_count: data.likes_count || 0,
        comments_count: data.comments_count || 0,
        privacy_level: data.privacy_level || 'public',
        hashtags: data.hashtags || [],
        tagged_users: (data as any).tagged_users || [],
        tagged_users_profiles: taggedProfiles,
        profiles: data.profiles || null,
        post_likes: data.post_likes || []
      };

      // Prepend the new post to existing posts
      setPosts(prevPosts => [newPostData, ...prevPosts]);
      setNewPost('');
      setPostImages([]);
      setTaggedUsers([]);
      toast.success('Đăng bài thành công!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Không thể đăng bài. Vui lòng thử lại.');
    }
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditImages(post.images || []);
    setEditHashtags(post.hashtags || []);
    setEditPrivacy(post.privacy_level);
    setEditDialogOpen(true);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !editContent.trim()) {
      toast.error('Nội dung bài viết không được để trống');
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .update({
          content: editContent.trim(),
          privacy_level: editPrivacy,
          images: editImages.length > 0 ? editImages : [],
          hashtags: editHashtags.length > 0 ? editHashtags : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      toast.success('Cập nhật bài viết thành công!');
      setEditDialogOpen(false);
      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Không thể cập nhật bài viết');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      if (!user) {
        toast.error('Bạn cần đăng nhập để xóa bài viết');
        return;
      }
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
      setPosts(posts.filter(post => post.id !== postId));
      toast.success('Xóa bài viết thành công!');
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

  const openImageSlider = (postImages: string[], startIndex: number) => {
    setSelectedPostImages(postImages);
    setSelectedImageIndex(startIndex);
  };

  const closeImageSlider = () => {
    setSelectedPostImages(null);
    setSelectedImageIndex(null);
  };

  const goToPreviousImage = () => {
    if (selectedImageIndex !== null && selectedPostImages) {
      setSelectedImageIndex((prev) => 
        prev !== null ? (prev > 0 ? prev - 1 : selectedPostImages.length - 1) : 0
      );
    }
  };

  const goToNextImage = () => {
    if (selectedImageIndex !== null && selectedPostImages) {
      setSelectedImageIndex((prev) => 
        prev !== null ? (prev < selectedPostImages.length - 1 ? prev + 1 : 0) : 0
      );
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      goToNextImage();
    } else {
      goToPreviousImage();
    }
  };

  // Handle mouse swipe for desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const handleMouseUp = (e: MouseEvent) => {
      const endX = e.clientX;
      if (startX - endX > 50) {
        handleSwipe('left');
      } else if (endX - startX > 50) {
        handleSwipe('right');
      }
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle touch swipe for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const startX = e.touches[0].clientX;
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      if (startX - endX > 50) {
        handleSwipe('left');
      } else if (endX - startX > 50) {
        handleSwipe('right');
      }
      document.removeEventListener('touchend', handleTouchEnd);
    };
    document.addEventListener('touchend', handleTouchEnd);
  };

  const [selectedPostImages, setSelectedPostImages] = useState<string[] | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isOpera = typeof (window as any).opera !== 'undefined' || navigator.userAgent.indexOf(' OPR/') >= 0;
      setIsMobile(/android|iPad|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || isOpera);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchUserSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .order('name', { ascending: true })
        .limit(10);

      if (error) throw error;

      setUserSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
    }
  };

  const addTaggedUser = (user: { id: string; name: string; avatar_url: string | null }) => {
    setTaggedUsers(prev => [...prev, user]);
    setTagSearch('');
  };

  const removeTaggedUser = (userId: string) => {
    setTaggedUsers(prev => prev.filter(user => user.id !== userId));
  };

  return (
    <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 pb-8">
      {/* Notification for unauthenticated users */}
      {!user && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-red-800 font-medium">Đăng nhập ngay để đăng bài và tương tác</p>
          <Button 
            onClick={() => navigate('/login')} 
            className="mt-2 bg-red-500 hover:bg-red-600 text-white"
          >
            Đăng nhập
          </Button>
        </div>
      )}
      {/* Create Post */}
      {user && (loading ? <CreatePostSkeleton /> : (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Chia sẻ với cộng đồng</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Bạn muốn chia sẻ điều gì hôm nay?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={3}
              className="resize-none mb-3"
            />
            
            {/* Tag people who helped */}
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Gắn thẻ người đã giúp bạn:</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {taggedUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    <span>{user.name}</span>
                    <button 
                      onClick={() => removeTaggedUser(user.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onFocus={fetchUserSuggestions}
                />
                {tagSearch && userSuggestions.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto z-10">
                    {userSuggestions
                      .filter(user => 
                        user.name.toLowerCase().includes(tagSearch.toLowerCase()) && 
                        !taggedUsers.some(tagged => tagged.id === user.id)
                      )
                      .map(user => (
                        <div 
                          key={user.id} 
                          className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex items-center space-x-2"
                          onClick={() => addTaggedUser(user)}
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.avatar_url ?? ''} alt={user.name || 'User'} />
                            <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            <ImageUpload 
              onImagesChange={(images) => setPostImages(images)} 
              initialImageUrls={postImages} 
            />
            
            <HashtagInput 
              hashtags={postHashtags}
              onHashtagsChange={setPostHashtags}
            />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
              <Select value={postPrivacy} onValueChange={setPostPrivacy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Công khai</SelectItem>
                  <SelectItem value="private">Chỉ mình tôi</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleCreatePost}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                disabled={!newPost.trim()}
              >
                Đăng bài
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Posts Feed */}
      <div className="space-y-4">
        {loading ? (
          // Show skeleton loading for initial posts
          Array.from({ length: 3 }).map((_, index) => (
            <PostSkeleton key={index} />
          ))
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-0 shadow-md rounded-xl bg-background/80 backdrop-blur-sm dark:bg-background/40">
              <CardHeader className="p-3 md:p-4 border-b border-border/50 bg-background/50 dark:bg-background/30 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleUserClick(post.user_id)}>
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-border/50 shadow-sm">
                      <AvatarImage src={post.profiles?.avatar_url ?? ''} alt={post.profiles?.name || 'User'} className="object-cover" />
                      <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold">{post.profiles?.name || 'Ẩn danh'}</p>
                        {post.profiles?.is_verified && (
                          <CheckCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{post.created_at ? new Date(post.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="relative">
                    {user && user.id === post.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === post.id ? null : post.id);
                        }}
                        className="hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    )}
                    {menuOpen === post.id && (
                      <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPost(post);
                            setMenuOpen(null);
                          }}
                          className="w-full text-left justify-start hover:bg-blue-100 text-blue-600 dark:hover:bg-blue-900 dark:text-blue-400"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post.id);
                            setMenuOpen(null);
                          }}
                          className="w-full text-left justify-start hover:bg-red-100 text-red-600 dark:hover:bg-red-900 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line">
                  {renderContentWithHashtags(post.content)}
                </p>
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.hashtags.map((hashtag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="bg-blue-50 hover:bg-blue-100 cursor-pointer"
                        onClick={() => handleHashtagClick(hashtag)}
                      >
                        #{hashtag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {post.tagged_users_profiles && post.tagged_users_profiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center text-sm text-gray-600">
                    <span className="mr-1">Được giúp bởi:</span>
                    {post.tagged_users_profiles.map((taggedUser, index) => (
                      <span 
                        key={taggedUser.id} 
                        className="cursor-pointer text-blue-600 hover:underline mr-2"
                        onClick={() => handleUserClick(taggedUser.id)}
                      >
                        {taggedUser.name}
                        {index < post.tagged_users_profiles!.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </CardHeader>
              {post.images && post.images.length > 0 && (
                <CardContent className="p-0 relative bg-black overflow-hidden border-b border-border/50">
                  <div className="relative w-full h-auto min-h-[240px] md:min-h-[320px] overflow-hidden bg-background/10">
                    {post.images.length === 1 ? (
                      <img
                        src={post.images[0]}
                        alt={`Bài viết của ${post.profiles?.name || 'người dùng'}`}
                        className="w-full h-[240px] md:h-[320px] object-cover"
                        onClick={() => openImageSlider(post.images, 0)}
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-1 w-full h-auto">
                        {post.images.slice(0, 4).map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Bài viết của ${post.profiles?.name || 'người dùng'} ${index + 1}`}
                            className="w-full h-auto aspect-[4/3] object-cover cursor-pointer"
                            onClick={() => openImageSlider(post.images, index)}
                          />
                        ))}
                        {post.images.length > 4 && (
                          <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full">
                            +{post.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
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
            </Card>
          ))
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
          </div>
        )}

        {posts.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Slider for viewing images in full screen */}
      {selectedPostImages && selectedImageIndex !== null && (
        isMobile ? (
          <Drawer open={true} onOpenChange={(open) => !open && closeImageSlider()}>
            <DrawerContent className="h-screen bg-black border-none transition-all duration-300">
              <div 
                className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center transition-opacity duration-300"
                onClick={closeImageSlider}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 text-white hover:bg-black/20 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeImageSlider();
                  }}
                >
                  <X className="w-8 h-8" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-black/20 z-10" 
                  onClick={(e) => { e.stopPropagation(); goToPreviousImage(); }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                
                <div 
                  className="max-w-5xl w-full h-full flex items-center justify-center" 
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                  <img 
                    src={selectedPostImages[selectedImageIndex]} 
                    alt={`Post image ${selectedImageIndex + 1}`} 
                    className="max-w-full max-h-full object-contain transition-all duration-300"
                  />
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-black/20 z-10"
                  onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
                
                <div className="absolute bottom-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-10">
                  {selectedImageIndex + 1} / {selectedPostImages.length}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={true} onOpenChange={(open) => !open && closeImageSlider()}>
            <DialogContent className="h-screen bg-black border-none p-0 max-w-full transition-all duration-300">
              <DialogHeader className="hidden">
                <DialogTitle>Image Viewer</DialogTitle>
              </DialogHeader>
              <div 
                className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center transition-opacity duration-300"
                onClick={closeImageSlider}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 text-white hover:bg-black/20 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeImageSlider();
                  }}
                >
                  <X className="w-8 h-8" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-black/20 z-10" 
                  onClick={(e) => { e.stopPropagation(); goToPreviousImage(); }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                
                <div 
                  className="max-w-5xl w-full h-full flex items-center justify-center" 
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                  <img 
                    src={selectedPostImages[selectedImageIndex]} 
                    alt={`Post image ${selectedImageIndex + 1}`} 
                    className="max-w-full max-h-full object-contain transition-all duration-300"
                  />
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-black/20 z-10"
                  onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
                
                <div className="absolute bottom-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-10">
                  {selectedImageIndex + 1} / {selectedPostImages.length}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      )}

      {/* Edit Post Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bài viết</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Nội dung bài viết..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
            />
            
            <ImageUpload 
              onImagesChange={setEditImages} 
              initialImageUrls={editImages}
            />
            
            <HashtagInput 
              hashtags={editHashtags}
              onHashtagsChange={setEditHashtags}
            />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 pt-2 sm:pt-3 md:pt-4">
              <Select value={editPrivacy} onValueChange={setEditPrivacy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Công khai</SelectItem>
                  <SelectItem value="private">Chỉ mình tôi</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-x-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleUpdatePost}
                  disabled={!editContent.trim()}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  Cập nhật
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Community;