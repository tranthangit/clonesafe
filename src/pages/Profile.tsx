import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  RotateCcw, 
  Lock, 
  Globe, 
  ChevronRight,
  MoreHorizontal,
  MapPin,
  History, 
  CheckCircle // Added CheckCircle icon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AvatarUpload from '@/components/AvatarUpload';
import ChangePassword from '@/components/ChangePassword';
import { useNavigate } from 'react-router-dom'; // Added useNavigate

interface UserStats {
  sos_requests: number;
  help_provided: number;
  average_rating: number;
}

const Profile: React.FC = () => {
  const { profile, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialized navigate
  const [stats, setStats] = useState<UserStats>({ sos_requests: 0, help_provided: 0, average_rating: 0 });
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editProfile, setEditProfile] = useState({
    name: profile?.name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    marital_status: profile?.marital_status || '',
    birth_date: profile?.birth_date || '',
    privacy_level: profile?.privacy_level || 'public'
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.id) return;
      
      try {
        // Fetch SOS requests count
        const { data: sosData, error: sosError } = await supabase
          .from('sos_requests')
          .select('id')
          .eq('user_id', profile.id);

        if (sosError) throw sosError;

        // Fetch help provided count
        const { data: helpData, error: helpError } = await supabase
          .from('sos_requests')
          .select('id')
          .eq('helper_id', profile.id);

        if (helpError) throw helpError;

        // Fetch ratings
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('sos_ratings')
          .select('rating')
          .eq('helper_id', profile.id);

        if (ratingsError) throw ratingsError;

        const averageRating = ratingsData && ratingsData.length > 0 
          ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
          : 0;

        setStats({
          sos_requests: sosData?.length || 0,
          help_provided: helpData?.length || 0,
          average_rating: averageRating
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [profile?.id]);

  useEffect(() => {
    if (profile) {
      setEditProfile({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        marital_status: profile.marital_status || '',
        birth_date: profile.birth_date || '',
        privacy_level: profile.privacy_level || 'public'
      });
    }
  }, [profile]);

  const handleAvatarUpdate = async (url: string) => {
    try {
      const { error } = await updateProfile({ avatar_url: url });
      
      if (error) {
        toast({
          title: "Lỗi",
          description: "Không thể cập nhật ảnh đại diện",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật ảnh đại diện",
        variant: "destructive"
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await updateProfile(editProfile);
      
      if (error) {
        toast({
          title: "Lỗi",
          description: "Không thể cập nhật hồ sơ",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Thành công",
          description: "Đã cập nhật hồ sơ"
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật hồ sơ",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleMenuItemClick = (action: string) => {
    switch (action) {
      case 'password':
        setShowChangePassword(true);
        break;
      case 'orders': // Added case for 'orders'
        navigate('/history');
        break;
      default:
        // Handle other menu items later
        break;
    }
  };

  const menuItems = [
    { icon: User, label: 'Hồ sơ của tôi', action: 'profile' },
    { icon: History, label: 'Lịch sử hoạt động', action: 'orders' },
    { icon: RotateCcw, label: 'Hoàn tiền', action: 'refund' },
    { icon: Lock, label: 'Đổi mật khẩu', action: 'password' },
    { icon: Globe, label: 'Đổi ngôn ngữ', action: 'language' },
  ];

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-red-700 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-red-400 rounded-full opacity-30"></div>
        <div className="absolute top-32 right-16 w-16 h-16 bg-red-300 rounded-full opacity-25"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-red-400 rounded-full opacity-20"></div>
        <div className="absolute top-20 right-32 w-12 h-12 bg-red-200 rounded-full opacity-35"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-6 text-white">
        <h1 className="text-xl font-semibold">Cá nhân</h1>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
          <MoreHorizontal size={24} />
        </Button>
      </div>

      {/* Profile Section */}
      <div className="relative z-10 flex flex-col items-center px-6 mb-8">
        <div className="mb-4">
          <AvatarUpload
            currentAvatar={profile?.avatar_url}
            userName={profile?.name || ''}
            onAvatarUpdate={handleAvatarUpdate}
          />
        </div>

        <div className="flex items-center space-x-2 mb-1">
          <h2 className="text-xl font-bold text-white">{profile?.name}</h2>
          {profile?.is_verified && (
            <CheckCircle className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="text-green-100 text-sm text-center mt-1 space-y-0.5 px-4 w-full max-w-xs sm:max-w-sm md:max-w-md">
          {profile?.bio && (
            <p className="truncate\" title={profile.bio}>
              {profile.bio}
            </p>
          )}
          {profile?.location && (
            <p className="truncate flex items-center justify-center" title={profile.location}>
              <MapPin size={14} className="inline mr-1.5 flex-shrink-0" />
              {profile.location}
            </p>
          )}
          {(!profile?.bio && !profile?.location) && (
            <p className="opacity-75">Chưa cập nhật tiểu sử hoặc vị trí.</p>
          )}
        </div>
      </div>

      {/* Account Overview Card */}
      <div className="relative z-10 bg-white rounded-t-3xl flex-1 p-6 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Tổng quan tài khoản</h3>
        
        <div className="space-y-1">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.action === 'profile' ? (
                <Drawer>
                  <DrawerTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <item.icon size={20} className="text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{item.label}</span>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  </DrawerTrigger>
                  
                  <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader>
                      <DrawerTitle>Chỉnh sửa hồ sơ</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 space-y-4 overflow-y-auto">
                      <div>
                        <Label htmlFor="name">Họ và tên</Label>
                        <Input
                          id="name"
                          value={editProfile.name}
                          onChange={(e) => setEditProfile(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bio">Tiểu sử</Label>
                        <Textarea
                          id="bio"
                          value={editProfile.bio}
                          onChange={(e) => setEditProfile(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Giới thiệu về bản thân..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="location">Nơi ở</Label>
                        <Input
                          id="location"
                          value={editProfile.location}
                          onChange={(e) => setEditProfile(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Thành phố, Quận..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="maritalStatus">Tình trạng hôn nhân</Label>
                        <Select value={editProfile.marital_status} onValueChange={(value) => setEditProfile(prev => ({ ...prev, marital_status: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tình trạng" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Độc thân</SelectItem>
                            <SelectItem value="married">Đã kết hôn</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="birthDate">Ngày sinh</Label>
                        <Input
                          id="birthDate"
                          type="date"
                          value={editProfile.birth_date}
                          onChange={(e) => setEditProfile(prev => ({ ...prev, birth_date: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="privacy">Quyền riêng tư</Label>
                        <Select value={editProfile.privacy_level} onValueChange={(value) => setEditProfile(prev => ({ ...prev, privacy_level: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Công khai</SelectItem>
                            <SelectItem value="private">Chỉ mình tôi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={handleSaveProfile} className="w-full">
                        Lưu thay đổi
                      </Button>
                    </div>
                  </DrawerContent>
                </Drawer>
              ) : (
                <div 
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => handleMenuItemClick(item.action)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      index === 0 ? 'bg-blue-100' :
                      index === 1 ? 'bg-green-100' :
                      index === 2 ? 'bg-purple-100' :
                      index === 3 ? 'bg-orange-100' : 'bg-pink-100'
                    }`}>
                      <item.icon size={20} className={
                        index === 0 ? 'text-blue-600' :
                        index === 1 ? 'text-green-600' :
                        index === 2 ? 'text-purple-600' :
                        index === 3 ? 'text-orange-600' : 'text-pink-600'
                      } />
                    </div>
                    <span className="font-medium text-gray-900">{item.label}</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Thống kê hoạt động</h4>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-red-600">{stats.sos_requests}</p>
                <p className="text-xs text-gray-600">Yêu cầu SOS</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{stats.help_provided}</p>
                <p className="text-xs text-gray-600">Lần giúp đỡ</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-600">
                  {stats.average_rating > 0 ? `${stats.average_rating.toFixed(1)}/5` : 'Chưa có'}
                </p>
                <p className="text-xs text-gray-600">Đánh giá TB</p>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="mt-6 pt-4 border-t border-gray-200 pb-6">
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="w-full text-red-600 border-red-600 hover:bg-red-50"
          >
            Đăng xuất
          </Button>
        </div>
      </div>

      {/* Change Password Component */}
      <ChangePassword 
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
};

export default Profile;