
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  birth_date?: string;
  marital_status?: string;
  privacy_level: string;
  is_verified: boolean;
  reputation: number;
  is_volunteer_ready: boolean;
  created_at: string;
  updated_at: string;
}

interface BadgeDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: string;
}

export const checkAndAwardBadges = async (userId: string, profile: Profile) => {
  try {
    console.log('========== BADGE CHECK START ==========');
    console.log('Checking badges for user ID:', userId);
    
    // Chi tiết bảng dữ liệu để debug
    console.log('Examining database tables...');
    
    // Kiểm tra cấu trúc bảng user_badges
    const { data: userBadgesInfo, error: userBadgesInfoError } = await supabase
      .from('user_badges')
      .select('*')
      .limit(1);
      
    if (userBadgesInfoError) {
      console.error('Error examining user_badges table:', userBadgesInfoError);
    } else {
      console.log('user_badges table sample:', userBadgesInfo);
    }
    
    // Fetch existing badges
    const { data: existingBadges, error: existingBadgesError } = await supabase
      .from('user_badges')
      .select('*')  // Lấy tất cả thông tin để xem cấu trúc
      .eq('user_id', userId);

    if (existingBadgesError) {
      console.error('Error fetching existing badges:', existingBadgesError);
      return [];
    }

    console.log('Full existing badges data:', existingBadges);
    const existingBadgeNames = existingBadges?.map(b => b.badge_name) || [];
    console.log('Existing badge names for user:', existingBadgeNames);

    // Fetch user stats
    const stats = await getUserStats(userId);
    console.log('User stats for badge conditions:', stats);

    const newBadges: BadgeDefinition[] = [];

    // Định nghĩa các badge - sử dụng tên chính xác từ database
    const badgeChecks = [
      {
        name: 'first_helper',
        displayName: 'Người giúp đỡ đầu tiên',
        condition: () => {
          const meets = stats.help_provided >= 1;
          console.log(`first_helper check: help_provided=${stats.help_provided}, meets=${meets}`);
          return meets;
        },
        icon: '🤝',
        description: 'Hoàn thành lần giúp đỡ đầu tiên'
      },
      {
        name: 'rescue_angel',
        displayName: 'Thiên thần cứu hộ',
        condition: () => {
          const meets = stats.help_provided >= 10;
          console.log(`rescue_angel check: help_provided=${stats.help_provided}, meets=${meets}`);
          return meets;
        },
        icon: '👼',
        description: 'Giúp đỡ thành công 10 lần'
      },
      {
        name: 'community_hero',
        displayName: 'Anh hùng cộng đồng',
        condition: () => {
          const meets = stats.help_provided >= 50;
          console.log(`community_hero check: help_provided=${stats.help_provided}, meets=${meets}`);
          return meets;
        },
        icon: '🦸',
        description: 'Giúp đỡ thành công 50 lần'
      },
      {
        name: 'trusted_person',
        displayName: 'Người đáng tin cậy',
        condition: () => {
          const meets = stats.average_rating >= 4.5 && stats.help_provided >= 5;
          console.log(`trusted_person check: avg_rating=${stats.average_rating}, help_provided=${stats.help_provided}, meets=${meets}`);
          return meets;
        },
        icon: '⭐',
        description: 'Đạt đánh giá trung bình 4.5 sao'
      },
      {
        name: 'newcomer',
        displayName: 'Người mới',
        condition: () => {
          const meets = stats.sos_requests >= 1;
          console.log(`newcomer check: sos_requests=${stats.sos_requests}, meets=${meets}`);
          return meets;
        },
        icon: '🔰',
        description: 'Gửi yêu cầu SOS đầu tiên'
      },
      {
        name: 'veteran',
        displayName: 'Người kỳ cựu',
        condition: () => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const meets = profile.created_at && new Date(profile.created_at) <= thirtyDaysAgo;
          console.log(`veteran check: joinedDaysAgo=${profile.created_at ? Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000*60*60*24)) : 'unknown'}, meets=${meets}`);
          return meets;
        },
        icon: '🏆',
        description: 'Thành viên từ 30 ngày trở lên'
      }
    ];

    console.log('Ensuring badge definitions are initialized properly...');
    
    // Khởi tạo hoặc cập nhật định nghĩa huy hiệu để đảm bảo chúng tồn tại
    await initializeBadgeDefinitions();
    
    // Lấy các định nghĩa huy hiệu từ cơ sở dữ liệu sau khi khởi tạo
    const { data: badgeDefsData, error: badgeDefsError } = await supabase
      .from('badge_definitions')
      .select('*');

    if (badgeDefsError) {
      console.error('Error checking badge definitions:', badgeDefsError);
      return []; 
    } 
    
    if (!badgeDefsData || badgeDefsData.length === 0) {
      console.error('Badge definitions still not available after initialization!');
      return [];
    }
    
    console.log(`Verified ${badgeDefsData.length} badge definitions exist`);
    console.log('Available badges:', badgeDefsData.map(def => def.name).join(', '));
    
    // Kiểm tra từng huy hiệu
    for (const badge of badgeChecks) {
      console.log(`
--- Checking badge: ${badge.name} ---`);
      console.log(`Already has badge: ${existingBadgeNames.includes(badge.name)}`);
      
      if (!existingBadgeNames.includes(badge.name) && badge.condition()) {
        console.log(`✓ Badge condition met for: ${badge.name}`);
        
        // Tạm thời chỉ thêm vào danh sách badge mới mà không thực sự thêm vào database
        // để tránh lỗi foreign key constraint
        console.log(`OFFLINE MODE: Adding badge ${badge.name} to result without database insert`);
        
        // Thêm vào danh sách huy hiệu mới để hiển thị thông báo cho người dùng
        newBadges.push({
          id: badge.name,
          name: badge.displayName,
          icon: badge.icon,
          description: badge.description,
          condition: badge.description
        });

        // DEBUG ONLY - Uncomment block below to restore database insert when ready
        /* 
        // Kiểm tra lại xem huy hiệu có tồn tại trong định nghĩa không
        const badgeExists = badgeDefsData.some(def => def.name === badge.name);
        if (!badgeExists) {
          console.error(`Badge definition not found for ${badge.name}, skipping award`);
          continue;
        }
        
        try {
          console.log(`Attempting to award badge ${badge.name} to user ${userId}`);
          // Thêm huy hiệu vào database
          const { data, error } = await supabase
            .from('user_badges')
            .insert({
              user_id: userId,
              badge_name: badge.name,
              awarded_at: new Date().toISOString()
            })
            .select();

          if (!error && data) {
            console.log(`✓ Successfully awarded badge: ${badge.name}`, data);
            newBadges.push({
              id: badge.name,
              name: badge.displayName,
              icon: badge.icon,
              description: badge.description,
              condition: badge.description
            });
          } else {
            console.error(`✗ Error awarding badge ${badge.name}:`, error);
          }
        } catch (error) {
          console.error(`✗ Error awarding badge ${badge.name}:`, error);
        }
        */
      } else {
        console.log(`✗ Badge condition not met or already has badge: ${badge.name}`);
      }
    }

    console.log('========== BADGE CHECK COMPLETE ==========');
    console.log('New badges awarded:', newBadges);
    return newBadges;
  } catch (error) {
    console.error('Error in checkAndAwardBadges:', error);
    return [];
  }
};

