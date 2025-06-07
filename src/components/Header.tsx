import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Header: React.FC = () => {
  const { profile } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <img src="/logosc.png" alt="SafeConnect" className="h-8" />

        {/* User Info */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
            <NotificationBell />
          
          {profile && (
            <>
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                  {profile.is_verified && (
                   <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <img 
                                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABNUlEQVR4nN1VQU7DQAxc+AKIN3AoN55RqZ3pE/KGIKCHfqc8oPlD+4u2B1QolQoXvJdFTlOpJJt0N6JIYMmX2J7x2o5tzL8VNxqdW3JoyaUAb0JmQia5AhP9pjb1Ud9oAkumlnSBeheXfb9/IeR7KIEAHw64CgPvdi8t8BSRvcsVGGtsPbAxZ1qWmMxt+SW72FSxfDUftgW2VX3wESyjMwa2Qk495ZpXCIqxiynHSoBOHkvOSrZ1lYDMWoEDHX1JyZ75CJIasOkhQAWcXHlikiACBT8ECgFvIsi8TcS3UhwFL+ImPoJNjfOL9Ho3e79P8lqA5yM9eo0aU9FsB4Nb1abMG8fUAo8n/dHcqVdFadmNf3zZ/dq6bnlwUhMrRU/uLbnQ3ZKfyf3J3J3PtU6L+jTW/M/LF0YnQRyAesL/AAAAAElFTkSuQmCC" 
                                alt="verified-account"
                                className="w-4 h-4"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Đã xác minh</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                  )}
                </div>
                {profile.is_volunteer_ready && (
                  <p className="text-xs text-green-600">Sẵn sàng giúp đỡ</p>
                )}
              </div>
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
                <AvatarFallback className="text-sm">{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;