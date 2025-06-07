
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Hàm để làm sạch tên file
const sanitizeFileName = (filename: string): string => {
  // Normalize để tách dấu và ký tự
  let name = filename.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  // Chuyển thành chữ thường
  name = name.toLowerCase();
  // Thay thế khoảng trắng và các ký tự không mong muốn bằng dấu gạch dưới
  name = name.replace(/\s+/g, '_'); // Thay khoảng trắng
  name = name.replace(/[^a-z0-9_.-]/g, ''); // Loại bỏ các ký tự không phải chữ, số, '_', '.', '-'
  // Đảm bảo không có nhiều dấu chấm liên tiếp
  name = name.replace(/\.{2,}/g, '.');
  // Đảm bảo không có nhiều dấu gạch dưới liên tiếp
  name = name.replace(/_{2,}/g, '_');
  // Loại bỏ dấu gạch dưới hoặc dấu chấm ở đầu hoặc cuối tên file
  name = name.replace(/^[_.-]+|[_.-]+$/g, '');
  return name;
};

interface ImageUploadProps {
  initialImageUrls?: string[];
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesChange, maxImages = 4, initialImageUrls }) => {
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialImageUrls) {
      setImageUrls(initialImageUrls);
    }
  }, [initialImageUrls]);
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls || []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (imageUrls.length + files.length > maxImages) {
      toast.error(`Chỉ có thể tải lên tối đa ${maxImages} ảnh`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const sanitizedFileName = sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedFileName}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        newUrls.push(data.publicUrl);
      }

      const updatedUrls = [...imageUrls, ...newUrls];
      setImageUrls(updatedUrls);
      onImagesChange(updatedUrls);
      toast.success('Tải ảnh thành công!');
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Có lỗi khi tải ảnh');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const updatedUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updatedUrls);
    onImagesChange(updatedUrls);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          disabled={uploading || imageUrls.length >= maxImages}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || imageUrls.length >= maxImages}
            className="cursor-pointer"
            asChild
          >
            <span>
              <Image className="w-4 h-4 mr-2" />
              {uploading ? 'Đang tải...' : 'Thêm ảnh'}
            </span>
          </Button>
        </label>
        <span className="text-sm text-gray-500">
          {imageUrls.length}/{maxImages}
        </span>
      </div>

      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