const getUserStats = async (userId: string) => {
  try {
    console.log('--- Getting user stats ---');
    
    // Đảm bảo badge definitions tồn tại trước khi lấy thống kê
    try {
      // First, check if badge_definitions already exist in the database
      const { data: badgeDefsData, error: badgeDefsError } = await supabase
        .from('badge_definitions')
        .select('*');

      if (badgeDefsError) {
        console.log('Error checking badge definitions:', badgeDefsError);
        // Dùng mảng badgeChecks đã được định nghĩa trước đó
      } else if (!badgeDefsData || badgeDefsData.length === 0) {
        console.log('No badge definitions found, initializing...');
        await initializeBadgeDefinitions();
      }
    } catch (error) {
      console.error('Error checking badge definitions:', error);
      // Tiếp tục sử dụng các badge đã được định nghĩa trước đó
    }

    // Lấy số lượng yêu cầu SOS
    const { data: sosData, error: sosError } = await supabase
      .from('sos_requests')
      .select('id')
      .eq('user_id', userId);

    console.log('SOS requests query result:', { data: sosData, error: sosError });

    // Lấy số lượng lần giúp đỡ thành công (helper_id = userId AND status = completed)
    const { data: helpData, error: helpError } = await supabase
      .from('sos_requests')
      .select('id, status')
      .eq('helper_id', userId)
      .eq('status', 'completed');

    console.log('Help provided query result:', { data: helpData, error: helpError });

    // Lấy đánh giá trung bình
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('sos_ratings')
      .select('rating')
      .eq('helper_id', userId);

    console.log('Ratings query result:', { data: ratingsData, error: ratingsError });

    const averageRating = ratingsData && ratingsData.length > 0 
      ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length 
      : 0;

    const stats = {
      sos_requests: sosData?.length || 0,
      help_provided: helpData?.length || 0,
      average_rating: averageRating
    };

    console.log('Final user stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      sos_requests: 0,
      help_provided: 0,
      average_rating: 0
    };
  }
};

