import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import {
  Users, Store, UserPlus, Building, BarChart3, Settings, Crown, Shield, TrendingUp, MapPin, Calendar, Bell, Search, Filter, Eye, Edit, Trash2, Plus, X, Save, AlertCircle, CheckCircle, LogOut, Download, Upload, RefreshCw, ChevronDown, Activity, DollarSign, IndianRupee, PieChart, LineChart, Target, Award, Zap, Heart
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart as RPieChart, Pie, Cell, LineChart as RLineChart, Line
} from 'recharts';
import { WidthProvider, Responsive as RGLResponsive } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(RGLResponsive);

export const AdminDashboard = () => {

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'shop', 'manager', 'user'
  const [editingItem, setEditingItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const getManagerNameById = (managerId) => {
    if (!managerId) return 'Not assigned';
    const manager = managers.find(m => m._id === managerId);
    return manager ? manager.fullName : 'Manager Not Found';
  };

  // Data states
  const [stats, setStats] = useState({
    totalShops: 0,
    totalManagers: 0,
    monthlyRevenue: '₹0',
    activeShops: 0,
    totalCustomers: 0
  });



  const [shops, setShops] = useState([]);
  const [managers, setManagers] = useState([]);

  const [recentActivities, setRecentActivities] = useState([]);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Form states
  const [shopForm, setShopForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    managerId: ''
  });

  const [managerForm, setManagerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    assignedShop: ''
  });

  const [reportPeriod, setReportPeriod] = useState('30');
  const [overviewStats, setOverviewStats] = useState(null);
  const [revenueDetails, setRevenueDetails] = useState(null);
  const [shopAnalytics, setShopAnalytics] = useState(null);
  const [petsAnalytics, setPetsAnalytics] = useState(null);
  const [growthMetrics, setGrowthMetrics] = useState(null);
  // const [services, setServices] = useState([]);
  const [serviceUsage, setServiceUsage] = useState([]);
  const [topServicesByShop, setTopServicesByShop] = useState([]);

  // Replace the existing layouts state initialization with this:
  const [layouts, setLayouts] = useState({
    lg: [
      { i: 'shop-revenue', x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 3 },
      { i: 'top-services', x: 6, y: 0, w: 6, h: 6, minW: 4, minH: 3 },
      { i: 'appointments', x: 0, y: 4, w: 6, h: 6, minW: 4, minH: 3 },
      { i: 'pet-species', x: 6, y: 4, w: 6, h: 6, minW: 4, minH: 3 }
    ],
    md: [
      { i: 'shop-revenue', x: 0, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
      { i: 'top-services', x: 5, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
      { i: 'appointments', x: 0, y: 4, w: 5, h: 4, minW: 4, minH: 3 },
      { i: 'pet-species', x: 5, y: 4, w: 5, h: 4, minW: 4, minH: 3 }
    ],
    sm: [
      { i: 'shop-revenue', x: 0, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
      { i: 'top-services', x: 3, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
      { i: 'appointments', x: 0, y: 4, w: 3, h: 4, minW: 3, minH: 3 },
      { i: 'pet-species', x: 3, y: 4, w: 3, h: 4, minW: 3, minH: 3 }
    ],
    xs: [
      { i: 'shop-revenue', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
      { i: 'top-services', x: 0, y: 4, w: 4, h: 4, minW: 4, minH: 3 },
      { i: 'appointments', x: 0, y: 8, w: 4, h: 4, minW: 4, minH: 3 },
      { i: 'pet-species', x: 0, y: 12, w: 4, h: 4, minW: 4, minH: 3 }
    ]
  });

  // Replace the existing charts section in renderAnalyticsTab() with this redesigned version

  // Add these filter states near the top of your component (with other useState declarations)
  const [chartFilters, setChartFilters] = useState({
    revenueFilter: '',
    serviceFilter: '',
    appointmentFilter: '',
    speciesFilter: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [reportPeriod]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadShops(),
        loadManagers(),
        loadReports(),
        // loadServices()

        loadTopServicesByShop()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
    await loadRecentActivities();
  };

  const loadShops = async () => {
    try {
      const response = await api.get('/api/shops');
      const shopsData = response.data || [];

      console.log('=== DEBUG SHOPS DATA ===');
      console.log('Full response:', response.data);
      console.log('First shop:', shopsData[0]);
      console.log('First shop managerId:', shopsData[0]?.managerId);
      console.log('Type of managerId:', typeof shopsData[0]?.managerId);
      console.log('========================');

      setShops(shopsData);
    } catch (error) {
      console.error('Error loading shops:', error);
      setError('Failed to load shops');
      setShops([]);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await api.get('/api/admin/managers');
      setManagers(response.data || []);
    } catch (error) {
      console.error('Error loading managers:', error);
      setError('Failed to load managers');
      setManagers([]);
    }
  };

  // const loadServices = async () => {
  //   try {
  //     // Try public services endpoint first
  //     const res = await api.get('/api/admin/reports/services');
  //     setServices(res.data || []);
  //   } catch (e1) {
  //     try {
  //       // Fallback: some backends expose admin path
  //       const res2 = await api.get('/api/admin/reports');
  //       setServices(res2.data || []);
  //     } catch (e2) {
  //       console.error('Error loading services:', e2);
  //       setServices([]);
  //     }
  //   }
  // };



  const loadTopServicesByShop = async () => {
    try {
      console.log('🔍 Requesting top services for period:', reportPeriod);
      const res = await api.get(`/api/admin/reports/top-services?period=${reportPeriod}`);
      console.log('📊 API Response:', res.data);
      setTopServicesByShop(res.data?.data || []);
    } catch (e) {
      console.error('❌ API Error:', e.response?.data || e.message);
      setTopServicesByShop([]);
    }
  };

  const loadRecentActivities = async () => {
    try {
      // Generate activities from recent data changes
      const activities = [];

      // Add recent shop registrations
      shops.slice(-5).forEach((shop) => {
        activities.push({
          id: `shop-${shop._id}`,
          action: `New shop registered: ${shop.name}`,
          location: shop.address || 'Unknown location',
          time: getTimeAgo(shop.createdAt),
          type: 'shop',
          icon: '🏪'
        });
      });

      // Add recent manager additions
      managers.slice(-4).forEach((manager) => {
        activities.push({
          id: `manager-${manager._id}`,
          action: `Manager added: ${manager.fullName}`,
          location: manager.assignedShop ? getShopName(manager.assignedShop._id || manager.assignedShop) : 'Unassigned',
          time: getTimeAgo(manager.createdAt),
          type: 'manager',
          icon: '👨‍💼'
        });
      });

      // Add some system activities if needed
      if (activities.length < 3) {
        activities.push({
          id: 'system-1',
          action: 'System health check completed',
          location: 'Server',
          time: 'Just now',
          type: 'system',
          icon: '⚙️'
        });
      }

      // Sort by most recent and take first 10
      activities.sort((a, b) => {
        const parseTimeAgo = (timeStr) => {
          if (!timeStr || timeStr === 'Just now') return 0;
          const match = timeStr.match(/(\d+)\s*(hour|day)s?\s*ago/);
          if (!match) return 0;
          const [, num, unit] = match;
          return unit === 'day' ? parseInt(num) * 24 : parseInt(num);
        };

        return parseTimeAgo(a.time) - parseTimeAgo(b.time);
      });

      setRecentActivities(activities.slice(0, 10));

    } catch (error) {
      console.error('Error generating activities:', error);
      setRecentActivities([]); // Set empty array on error
    }
  };
  // Calculate stats after data is loaded
  useEffect(() => {
    if (shops.length > 0 || managers.length > 0) {
      calculateStats();
    }
  }, [shops, managers]);

  const calculateStats = () => {
    const totalShops = shops.length;
    const totalManagers = managers.length;
    const activeShops = shops.filter(shop => shop.status !== 'inactive').length;
    const totalCustomers = shops.reduce((sum, shop) => sum + (shop.customerCount || 0), 0);

    // Calculate monthly revenue (mock calculation - replace with real data)
    const currentMonth = new Date().getMonth();
    console.log(currentMonth);

    const monthlyRevenue = totalShops * 2500; // Estimated revenue per shop

    setStats({
      totalShops,
      totalManagers,
      monthlyRevenue: `₹${monthlyRevenue.toLocaleString()}`,
      activeShops,
      totalCustomers
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getShopName = (shopId) => {
    const shop = shops.find(s => s._id === shopId);
    return shop ? shop.name : 'Unknown Shop';
  };



  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    setSuccess('Data refreshed successfully!');
  };


  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);

    if (item) {
      switch (type) {
        case 'shop':
          setShopForm({
            name: item.name || '',
            address: item.address || '',
            phone: item.phone || '',
            email: item.email || '',
            managerId: item.managerId || ''
          });
          break;
        case 'manager':
          setManagerForm({
            fullName: item.fullName || '',
            email: item.email || '',
            phone: item.phone || '',
            password: '',
            assignedShop: item.assignedShop || ''
          });
          break;

      }
    } else {
      resetForms();
    }
    setShowModal(true);
  };

  const resetForms = () => {
    setShopForm({ name: '', address: '', phone: '', email: '', managerId: '' });
    setManagerForm({ fullName: '', email: '', phone: '', password: '', assignedShop: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      let formData;

      switch (modalType) {
        // new changes from here
        case 'shop':
          formData = {
            name: shopForm.name.trim(),
            address: shopForm.address.trim(),
            phone: shopForm.phone.trim(),
            email: shopForm.email.trim(),
            managerId: shopForm.managerId || null,
            userIds: []
          };

          if (editingItem) {
            response = await api.put(`/api/shops/${editingItem._id}`, formData);
          } else {
            response = await api.post('/api/shops', formData);
          }

          // Reload both shops AND managers data to reflect changes
          await Promise.all([loadShops(), loadManagers()]);
          break;


        case 'manager':
          formData = {
            fullName: managerForm.fullName.trim(),
            email: managerForm.email.trim(),
            phone: managerForm.phone ? managerForm.phone.toString().trim() : '',
            assignedShop: managerForm.assignedShop || null
          };

          if (managerForm.password && managerForm.password.trim()) {
            formData.password = managerForm.password.trim();
          }

          if (editingItem) {
            response = await api.put(`/api/admin/managers/${editingItem._id}`, formData);
          } else {
            if (!managerForm.password || !managerForm.password.trim()) {
              setError('Password is required for new managers');
              return;
            }
            response = await api.post('/api/admin/managers', formData);
            console.log(response);
          }

          // Reload both managers AND shops data
          await Promise.all([loadManagers(), loadShops()]);
          break;
      }

      setSuccess(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} ${editingItem ? 'updated' : 'created'} successfully!`);
      setShowModal(false);
      setEditingItem(null);
      resetForms();

    } catch (error) {
      console.error('Submit error:', error);
      setError(error.response?.data?.message || `Failed to ${editingItem ? 'update' : 'create'} ${modalType}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      // Use consistent API endpoints
      let endpoint;
      switch (type) {
        case 'shop':
          endpoint = `/api/shops/${id}`; // Match the pattern used in loadShops
          break;
        case 'manager':
          endpoint = `/api/admin/managers/${id}`; // Keep existing pattern for managers
          break;
        default:
          endpoint = `/api/admin/${type}s/${id}`;
      }

      await api.delete(endpoint);

      // Reload data instead of manual state updates
      switch (type) {
        case 'shop':
          await Promise.all([loadShops(), loadManagers()]); // Reload both since managers might reference shops
          break;
        case 'manager':
          await Promise.all([loadManagers(), loadShops()]); // Reload both since shops might reference managers
          break;
      }

      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.message || `Failed to delete ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const [overviewRes, revenueRes, shopRes, growthRes] = await Promise.all([
        api.get(`/api/admin/reports/overview?period=${reportPeriod}`),
        api.get(`/api/admin/reports/revenue`),
        api.get(`/api/admin/reports/shops?period=${reportPeriod}`),
        api.get(`/api/admin/reports/growth?period=6`)
      ]);

      setOverviewStats(overviewRes.data.data);
      setRevenueDetails(revenueRes.data.data);
      setShopAnalytics(shopRes.data.data);
      setGrowthMetrics(growthRes.data.data);

      // Update the existing stats state with real data
      if (overviewRes.data.data) {
        const overview = overviewRes.data.data.overview;
        const revenue = overviewRes.data.data.revenue;

        setStats({
          totalShops: overview.totalShops,
          totalManagers: overview.totalManagers,
          monthlyRevenue: `₹${revenue.totalRevenue.toLocaleString()}`,
          activeShops: overview.activeShops,
          totalCustomers: overview.totalUsers
        });
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports data');
    } finally {
      setIsLoading(false);
    }
  };


  const renderOverviewTab = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Shops</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalShops}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">{stats.activeShops} active shops</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Shop Managers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalManagers}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Shield className="w-4 h-4 text-purple-500 mr-1" />
            <span className="text-purple-600">{managers.filter(m => m.assignedShop).length} assigned</span>
          </div>
        </div>

        {/* <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Shop Performance</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round((stats.activeShops / stats.totalShops) * 100) || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">Active shops ratio</span>
            </div>
          </div> */}

        {/* <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">Across all shops</span>
          </div>
        </div> */}
      </div>

      {/* Quick Actions and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-orange-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => openModal('shop')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-colors group"
            >
              <Building className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-blue-800">Register Shop</span>
            </button>

            <button
              onClick={() => openModal('manager')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-colors group"
            >
              <UserPlus className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-purple-800">Add Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-colors group"
            >
              <BarChart3 className="w-8 h-8 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-orange-800">View Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('shops')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-colors group"
            >
              <Store className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-green-800">Manage Shops</span>
            </button>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-500" />
              Recent Activities
            </h3>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              // Show only 2 activities initially, or all if showAllActivities is true
              (showAllActivities ? recentActivities : recentActivities.slice(0, 2)).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="text-lg">{activity.icon || '📝'}</div>
                  <div className={`w-2 h-2 rounded-full ${activity.type === 'shop' ? 'bg-blue-400' :
                    activity.type === 'manager' ? 'bg-purple-400' :
                      activity.type === 'system' ? 'bg-gray-400' :
                        activity.type === 'security' ? 'bg-red-400' :
                          activity.type === 'report' ? 'bg-orange-400' :
                            'bg-green-400'
                    }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{activity.location}</span>
                      <span className="mx-2">•</span>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
          {recentActivities.length > 2 && (
            <button
              onClick={() => setShowAllActivities(!showAllActivities)}
              className="w-full mt-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors flex items-center justify-center space-x-1"
            >
              <span>{showAllActivities ? 'Show Less' : `View All Activities (${recentActivities.length})`}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllActivities ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  const renderDataTable = (data, type) => {
    const getColumns = () => {
      switch (type) {
        case 'shops':
          return ['Name', 'Address', 'Phone', 'Email', 'Manager', 'Status', 'Actions'];
        case 'managers':
          return ['Name', 'Email', 'Phone', 'Assigned Shop', 'Status', 'Actions'];
        case 'users':
          return ['Name', 'Email', 'Phone', 'Assigned Shop', 'Status', 'Actions'];
        default:
          return [];
      }
    };

    const filteredData = data.filter(item => {
      const searchFields = type === 'shops' ? [item.name, item.address, item.email] :
        type === 'managers' ? [item.fullName, item.email] :
          [item.fullName, item.email];

      return searchFields.some(field =>
        field?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 capitalize">{type} Management</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${type}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
              <button
                onClick={() => openModal(type.slice(0, -1))}
                className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add {type.slice(0, -1)}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {getColumns().map((column) => (
                  <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item, index) => (
                <tr key={`${type}-${item._id}-${index}`} className="hover:bg-gray-50">
                  {type === 'shops' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{item.address}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.managerId ? (
                          <span className="text-gray-900 font-medium">
                            {/* FIXED: Check if managerId is populated object or just string ID */}
                            {typeof item.managerId === 'object' && item.managerId.fullName
                              ? item.managerId.fullName
                              : getManagerNameById(item.managerId)
                            }
                          </span>
                        ) : (
                          <span className="text-orange-600 font-medium">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.status === 'active' ? 'bg-green-100 text-green-800' :
                          item.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          {item.status || 'active'}
                        </span>
                      </td>
                    </>
                  )}
                  {type === 'managers' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.fullName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.assignedShop?.name || (
                          <span className="text-orange-600 font-medium">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.assignedShop ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                          {item.assignedShop ? 'Assigned' : 'Available'}
                        </span>
                      </td>
                    </>
                  )}
                  {type === 'users' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.fullName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.assignedShop?.name || (
                          <span className="text-orange-600 font-medium">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.assignedShop ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                          {item.assignedShop ? 'Assigned' : 'Available'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openModal(type.slice(0, -1), item)}
                        className="text-orange-600 hover:text-orange-900 p-1 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(type.slice(0, -1), item._id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              {type === 'shops' ? <Store className="w-12 h-12 mx-auto opacity-50" /> :
                type === 'managers' ? <Shield className="w-12 h-12 mx-auto opacity-50" /> :
                  <Users className="w-12 h-12 mx-auto opacity-50" />}
            </div>
            <p className="text-lg font-medium mb-2">
              {searchTerm ? `No ${type} found` : `No ${type} yet`}
            </p>
            <p className="text-sm">
              {searchTerm
                ? `No ${type} match your search criteria.`
                : `Click "Add ${type.slice(0, -1)}" to get started!`}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Replace the entire renderAnalyticsTab function with this fixed version:

  const renderAnalyticsTab = () => {
    // Derive rows for the Shop Revenues bar chart
    const rows = (shopAnalytics?.shopAnalytics || []).map(s => ({
      name: s.name?.length > 12 ? `${s.name.slice(0, 12)}...` : s.name || 'Unknown',
      fullName: s.name || 'Unknown',
      totalRevenue: Number(s.totalRevenue || 0)
    }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8); // Limit to top 8 shops for better visibility

    // Appointments per shop (for line chart)
    const apptData = (shopAnalytics?.shopAnalytics || []).map(s => {
      const raw =
        s.totalAppointments ??
        s.appointmentCount ??
        s.appointments ??
        s.appointmentsThisPeriod ??
        s.completedAppointments;

      const canEstimate =
        (s.avgTicketSize ?? 0) > 0 && (s.totalRevenue ?? 0) > 0;
      const estimate = canEstimate
        ? Math.round(Number(s.totalRevenue) / Number(s.avgTicketSize))
        : 0;

      const val = Number(raw ?? estimate ?? 0);
      return {
        name: s.name?.length > 12 ? `${s.name.slice(0, 12)}...` : s.name || 'Unknown',
        appointments: val,
        isEstimated: raw == null && canEstimate
      };
    })
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 8);

    // Pets insights derived data - fallback to shop data if petsAnalytics not available
    const speciesData = Array.isArray(petsAnalytics?.speciesBreakdown) ? petsAnalytics.speciesBreakdown.map(s => ({
      name: (s.species || 'Unknown').toString(),
      value: Number(s.count || 0),
      percentage: petsAnalytics.totalPets > 0
        ? Math.round((Number(s.count || 0) / petsAnalytics.totalPets) * 100)
        : 0
    }))
      : shopAnalytics?.shopAnalytics ?
        // Fallback: create pie chart from shop pet data
        shopAnalytics.shopAnalytics
          .filter(s => (s.totalPets || 0) > 0)
          .map(s => ({
            name: s.name?.length > 15 ? `${s.name.slice(0, 15)}...` : s.name || 'Unknown',
            value: Number(s.totalPets || 0),
            percentage: 0 // Will calculate below
          })) : [];

    // Calculate percentages for fallback data
    if (speciesData.length > 0 && speciesData[0].percentage === 0) {
      const total = speciesData.reduce((sum, item) => sum + item.value, 0);
      speciesData.forEach(item => {
        item.percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
      });
    }

    // Colors for consistency across charts
    const chartColors = [
      "#3b82f6", "#f97316", "#22c55e", "#eab308",
      "#ec4899", "#06b6d4", "#8b5cf6", "#f59e0b"
    ];

    const pieColors = [
      "#eab308", "#ec4899", "#8b5cf6", "#06b6d4",
      "#f59e0b", "#3b82f6", "#f97316", "#22c55e",
    ];

    return (
      <div className="space-y-6">
        {/* Report Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Business Analytics & Reports</h3>
              <p className="text-sm text-gray-600 mt-1">Track performance across all shops and revenue streams</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={reportPeriod}
                onChange={(e) => {
                  setReportPeriod(e.target.value);
                  loadReports();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-sm font-medium"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={loadReports}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Revenue Analytics Cards */}
        {overviewStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Revenue</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    ₹{overviewStats.revenue.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-blue-600 mt-1 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {overviewStats.revenue.transactionCount} transactions
                  </p>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <IndianRupee className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">GST Collected</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">
                    ₹{overviewStats.revenue.totalGst.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 mt-1">18% GST Rate</p>
                </div>
                <div className="p-3 bg-green-500 rounded-xl">
                  <PieChart className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Avg Transaction</p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">
                    ₹{Math.round(overviewStats.revenue.avgTransactionValue).toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">Per appointment</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-xl">
                  <Target className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Appointments</p>
                  <p className="text-3xl font-bold text-orange-900 mt-2">
                    {overviewStats.appointments.totalAppointments}
                  </p>
                  <p className="text-sm text-orange-600 mt-1 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {overviewStats.appointments.completedAppointments} completed
                  </p>
                </div>
                <div className="p-3 bg-orange-500 rounded-xl">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Analytics Dashboard - Single Section */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Interactive Analytics Dashboard
              </h4>
              <p className="text-slate-600 mt-2">Drag, resize, and customize your data visualization experience</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-white rounded-full shadow-md border border-slate-200">
                <span className="text-sm font-medium text-slate-700">
                  {Object.keys(layouts.lg).length} Active Charts
                </span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`group flex items-center space-x-2 px-4 py-2 border rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${showFilters
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters</span>
              </button>
              <button
                onClick={() => setLayouts({
                  lg: [
                    { i: 'shop-revenue', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
                    { i: 'top-services', x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
                    { i: 'appointments', x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
                    { i: 'pet-species', x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 }
                  ],
                  md: [
                    { i: 'shop-revenue', x: 0, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
                    { i: 'top-services', x: 5, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
                    { i: 'appointments', x: 0, y: 4, w: 5, h: 4, minW: 4, minH: 3 },
                    { i: 'pet-species', x: 5, y: 4, w: 5, h: 4, minW: 4, minH: 3 }
                  ],
                  sm: [
                    { i: 'shop-revenue', x: 0, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
                    { i: 'top-services', x: 3, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
                    { i: 'appointments', x: 0, y: 4, w: 3, h: 4, minW: 3, minH: 3 },
                    { i: 'pet-species', x: 3, y: 4, w: 3, h: 4, minW: 3, minH: 3 }
                  ],
                  xs: [
                    { i: 'shop-revenue', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
                    { i: 'top-services', x: 0, y: 4, w: 4, h: 4, minW: 4, minH: 3 },
                    { i: 'appointments', x: 0, y: 8, w: 4, h: 4, minW: 4, minH: 3 },
                    { i: 'pet-species', x: 0, y: 12, w: 4, h: 4, minW: 4, minH: 3 }
                  ]
                })}
                className="group flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4 text-slate-600 group-hover:text-slate-800 transition-colors" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Reset Layout</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-lg font-semibold text-slate-900">Chart Filters</h5>
                <button
                  onClick={() => setChartFilters({
                    revenueFilter: '',
                    serviceFilter: '',
                    appointmentFilter: '',
                    speciesFilter: ''
                  })}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Revenue Threshold</label>
                  <select
                    value={chartFilters.revenueFilter}
                    onChange={(e) => setChartFilters({ ...chartFilters, revenueFilter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Shops</option>
                    <option value="10000">Above ₹10,000</option>
                    <option value="25000">Above ₹25,000</option>
                    <option value="50000">Above ₹50,000</option>
                    <option value="100000">Above ₹1,00,000</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Service Bookings</label>
                  <select
                    value={chartFilters.serviceFilter}
                    onChange={(e) => setChartFilters({ ...chartFilters, serviceFilter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Services</option>
                    <option value="5">5+ Bookings</option>
                    <option value="10">10+ Bookings</option>
                    <option value="20">20+ Bookings</option>
                    <option value="50">50+ Bookings</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Appointments</label>
                  <select
                    value={chartFilters.appointmentFilter}
                    onChange={(e) => setChartFilters({ ...chartFilters, appointmentFilter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Shops</option>
                    <option value="5">5+ Appointments</option>
                    <option value="10">10+ Appointments</option>
                    <option value="25">25+ Appointments</option>
                    <option value="50">50+ Appointments</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pet Count</label>
                  <select
                    value={chartFilters.speciesFilter}
                    onChange={(e) => setChartFilters({ ...chartFilters, speciesFilter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Species</option>
                    <option value="5">5+ Pets</option>
                    <option value="10">10+ Pets</option>
                    <option value="20">20+ Pets</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={(layout, layouts) => setLayouts(layouts)}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={90}
            isDraggable={true}
            isResizable={true}
            margin={[20, 20]}
            containerPadding={[0, 0]}
            useCSSTransforms={true}
          >
            {/* Chart 1: Shop Revenue Performance */}
            {(() => {
              const filteredRows = rows.filter(shop =>
                !chartFilters.revenueFilter || shop.totalRevenue >= parseInt(chartFilters.revenueFilter)
              );
              return filteredRows.length > 0 && (
                <div key="shop-revenue" className="group">
                  <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Modern Header with Gradient */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold">Revenue Performance</h4>
                          <p className="text-blue-100 text-sm">
                            {filteredRows.length} of {rows.length} shops
                            {chartFilters.revenueFilter && ` (above ₹${parseInt(chartFilters.revenueFilter).toLocaleString()})`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {chartFilters.revenueFilter && (
                            <button
                              onClick={() => setChartFilters({ ...chartFilters, revenueFilter: '' })}
                              className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                              title="Clear filter"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                            <BarChart3 className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chart Content */}
                    <div className="p-6 h-[calc(100%-7rem)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredRows} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.6} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                          <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            height={60}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                            labelStyle={{ color: '#1f2937', fontWeight: 'bold', fontSize: '14px' }}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(10px)',
                              border: 'none',
                              borderRadius: '16px',
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                              padding: '16px'
                            }}
                          />
                          <Bar
                            dataKey="totalRevenue"
                            name="Revenue"
                            fill="url(#revenueGradient)"
                            radius={[8, 8, 0, 0]}
                            stroke="#2563eb"
                            strokeWidth={1}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Chart 2: Top Services by Shop */}
            {(() => {
              const filteredServices = topServicesByShop.filter(shop =>
                !chartFilters.serviceFilter ||
                (shop.topService?.bookingCount >= parseInt(chartFilters.serviceFilter))
              );
              return filteredServices.length > 0 && (
                <div key="top-services" className="group">
                  <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Modern Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold">Service Popularity</h4>
                          <p className="text-purple-100 text-sm">
                            {filteredServices.length} of {topServicesByShop.length} shops
                            {chartFilters.serviceFilter && ` (${chartFilters.serviceFilter}+ bookings)`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {chartFilters.serviceFilter && (
                            <button
                              onClick={() => setChartFilters({ ...chartFilters, serviceFilter: '' })}
                              className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                              title="Clear filter"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Award className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chart Content */}
                    <div className="p-6 h-[calc(100%-7rem)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={filteredServices.slice(0, 8)}
                          margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
                        >
                          <defs>
                            <linearGradient id="serviceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                              <stop offset="50%" stopColor="#ec4899" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                          <XAxis
                            dataKey="shopName"
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            height={60}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                            tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                          />
                          <Tooltip
                            formatter={(value, name, props) => {
                              const payload = props.payload;
                              return [
                                `${value} bookings`,
                                `${payload.topService?.serviceName || 'Unknown Service'}`
                              ];
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload[0]) {
                                const data = payload[0].payload;
                                return `${data.shopName}`;
                              }
                              return label;
                            }}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(10px)',
                              border: 'none',
                              borderRadius: '16px',
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                              padding: '16px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="topService.bookingCount"
                            name="Bookings"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fill="url(#serviceAreaGradient)"
                            dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{
                              r: 6,
                              fill: '#7c3aed',
                              strokeWidth: 3,
                              stroke: '#ffffff',
                              filter: 'drop-shadow(0 4px 8px rgba(139, 92, 246, 0.3))'
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Chart 3: Appointment Trends */}
            {(() => {
              const filteredAppointments = apptData.filter(shop =>
                !chartFilters.appointmentFilter || shop.appointments >= parseInt(chartFilters.appointmentFilter)
              );
              return filteredAppointments.length > 0 && (
                <div key="appointments" className="group">
                  <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Modern Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold">Appointment Trends</h4>
                          <p className="text-emerald-100 text-sm">
                            {filteredAppointments.length} of {apptData.length} shops
                            {chartFilters.appointmentFilter && ` (${chartFilters.appointmentFilter}+ appointments)`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {chartFilters.appointmentFilter && (
                            <button
                              onClick={() => setChartFilters({ ...chartFilters, appointmentFilter: '' })}
                              className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                              title="Clear filter"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Activity className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chart Content */}
                    <div className="p-6 h-[calc(100%-7rem)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RLineChart data={filteredAppointments} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                          <defs>
                            <filter id="glow">
                              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                              <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                          <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            height={60}
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                            axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                          />
                          <Tooltip
                            formatter={(value, name, props) => {
                              const isEst = props?.payload?.isEstimated;
                              return [`${Number(value).toLocaleString()} ${isEst ? '(estimated)' : ''}`, 'Appointments'];
                            }}
                            labelStyle={{ color: '#1f2937', fontWeight: 'bold', fontSize: '14px' }}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(10px)',
                              border: 'none',
                              borderRadius: '16px',
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                              padding: '16px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="appointments"
                            name="Appointments"
                            stroke="#10b981"
                            strokeWidth={4}
                            dot={{
                              r: 5,
                              fill: '#10b981',
                              strokeWidth: 3,
                              stroke: '#ffffff',
                              filter: 'url(#glow)'
                            }}
                            activeDot={{
                              r: 7,
                              fill: '#059669',
                              strokeWidth: 4,
                              stroke: '#ffffff',
                              filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.4))'
                            }}
                          />
                        </RLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Chart 4: Pet Species Distribution */}
            {(() => {
              const filteredSpecies = speciesData.filter(species =>
                !chartFilters.speciesFilter || species.value >= parseInt(chartFilters.speciesFilter)
              );
              return filteredSpecies.length > 0 && (
                <div key="pet-species" className="group">
                  <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Modern Header */}
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold">Species Distribution</h4>
                          <p className="text-orange-100 text-sm">
                            {filteredSpecies.length} of {speciesData.length} species
                            {chartFilters.speciesFilter && ` (${chartFilters.speciesFilter}+ pets)`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {chartFilters.speciesFilter && (
                            <button
                              onClick={() => setChartFilters({ ...chartFilters, speciesFilter: '' })}
                              className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                              title="Clear filter"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                            <PieChart className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chart Content */}
                    <div className="p-6 h-[calc(100%-7rem)]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                        {/* Pie Chart */}
                        <div className="flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RPieChart>
                              <defs>
                                {pieColors.map((color, index) => (
                                  <linearGradient key={`gradient-${index}`} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                  </linearGradient>
                                ))}
                              </defs>
                              <Tooltip
                                formatter={(value, name) => {
                                  const species = filteredSpecies.find(s => s.name === name);
                                  return [`${value} pets (${species?.percentage}%)`, name];
                                }}
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  backdropFilter: 'blur(10px)',
                                  border: 'none',
                                  borderRadius: '16px',
                                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                  padding: '16px'
                                }}
                              />
                              <Pie
                                data={filteredSpecies}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                innerRadius={35}
                                paddingAngle={3}
                                stroke="#ffffff"
                                strokeWidth={2}
                              >
                                {filteredSpecies.map((entry, index) => (
                                  <Cell
                                    key={`species-${index}-${entry.name}`}
                                    fill={`url(#pieGradient${index % pieColors.length})`}
                                  />
                                ))}
                              </Pie>
                            </RPieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Modern Legend */}
                        <div className="space-y-3 h-full overflow-y-auto">
                          <h5 className="font-bold text-slate-900 text-sm mb-4">Species Breakdown</h5>
                          <div className="space-y-3">
                            {filteredSpecies.slice(0, 6).map((species, index) => (
                              <div key={`species-legend-${index}-${species.name}`}
                                className="group/item flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                                  />
                                  <span className="text-sm font-semibold text-slate-800 capitalize">{species.name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-slate-900">{species.value}</div>
                                  <div className="text-xs text-slate-600 font-medium">{species.percentage}%</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Summary Card */}
                          <div className="mt-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
                            <div className="text-center">
                              <div className="text-lg font-bold text-slate-900">
                                {filteredSpecies.reduce((sum, s) => sum + s.value, 0)}
                              </div>
                              <div className="text-sm text-slate-600 font-medium">
                                {chartFilters.speciesFilter ? 'Filtered' : 'Total'} Pets
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </ResponsiveGridLayout>


        </div>

        {/* Growth Metrics */}
        {growthMetrics && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Growth Metrics</h4>
                <p className="text-sm text-gray-600">Month-over-month growth across key metrics</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-900 mb-1">
                  {growthMetrics.growthRates.shops}%
                </div>
                <div className="text-sm font-medium text-green-700">Shop Growth</div>
                <div className="flex items-center justify-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">vs last month</span>
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {growthMetrics.growthRates.revenue}%
                </div>
                <div className="text-sm font-medium text-blue-700">Revenue Growth</div>
                <div className="flex items-center justify-center mt-2">
                  <IndianRupee className="w-4 h-4 text-blue-600 mr-1" />
                  <span className="text-xs text-blue-600">vs last month</span>
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="text-2xl font-bold text-purple-900 mb-1">
                  {growthMetrics.growthRates.users}%
                </div>
                <div className="text-sm font-medium text-purple-700">User Growth</div>
                <div className="flex items-center justify-center mt-2">
                  <Users className="w-4 h-4 text-purple-600 mr-1" />
                  <span className="text-xs text-purple-600">vs last month</span>
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="text-2xl font-bold text-orange-900 mb-1">
                  {growthMetrics.growthRates.pets}%
                </div>
                <div className="text-sm font-medium text-orange-700">Pet Growth</div>
                <div className="flex items-center justify-center mt-2">
                  <Heart className="w-4 h-4 text-orange-600 mr-1" />
                  <span className="text-xs text-orange-600">vs last month</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {overviewStats?.paymentMethods && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Payment Methods</h4>
                <p className="text-sm text-gray-600">Revenue breakdown by payment type</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <IndianRupee className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {overviewStats.paymentMethods.map((method, index) => (
                <div key={method._id} className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="text-xl font-bold text-gray-900 mb-1">
                    ₹{method.totalAmount.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-gray-700 capitalize mb-1">{method._id}</div>
                  <div className="text-xs text-gray-500">{method.count} transactions</div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        backgroundColor: chartColors[index % chartColors.length],
                        width: `${(method.totalAmount / Math.max(...overviewStats.paymentMethods.map(p => p.totalAmount))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">General Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Email Notifications</span>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Auto Backup</span>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Security Settings</h4>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-sm text-gray-700">Change Password</span>
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-sm text-gray-700">Two-Factor Authentication</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )


  const gridStyles = `
  .react-grid-item {
    transition: all 200ms ease;
    transition-property: left, top;
  }
  
  .react-grid-item.cssTransforms {
    transition-property: transform;
  }
  
  .react-grid-item > .react-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 0;
    right: 0;
    background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGZpbGw9IiM0Mzk5ZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZD0ibTEgNSA0LTQtNC0xeiIvPjxwYXRoIGQ9Im0zIDUgMi0yLTItMXoiLz48L2c+PC9zdmc+') center no-repeat;
    background-size: 11px 11px;
    cursor: se-resize;
  }
  
  .react-grid-item > .react-resizable-handle::after {
    content: '';
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 5px;
    height: 5px;
    border-right: 2px solid rgba(0, 0, 0, 0.4);
    border-bottom: 2px solid rgba(0, 0, 0, 0.4);
  }
  
  .react-grid-placeholder {
    background: linear-gradient(135deg, #f97316, #ec4899);
    opacity: 0.2;
    transition-duration: 100ms;
    z-index: 2;
    border-radius: 12px;
  }
`;

  // Add the style tag inside the main return statement, before the div:


  return (
    <>
      <style>{gridStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          stats={stats}
        />
        {/* Header */}
        <div className="flex-1 flex flex-col min-w-0 ml-63">
          <header className="bg-white shadow-sm border-b border-orange-100">
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                      {activeTab === 'overview' ? 'Admin Dashboard' :
                        activeTab === 'shops' ? 'Shop Management' :
                          activeTab === 'managers' ? 'Manager Management' :
                            activeTab === 'analytics' ? 'Analytics & Reports' :
                              activeTab === 'revenues' ? 'Shop Revenues' :
                                'System Settings'}
                    </h1>
                    <div className="flex items-center space-x-4">
                      <p className="text-gray-600">
                        Welcome back, <span className="font-medium">Administrator</span>
                      </p>
                      <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full">
                        <Shield className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">
                          System Admin
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <Bell className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Add admin status bar similar to manager's shop status */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">System Status: Online</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      🏪 {stats.totalShops} Active Shops
                    </div>
                    <div className="text-sm text-gray-600">
                      👥 {stats.totalManagers} Managers
                    </div>
                    <div className="text-sm text-gray-600">
                      📊 {stats.monthlyRevenue} Monthly Revenue
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="w-full px-6 py-8 overflow-x-hidden">
            <main className="flex-1 p-6 overflow-y-auto">
              {/* Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-800">{error}</p>
                  </div>
                  <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <p className="text-green-800">{success}</p>
                  </div>
                  <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Loading Overlay */}
              {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40">
                  <div className="bg-white rounded-2xl p-6 flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    <span className="text-gray-700">Processing...</span>
                  </div>
                </div>
              )}

              {/* Tab Content */}
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 min-h-[600px] w-full">
                <div className="p-6">
                  {activeTab === 'overview' && renderOverviewTab()}
                  {activeTab === 'shops' && renderDataTable(shops, 'shops')}
                  {activeTab === 'managers' && renderDataTable(managers, 'managers')}
                  {activeTab === 'analytics' && renderAnalyticsTab()}
                  {activeTab === 'settings' && renderSettingsTab()}
                </div>
              </div>
            </main>
          </div>

          {/* Modal for Adding/Editing */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingItem ? `Edit ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}` : `Add New ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`}
                  </h3>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                      resetForms();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {modalType === 'shop' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
                        <input
                          type="text"
                          value={shopForm.name}
                          onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter shop name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                        <textarea
                          value={shopForm.address}
                          onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter shop address"
                          rows="3"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <input
                          type="number"
                          value={shopForm.phone}
                          onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter phone number"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={shopForm.email}
                          onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                      {/* <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign Manager (Optional)</label>
                      <select
                        value={shopForm.managerId || ''}
                        onChange={(e) => setShopForm({
                          ...shopForm,
                          managerId: e.target.value || null
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      >
                        <option value="">Select a manager</option>
                        {managers.map((manager) => (
                          <option key={manager._id} value={manager._id}>
                            {manager.fullName} ({manager.email})
                          </option>
                        ))}
                      </select>
                    </div> */}
                    </>
                  )}

                  {modalType === 'manager' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={managerForm.fullName}
                          onChange={(e) => setManagerForm({ ...managerForm, fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={managerForm.email}
                          onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="number"
                          value={managerForm.phone}
                          onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter phone number"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password {editingItem ? '(Leave blank to keep current)' : '*'}
                        </label>
                        <input
                          type="password"
                          value={managerForm.password}
                          onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                          placeholder="Enter password"
                          required={!editingItem}
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign Shop </label>
                        <select
                          value={managerForm.assignedShop}
                          onChange={(e) => setManagerForm({ ...managerForm, assignedShop: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        >
                          <option value="">Select a shop</option>
                          {shops.filter(shop => !shop.managerId || shop.managerId === managerForm.assignedShop).map((shop) => (
                            <option key={shop._id} value={shop._id}>
                              {shop.name} ({shop.address})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Only shops without managers are shown</p>
                      </div>
                    </>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingItem(null);
                        resetForms();
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingItem ? 'Update' : 'Create'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Pet-themed footer */}
          <div className="mt-8 text-center">
            <div className="flex justify-center items-center space-x-4 text-3xl mb-2">
              <span className="animate-pulse">👑</span>
              <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>🐕</span>
              <span className="animate-pulse" style={{ animationDelay: '1s' }}>✨</span>
              <span className="animate-pulse" style={{ animationDelay: '1.5s' }}>🐱</span>
              <span className="animate-pulse" style={{ animationDelay: '2s' }}>👑</span>
            </div>
            <p className="text-sm text-gray-500">Managing the kingdom of pet grooming! 🐾</p>
          </div>
        </div>
      </div>
    </>
  );

};
