
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BadgeSystem: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile && user) {
      console.log('BadgeSystem: Profile and user available, checking badges for user', user.id);
      
      // Delay badge check slightly to ensure everything is loaded
      const timeoutId = setTimeout(async () => {
        try {
          console.log('BadgeSystem: Checking badges directly in client');
          
          // Trước tiên, hãy kiểm tra xem có những badge_name nào trong bảng badge_definitions
          const { data: availableBadges, error: badgeError } = await supabase
            .from('badge_definitions')
            .select('name');
            
          if (badgeError) {
            console.error('Error fetching available badges:', badgeError);
          } else {
            console.log('AVAILABLE BADGES IN DATABASE:', availableBadges);
            
            // Cũng kiểm tra cấu trúc bảng user_badges
            const { data: userBadgesSample, error: userBadgesError } = await supabase
              .from('user_badges')
              .select('*')
              .limit(1);
              
            if (userBadgesError) {
              console.error('Error examining user_badges:', userBadgesError);
            } else {
              console.log('USER_BADGES SAMPLE:', userBadgesSample);
            }
          }
          
          // Gọi trực tiếp hàm kiểm tra huy hiệu
          const { checkAndAwardBadges } = await import('@/utils/badgeUtils');
          const newBadges = await checkAndAwardBadges(profile.id, profile);

          console.log('BadgeSystem: Badge check result:', newBadges);

          // Không hiển thị thông báo toast khi nhận huy hiệu
          // Chỉ log ra console cho mục đích debug
          if (newBadges.length > 0) {
            console.log('Badges earned without notification:', newBadges);
          } else {
            console.log('BadgeSystem: No new badges awarded');
          }
        } catch (error) {
          console.error('BadgeSystem: Error in automatic badge check:', error);
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    } else {
      console.log('BadgeSystem: Waiting for profile and user data...', { profile: !!profile, user: !!user });
    }
  }, [profile, user, toast]);

  return null; // Component này chỉ chạy logic, không render gì
};

export default BadgeSystem;