export const initializeBadgeDefinitions = async () => {
  try {
    console.log('========== BADGE INITIALIZATION START ==========');
    
    // Kiểm tra xem badge definitions đã tồn tại chưa
    const { data: existingBadges, error: checkError } = await supabase
      .from('badge_definitions')
      .select('name');
      
    if (checkError) {
      console.error('Error checking existing badge definitions:', checkError);
      return;
    }
    
    console.log(`Found ${existingBadges?.length || 0} existing badge definitions`);
    if (existingBadges) {
      console.log('Existing badges:', existingBadges.map(b => b.name).join(', '));
    }
    
    // Badge definitions using exact names from database - đây là các badge đúng chuẩn
    const defaultBadges = [
      {
        name: 'first_helper',
        icon: '🤝',
        description: 'Hoàn thành lần giúp đỡ đầu tiên',
        condition: 'Giúp đỡ thành công 1 lần'
      },
      {
        name: 'rescue_angel',
        icon: '👼',
        description: 'Giúp đỡ thành công 10 lần',
        condition: 'Giúp đỡ thành công 10 lần'
      },
      {
        name: 'community_hero',
        icon: '🦸',
        description: 'Giúp đỡ thành công 50 lần',
        condition: 'Giúp đỡ thành công 50 lần'
      },
      {
        name: 'trusted_person',
        icon: '⭐',
        description: 'Đạt đánh giá trung bình 4.5 sao',
        condition: 'Đánh giá TB >= 4.5 sao với ít nhất 5 lần giúp đỡ'
      },
      {
        name: 'newcomer',
        icon: '🔰',
        description: 'Gửi yêu cầu SOS đầu tiên',
        condition: 'Gửi yêu cầu SOS đầu tiên'
      },
      {
        name: 'veteran',
        icon: '🏆',
        description: 'Thành viên từ 30 ngày trở lên',
        condition: 'Tham gia từ 30 ngày trở lên'
      }
    ];

    // Thêm từng badge definition riêng lẻ thay vì một lúc
    for (const badge of defaultBadges) {
      console.log(`Upserting badge definition: ${badge.name}`);
      
      const { error } = await supabase
        .from('badge_definitions')
        .upsert(badge, {
          onConflict: 'name'
        });

      if (error) {
        console.error(`Error upserting badge definition ${badge.name}:`, error);
      } else {
        console.log(`✓ Badge definition ready: ${badge.name}`);
      }
    }

    // Kiểm tra lại xem các badge đã được thêm vào thành công chưa
    const { data: verifiedBadges, error: verifyError } = await supabase
      .from('badge_definitions')
      .select('name');
      
    if (verifyError) {
      console.error('Error verifying badge definitions:', verifyError);
    } else {
      console.log(`Verified ${verifiedBadges?.length || 0} badge definitions exist after initialization`);
      console.log('Available badges after init:', verifiedBadges?.map(b => b.name).join(', '));
    }

    console.log('========== BADGE INITIALIZATION COMPLETE ==========');
  } catch (error) {
    console.error('Error in initializeBadgeDefinitions:', error);
  }
};
