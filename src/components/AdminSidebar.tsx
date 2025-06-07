
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  MessageSquare, 
  AlertTriangle,
  Shield,
  Settings
} from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const menuItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/admin/users', icon: Users, label: 'Quản lý người dùng' },
    { to: '/admin/sos-requests', icon: AlertTriangle, label: 'Yêu cầu SOS' },
    { to: '/admin/support-points', icon: MapPin, label: 'Điểm hỗ trợ' },
    { to: '/admin/community', icon: MessageSquare, label: 'Cộng đồng' },
    { to: '/admin/admins', icon: Shield, label: 'Quản trị viên' },
    { to: '/admin/settings', icon: Settings, label: 'Cài đặt' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-600">Bảng điều khiển quản trị</p>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-red-600 bg-red-50 border-r-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AdminSidebar;
