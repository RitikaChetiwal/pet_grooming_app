// components/Sidebar.jsx
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';
import {
  Users,
  Store,
  UserPlus,
  Building,
  BarChart3,
  Settings,
  Crown,
  Shield,
  TrendingUp,
  MapPin,
  Calendar,
  Bell,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  LogOut,
  Download,
  Upload,
  RefreshCw,
  ChevronDown,
  Activity,
  Home,
  Package,
  ClipboardList
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, stats = {} }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  // Define sidebar options based on user role
  const getSidebarOptions = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'shops', label: `Shops (${stats.totalShops || 0})`, icon: Store },
          { id: 'managers', label: `Managers (${stats.totalManagers || 0})`, icon: Shield },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          // { id: 'revenues', label: 'Shop Revenues', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings }
        ];

      case 'manager':
        return [
          { id: 'overview', label: 'Dashboard', icon: Home },
          // { id: 'shop', label: 'My Shop', icon: Store },
          { id: 'users', label: 'Staff', icon: Users }, // Changed from 'Shop Users'
          { id: 'bookings', label: 'Bookings', icon: Calendar },
          { id: 'services', label: 'Services', icon: Package },
          { id: 'payments', label: 'Payments', icon: BarChart3 }, // Changed from 'reports' to 'payments'
          { id: 'settings', label: 'Settings', icon: Settings }
        ];

      case 'user':
        return [
          { id: 'overview', label: 'Dashboard', icon: Home },
          { id: 'appointments', label: 'Appointments', icon: Users },
          { id: 'profile', label: 'Profile', icon: Users },
          { id: 'settings', label: 'Settings', icon: Settings }
        ];

      default:
        return [];
    }
  };

  const sidebarOptions = getSidebarOptions();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-orange-100 h-screen flex flex-col overflow-hidden min-h-screeen fixed">
      {/* Logo/Brand Section */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
              PetGrooming
            </h1>
            <p className="text-xs text-gray-500 capitalize">{user?.role} Panel</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.fullName || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu - Scrollable if needed */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {sidebarOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeTab === option.id;

            return (
              <button
                key={option.id}
                onClick={() => setActiveTab(option.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="space-y-2">
          {/* Notifications */}
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-orange-50 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span className="text-sm font-medium">Notifications</span>
            {(stats.todayRegistrations > 0 || stats.totalUsers > 0) && (
              <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Pet-themed footer - Fixed at bottom */}
      <div className="p-4 text-center border-t border-gray-100 flex-shrink-0">
        <div className="flex justify-center items-center space-x-2 text-lg mb-1">
          <span className="animate-pulse">🐕</span>
          <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>✨</span>
          <span className="animate-pulse" style={{ animationDelay: '1s' }}>🐱</span>
        </div>
        <p className="text-xs text-gray-400">Kingdom of Pets 🐾</p>
      </div>
    </div>
  );
};

export default Sidebar;