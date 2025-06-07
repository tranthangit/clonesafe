import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface HashtagInputProps {
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  placeholder?: string;
}

const HashtagInput: React.FC<HashtagInputProps> = ({ 
  hashtags, 
  onHashtagsChange, 
  placeholder = "Thêm hashtag (nhấn Enter)" 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [popularHashtags, setPopularHashtags] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPopularHashtags();
  }, []);

  const fetchPopularHashtags = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('hashtags')
        .not('hashtags', 'is', null);

      if (error) throw error;

      // Đếm tần suất hashtag
      const hashtagCount: { [key: string]: number } = {};
      data.forEach(post => {
        if (post.hashtags) {
          post.hashtags.forEach((tag: string) => {
            hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
          });
        }
      });

      // Lấy 5 hashtag phổ biến nhất
      const sortedHashtags = Object.entries(hashtagCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);

      setPopularHashtags(sortedHashtags);
    } catch (error) {
      console.error('Error fetching popular hashtags:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHashtag();
    }
  };

  const addHashtag = (tag?: string) => {
    const tagToAdd = tag || inputValue.trim().replace(/^#/, '');
    if (tagToAdd && !hashtags.includes(tagToAdd)) {
      onHashtagsChange([...hashtags, tagToAdd]);
      setInputValue('');
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    onHashtagsChange(hashtags.filter(tag => tag !== tagToRemove));
  };

  const handlePopularHashtagClick = (tag: string) => {
    navigate(`/hashtag/${tag}`);
  };

  return (
    <div className="space-y-3">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="text-sm"
      />
      
      {/* Hashtag phổ biến */}
      {popularHashtags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">Hashtag phổ biến:</p>
          <div className="flex flex-wrap gap-2">
            {popularHashtags.map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                onClick={() => handlePopularHashtagClick(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Hashtag đã chọn */}
      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hashtags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              #{tag}
              <button
                onClick={() => removeHashtag(tag)}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default HashtagInput;
