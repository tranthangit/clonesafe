import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useGoogleMapsApiKey = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.functions.invoke('get-maps-config');
        
        if (error) {
          console.error('Error fetching maps config:', error);
          setError('Không thể tải cấu hình bản đồ');
          return;
        }

        if (data?.googleMapsApiKey) {
          setApiKey(data.googleMapsApiKey);
        } else {
          setError('Không tìm thấy Google Maps API key');
        }
      } catch (err) {
        console.error('Error in useGoogleMapsApiKey:', err);
        setError('Lỗi kết nối tới server');
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  return { apiKey, loading, error };
};