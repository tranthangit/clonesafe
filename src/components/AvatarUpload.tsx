import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarUpdate: (url: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentAvatar, userName, onAvatarUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "Kích thước file không được vượt quá 5MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Lỗi",
        description: "Chỉ chấp nhận file ảnh",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onAvatarUpdate(data.publicUrl);
      
      toast({
        title: "Thành công",
        description: "Đã cập nhật ảnh đại diện"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải lên ảnh đại diện",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
        <AvatarImage 
          src={currentAvatar} 
          alt={userName} 
          className="object-cover"
        />
        <AvatarFallback className="text-2xl bg-gray-200">{userName?.charAt(0) || 'U'}</AvatarFallback>
      </Avatar>
      
      <div className="absolute -bottom-2 -right-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="avatar-upload"
        />
        <label htmlFor="avatar-upload">
          <Button
            size="icon"
            className="w-8 h-8 rounded-full bg-white text-gray-600 hover:bg-gray-50 shadow-lg border"
            disabled={uploading}
            asChild
          >
            <span className="cursor-pointer">
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <Camera size={16} />
              )}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
};

export default AvatarUpload;