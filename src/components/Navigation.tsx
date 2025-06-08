import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MapPin, Users, Bell, User } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const Navigation: React.FC = () => {
  const { t } = useTranslation();
  
  const navItems = [
    { to: '/home', icon: Home, label: t('nav.home') },
    { to: '/map', icon: MapPin, label: t('nav.map') },
    { to: '/community', icon: Users, label: t('nav.community') },
    { to: '/support-points', icon: Bell, label: t('nav.support_points') },
    { to: '/profile', icon: User, label: t('nav.profile') }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around py-3 pb-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center relative transition-all duration-300 ease-out ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`
                    relative p-3 rounded-2xl transition-all duration-300 ease-out
                    ${isActive 
                      ? 'bg-red-100 scale-110 shadow-lg' 
                      : 'hover:bg-gray-50 hover:scale-105'
                    }
                  `}>
                    <item.icon 
                      size={22} 
                      className={`transition-all duration-300 ${
                        isActive ? 'text-red-600' : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <span className={`
                    text-xs mt-1 transition-all duration-300 font-medium
                    ${isActive 
                      ? 'text-red-600 scale-105' 
                      : 'text-gray-500'
                    }
                  `}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;