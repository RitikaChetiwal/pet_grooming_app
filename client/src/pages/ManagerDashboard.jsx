import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import {
  Scissors,
  Calendar,
  Users,
  PawPrint,
  TrendingUp,
  Clock,
  DollarSign,
  Star,
  Bell,
  Plus,
  BarChart3,
  MapPin,
  LogOut,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  Package,
  UserPlus,
  ShoppingCart,
  Download,
  Settings
} from 'lucide-react';

const ManagerDashboard = () => {
  // const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    transactionId: ''
  });

  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentLimit, setPaymentLimit] = useState(10);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  // console.log(refreshing);

  // Data states
  const [shopStats, setShopStats] = useState({
    todayAppointments: 0,
    completedToday: 0,
    dailyRevenue: '₹0',
    customerSatisfaction: 0,
    activeStaff: 0,
    totalPets: 0
  });

  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [staff, setStaff] = useState([]);
  const [pets, setPets] = useState([]);
  const [payments, setPayments] = useState([]);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: 'basic'
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });

  // Appointments pagination
  const [aptPage, setAptPage] = useState(1);
  const [aptLimit, setAptLimit] = useState(10);   // page size
  const [aptTotal, setAptTotal] = useState(0);    // total appointments (server)

  const [refreshing, setRefreshing] = useState(false);


  // Load data on component mount
  useEffect(() => {
    if (user?.assignedShop) {
      loadDashboardData();
    } else {
      setError('No shop assigned to this manager. Please contact admin.');
    }
  }, [user]);

  useEffect(() => {
    if (user?.assignedShop) {
      loadAppointments(aptPage, aptLimit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aptPage, aptLimit, user?.assignedShop]);


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

  useEffect(() => {
    // Check if manager has assigned shop
    if (!user?.assignedShop) {
      setError('No shop assigned to your account. Please contact administrator to assign you to a shop.');
      return;
    }



    // Verify shop assignment
    const verifyShopAssignment = async () => {
      try {
        const shopId = typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop;
        const response = await api.get(`/api/shops/${shopId}/verify-manager`);

        if (!response.data.isAuthorized) {
          setError('You are not authorized to manage this shop. Please contact administrator.');
        }
      } catch (error) {
        console.error('Shop verification failed:', error);
        setError('Unable to verify shop assignment. Please try refreshing or contact administrator.');
      }
    };

    if (user?.assignedShop) {
      verifyShopAssignment();
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.assignedShop) {
      loadPayments(paymentPage, paymentLimit);
    }
  }, [paymentPage, paymentLimit, user?.assignedShop, paymentSearchTerm]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadShopInfo(),
        loadServices(),
        loadStaff(),
        loadPets(),
        loadAppointments(aptPage, aptLimit),
        loadPayments(),
        loadShopStats()
      ]);

      // Remove the conditional loading - always load appointments
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShopInfo = async () => {
    try {
      let shopId;
      let shopData;

      if (typeof user?.assignedShop === 'object' && user.assignedShop?._id) {
        shopData = user.assignedShop;
        shopId = user.assignedShop._id;
      } else if (typeof user?.assignedShop === 'string') {
        shopId = user.assignedShop;
        // FIXED: Use a generic shop endpoint if available, or get from user profile
        try {
          const response = await api.get(`/api/shops/${shopId}`);
          shopData = response.data;
        } catch (error) {
          // If specific shop endpoint doesn't exist, you might need to add it
          // Or get shop info from user profile refresh
          console.warn('Shop endpoint not found, using assigned shop data from user');
          console.error(error);
          shopData = { _id: shopId, name: 'Your Shop', address: 'N/A', phone: 'N/A', email: 'N/A' };
        }
      } else {
        throw new Error('No shop assignment found');
      }

      setShopInfo(shopData);
      document.title = `Manager Dashboard - ${shopData.name} | Pet Grooming`;

    } catch (error) {
      console.error('Error loading shop info:', error);

      if (error.message === 'No shop assignment found') {
        setError('No shop assigned to your manager account. Please contact administrator.');
      } else if (error.response?.status === 404) {
        setError('Your assigned shop was not found. Please contact administrator.');
      } else {
        setError('Failed to load shop information. Please try refreshing the page.');
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    setSuccess('Data refreshed successfully!');
  };

  // Use local names (pg, lim) so we never reference an undefined `page`
  const loadAppointments = async (pg = aptPage, lim = aptLimit) => {
    try {
      const response = await api.get('/api/manager/appointments', {
        params: { page: pg, limit: lim }   // <-- map explicitly
      });

      const data =
        response?.data?.data ??
        response?.data?.docs ??
        response?.data ??
        [];

      setAppointments(Array.isArray(data) ? data : []);

      const total =
        response?.data?.total ??
        response?.data?.totalDocs ??
        Number(response?.headers?.['x-total-count']) ??
        (Array.isArray(data) ? data.length : 0);

      setAptTotal(Number.isFinite(total) ? total : 0);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
      setAptTotal(0);
    }
  };

  const loadPayments = async (pg = paymentPage, lim = paymentLimit) => {
    try {
      const response = await api.get('/api/manager/payments', {
        params: {
          page: pg,
          limit: lim,
          search: paymentSearchTerm // if you want to add search functionality
        }
      });

      const data =
        response?.data?.data ??
        response?.data?.docs ??
        response?.data ??
        [];

      setPayments(Array.isArray(data) ? data : []);

      const total =
        response?.data?.total ??
        response?.data?.totalDocs ??
        Number(response?.headers?.['x-total-count']) ??
        (Array.isArray(data) ? data.length : 0);

      setPaymentTotal(Number.isFinite(total) ? total : 0);
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
      setPaymentTotal(0);
    }
  };


  const loadServices = async () => {
    try {
      const shopId = typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop;
      const response = await api.get(`/api/shops/${shopId}/services`);  // ✅ correct endpoint

      if (response.data.success) {
        setServices(response.data.data || []);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      setError('Failed to load services. Please check your connection and try again.');
      setServices([]);
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      price: '',
      duration: '',
      category: 'basic'
    });
    setShowServiceModal(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
      category: service.category || 'basic'
    });
    setShowServiceModal(true);
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }
    setIsLoading(true);
    try {
      const shopId = typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop;

      // Add token verification
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await api.delete(`/api/shops/${shopId}/services/${serviceId}`);

      if (response.data.success) {
        setServices(prev => prev.filter(s => s._id !== serviceId));
        setSuccess(response.data.message || 'Service deleted successfully!');
      }
    } catch (error) {
      console.error('Delete service error:', error);

      // Better error handling
      if (error.response?.status === 403) {
        setError('You are not authorized to delete services for this shop. Please contact administrator.');
      } else if (error.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
      } else {
        setError(error.response?.data?.message || 'Failed to delete service. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const shopId = typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop;
      const serviceData = {
        name: serviceForm.name,
        description: serviceForm.description,
        price: parseFloat(serviceForm.price),
        duration: parseInt(serviceForm.duration),
        category: serviceForm.category,
        // Remove shopId from data as it's in the URL
      };

      let response;
      if (editingService) {
        // FIXED: Use correct route structure
        response = await api.put(`/api/shops/${shopId}/services/${editingService._id}`, serviceData);

        // Handle response structure
        if (response.data.success) {
          setServices(prev => prev.map(s =>
            s._id === editingService._id ? { ...s, ...response.data.data } : s
          ));
        } else {
          setServices(prev => prev.map(s =>
            s._id === editingService._id ? { ...s, ...serviceData } : s
          ));
        }
        setSuccess('Service updated successfully!');
      } else {
        // ✅ Corrected route structure
        response = await api.post(`/api/shops/${shopId}/services`, serviceData);

        // Handle response structure
        if (response.data.success) {
          setServices(prev => [...prev, response.data.data]);
        } else {
          const newService = response.data || { _id: Date.now().toString(), ...serviceData };
          setServices(prev => [...prev, newService]);
        }
        setSuccess('Service added successfully!');
      }


      setShowServiceModal(false);
      // Optional: Reload services to ensure consistency
      setTimeout(() => loadServices(), 500);
    } catch (error) {
      console.error('Service save error:', error);

      if (error.response?.status === 400) {
        setError(error.response.data.message || 'Please check all required fields');
      } else if (error.response?.status === 401) {
        setError('You are not authorized to perform this action');
      } else if (error.response?.status === 403) {
        setError(error.response.data.message || 'Access denied. Please contact administrator');
      } else if (error.response?.status === 404) {
        setError('Shop not found. Please contact administrator');
      } else {
        setError('Failed to save service. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // const validateServiceForm = () => {
  //   const errors = [];

  //   if (!serviceForm.name.trim()) {
  //     errors.push('Service name is required');
  //   }

  //   if (!serviceForm.description.trim()) {
  //     errors.push('Service description is required');
  //   }

  //   if (!serviceForm.price || parseFloat(serviceForm.price) <= 0) {
  //     errors.push('Valid price is required');
  //   }

  //   if (!serviceForm.duration || parseInt(serviceForm.duration) <= 0) {
  //     errors.push('Valid duration is required');
  //   }

  //   return errors;
  // };

  const handleServiceFormChange = (field, value) => {
    setServiceForm(prev => ({ ...prev, [field]: value }));

    // Clear any existing errors when user starts typing
    if (error) {
      setError('');
    }
  };


  // Add bulk operations

  // const handleBulkDeleteServices = async (serviceIds) => {
  //   if (!window.confirm(`Are you sure you want to delete ${serviceIds.length} services?`)) {
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     const shopId = typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop;

  //     // FIXED: Use bulk delete endpoint from serviceController
  //     const response = await api.delete(`/api/shops/${shopId}/services/bulk`, {
  //       data: { serviceIds }
  //     });

  //     if (response.data.success) {
  //       // Remove from local state
  //       setServices(prev => prev.filter(s => !serviceIds.includes(s._id)));
  //       setSuccess(response.data.message || `${response.data.deletedCount} services deleted successfully!`);
  //     }
  //   } catch (error) {
  //     console.error('Bulk delete error:', error);
  //     setError(error.response?.data?.message || 'Failed to delete some services. Please try again.');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'basic':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'luxury':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'basic':
        return '🧼';
      case 'premium':
        return '✨';
      case 'luxury':
        return '👑';
      default:
        return '🐾';
    }
  };


  const loadStaff = async () => {
    try {
      const response = await api.get('/api/manager/staff');
      setStaff(response.data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
      setStaff([]);
    }
  };

  const loadPets = async () => {
    try {
      const response = await api.get('/api/manager/pets');
      setPets(response.data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
      setPets([]);
    }
  };

  const loadShopStats = async () => {
    try {
      const response = await api.get('/api/manager/stats');
      setShopStats(response.data);
    } catch (error) {
      console.error('Error loading shop stats:', error);
      // Calculate basic stats from available data
      const todayAppointments = appointments.filter(apt =>
        new Date(apt.appointmentDate).toDateString() === new Date().toDateString()
      ).length;

      const completedToday = appointments.filter(apt =>
        new Date(apt.appointmentDate).toDateString() === new Date().toDateString() &&
        apt.status === 'completed'
      ).length;

      const dailyRevenue = appointments
        .filter(apt =>
          new Date(apt.appointmentDate).toDateString() === new Date().toDateString() &&
          apt.status === 'completed'
        )
        .reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);

      setShopStats({
        todayAppointments,
        completedToday,
        dailyRevenue: `₹${dailyRevenue.toLocaleString()}`,
        customerSatisfaction: 4.5, // Mock data
        activeStaff: staff.length || 0,
        totalPets: pets.length || 0
      });
    }
  };

  // const loadServiceStats = async () => {
  //   try {
  //     const shopId = typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop;
  //     const response = await api.get(`/api/shops/${shopId}/services/stats`);

  //     if (response.data.success) {
  //       // Use the stats data as needed
  //       return response.data.data;
  //     }
  //   } catch (error) {
  //     console.error('Error loading service stats:', error);
  //     // Return default stats or handle error
  //     return null;
  //   }
  // };


  // const handleRefresh = async () => {
  //   setRefreshing(true);
  //   await loadDashboardData();
  //   setRefreshing(false);
  //   setSuccess('Data refreshed successfully!');
  // };


  const getPetEmoji = (type) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('dog')) return '🐕';
    if (lowerType.includes('cat')) return '🐱';
    if (lowerType.includes('bird')) return '🐦';
    if (lowerType.includes('rabbit')) return '🐰';
    return '🐾';
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    return appointments
      .filter(apt => new Date(apt.appointmentDate) >= today && apt.status !== 'completed')
      .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
      .slice(0, 5);
  };

  const handleAddPayment = (appointment) => {
    setSelectedAppointment(appointment);
    setPaymentForm({
      amount: appointment.servicePrice || '',
      paymentMethod: 'cash',
      transactionId: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const paymentData = {
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionId: paymentForm.transactionId
      };

      await api.post(`/api/manager/appointments/${selectedAppointment._id}/payment`, paymentData);

      setSuccess('Payment recorded successfully!');
      setShowPaymentModal(false);
      await loadAppointments();
      await loadPayments();
      await loadShopStats();
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({
      fullName: '',
      email: '',
      phone: '',
      password: ''
    });
    setShowStaffModal(true);
  };

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setStaffForm({
      fullName: staffMember.fullName,
      email: staffMember.email,
      phone: staffMember.phone,
      password: ''
    });
    setShowStaffModal(true);
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.delete(`/api/manager/staff/${staffId}`);

      if (response.data.success) {
        setStaff(prev => prev.filter(s => s._id !== staffId));
        setSuccess('Staff member deleted successfully!');
      }
    } catch (error) {
      console.error('Delete staff error:', error);
      setError(error.response?.data?.message || 'Failed to delete staff member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const staffData = {
        fullName: staffForm.fullName,
        email: staffForm.email,
        phone: staffForm.phone
      };

      if (staffForm.password) {
        staffData.password = staffForm.password;
      }

      let response;
      if (editingStaff) {
        response = await api.put(`/api/manager/staff/${editingStaff._id}`, staffData);
        setStaff(prev => prev.map(s =>
          s._id === editingStaff._id ? { ...s, ...response.data.data } : s
        ));
        setSuccess('Staff member updated successfully!');
      } else {
        response = await api.post('/api/manager/staff', staffData);
        setStaff(prev => [...prev, response.data.data]);
        setSuccess('Staff member added successfully!');
      }

      setShowStaffModal(false);
      setTimeout(() => loadStaff(), 500);
    } catch (error) {
      console.error('Staff save error:', error);
      setError(error.response?.data?.message || 'Failed to save staff member');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStaffTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Staff Management</h2>
            <p className="text-gray-600">Manage your shop's staff members and permissions</p>
          </div>
          <button
            onClick={handleAddStaff}
            className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow"
          >
            <UserPlus size={16} />
            <span>Add Staff Member</span>
          </button>
        </div>

        {/* Staff Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Staff</p>
                <p className="text-2xl font-bold text-blue-900">{staff.filter(s => s.role === 'user').length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Active Staff</p>
                <p className="text-2xl font-bold text-green-900">
                  {staff.filter(s => s.role === 'user' && s.isActive).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Data Entry Staff</p>
                <p className="text-2xl font-bold text-purple-900">
                  {staff.filter(s => s.role === 'user').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.filter(s => s.role === 'user').map((staffMember) => (
                <tr key={staffMember._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {staffMember.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{staffMember.fullName}</div>
                        <div className="text-[10px] text-gray-500">Data Entry Operator</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{staffMember.email}</div>
                    <div className="text-sm text-gray-500">{staffMember.phone}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(staffMember.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${staffMember.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {staffMember.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditStaff(staffMember)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg"
                        title="Edit Staff"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staffMember._id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg"
                        title="Delete Staff"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {staff.filter(s => s.role === 'user').length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Members</h3>
              <p className="text-gray-500 mb-4">Add your first staff member to get started</p>
              <button
                onClick={handleAddStaff}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-shadow"
              >
                <UserPlus size={18} />
                <span>Add Staff Member</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Add staff modal JSX (add this before the closing div of the component)

  const ShopSelector = () => {
    if (!shopInfo) return null;

    return (
      <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-orange-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
              🏪
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Currently Managing</h3>
              <p className="text-sm text-gray-600">{shopInfo.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Shop ID</p>
            <p className="font-mono text-sm text-gray-800">
              {typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{shopStats.todayAppointments}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">{shopStats.completedToday}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{shopStats.dailyRevenue}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pets</p>
              <p className="text-2xl font-bold text-gray-900">{shopStats.totalPets}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-orange-500" />
              Upcoming Appointments
            </h3>
            <button
              onClick={() => setActiveTab('bookings')}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {getUpcomingAppointments().length > 0 ? getUpcomingAppointments().map((appointment) => (
              <div key={appointment._id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-2xl">{getPetEmoji(appointment.petType)}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{appointment.petName}</p>
                  <p className="text-sm text-gray-600">{appointment.serviceType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatTime(appointment.appointmentDate)}</p>
                  <p className="text-xs text-gray-500">{appointment.ownerName}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Shop Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-orange-500" />
            Shop Information
          </h3>
          {shopInfo ? (
            <div className="space-y-6">
              {/* Shop Header */}
              <div className="text-center pb-4 border-b border-gray-200">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏪</span>
                </div>
                <h4 className="font-bold text-gray-900 text-xl">{shopInfo.name}</h4>
                <p className="text-gray-600 mt-1">Pet Grooming Shop</p>
              </div>

              {/* Shop Details */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600">{shopInfo.address}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      📞
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Phone</p>
                      <p className="font-medium text-blue-900">{shopInfo.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      ✉️
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Email</p>
                      <p className="font-medium text-green-900 text-sm">{shopInfo.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manager Assignment Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-800">Your Role</span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-200 text-orange-800">
                      Shop Manager
                    </span>
                  </div>
                  <p className="text-xs text-orange-700">
                    You are assigned as the manager of this shop. You can manage appointments, services, payments, and staff.
                  </p>
                </div>
              </div>

              {/* Shop Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-900">{services.length}</p>
                  <p className="text-xs text-purple-700">Services</p>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-lg font-bold text-indigo-900">{staff.length}</p>
                  <p className="text-xs text-indigo-700">Staff Members</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">No Shop Assigned</h4>
              <p className="text-sm text-gray-600 mb-4">
                You don't have a shop assigned to you yet. Please contact the administrator to assign you to a shop.
              </p>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Contact Admin:</strong> You need to be assigned to a shop to access manager features.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Scissors className="w-5 h-5 mr-2 text-orange-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('bookings')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-colors group"
          >
            <Calendar className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-blue-800">Appointments</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-colors group"
          >
            <CreditCard className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-green-800">Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-colors group"
          >
            <Scissors className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-purple-800">Services</span>
          </button>

          <button
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-colors group"
          >
            <BarChart3 className="w-8 h-8 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-orange-800">Reports</span>
          </button>
        </div>
      </div>
    </>
  );

  const renderBookingsTab = () => {
    // If server gave total, assume current page already filtered from server.
    // If not, slice locally as a graceful fallback.
    const effectiveTotal = aptTotal || appointments.length;
    const startIdx = (aptPage - 1) * aptLimit;
    const endIdx = Math.min(startIdx + aptLimit, effectiveTotal);
    const pageCount = Math.max(1, Math.ceil(effectiveTotal / aptLimit));
    const isServerPaged = aptTotal > 0;

    const filteredAppointments = appointments.filter((apt) => {
      const term = searchTerm.toLowerCase();
      return (
        apt.petName?.toLowerCase().includes(term) ||
        apt.customerName?.toLowerCase().includes(term) ||
        apt.serviceType?.toLowerCase().includes(term)
      );
    });

    const pagedAppointments = isServerPaged
      ? filteredAppointments
      : filteredAppointments.slice(startIdx, endIdx);


    return (
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Manage Appointments</h2>

          {/* 🔍 Search Bar */}
          <input
            type="text"
            placeholder="Search by pet, customer, or service..."
            value={searchTerm}
            onChange={(e) => { setAptPage(1); setSearchTerm(e.target.value); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-64"
          />


          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              value={aptLimit}
              onChange={(e) => { setAptPage(1); setAptLimit(Number(e.target.value)); }}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              {[5, 10, 20, 50].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">watch record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedAppointments.map((appointment) => (
                <tr key={appointment._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{getPetEmoji(appointment.petType)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{appointment.petName}</div>
                        <div className="text-sm text-gray-500">{appointment.petType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{appointment.serviceType}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div>{formatDate(appointment.appointmentDate)}</div>
                    <div className="text-gray-500">{formatTime(appointment.appointmentDate)}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{appointment.customerName}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                    {formatCurrency(appointment.servicePrice)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${appointment.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : appointment.status === 'confirmed'
                        ? 'bg-blue-100 text-blue-800'
                        : appointment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {appointment.status === 'completed' ? (
                        <span className="text-green-600 ">Paid</span>
                      ) : (
                        <button
                          onClick={() => handleAddPayment(appointment)}
                          className="text-orange-600 hover:text-orange-800"
                          title="Record Payment"
                        >
                          <CreditCard size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pagedAppointments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">
            {effectiveTotal > 0
              ? `Showing ${effectiveTotal ? startIdx + 1 : 0}–${effectiveTotal ? endIdx : 0} of ${effectiveTotal}`
              : 'Showing 0 of 0'}
          </div>

          <div className="inline-flex items-center gap-1">
            <button
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              onClick={() => setAptPage(1)}
              disabled={aptPage <= 1}
              title="First"
            >
              «
            </button>
            <button
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              onClick={() => setAptPage(p => Math.max(1, p - 1))}
              disabled={aptPage <= 1}
              title="Previous"
            >
              ‹
            </button>
            <span className="px-2 text-sm text-gray-700">
              Page {aptPage} of {pageCount}
            </span>
            <button
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              onClick={() => setAptPage(p => Math.min(pageCount, p + 1))}
              disabled={aptPage >= pageCount}
              title="Next"
            >
              ›
            </button>
            <button
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              onClick={() => setAptPage(pageCount)}
              disabled={aptPage >= pageCount}
              title="Last"
            >
              »
            </button>
          </div>
        </div>
      </div>
    );
  };


  const renderPaymentsTab = () => {
    // Calculate pagination values
    const effectiveTotal = paymentTotal || payments.length;
    const startIdx = (paymentPage - 1) * paymentLimit;
    const endIdx = Math.min(startIdx + paymentLimit, effectiveTotal);
    const pageCount = Math.max(1, Math.ceil(effectiveTotal / paymentLimit));
    const isServerPaged = paymentTotal > 0;

    // Filter payments by search term
    const filteredPayments = payments.filter((payment) => {
      if (!paymentSearchTerm) return true;
      const term = paymentSearchTerm.toLowerCase();
      return (
        payment.ownerName?.toLowerCase?.().includes(term) ||
        payment.petName?.toLowerCase?.().includes(term) ||
        payment.ownerPhone?.toString?.().toLowerCase?.().includes(term) ||
        payment.serviceType?.toLowerCase?.().includes(term) ||
        payment.transactionId?.toLowerCase?.().includes(term)
      );
    });

    const pagedPayments = isServerPaged
      ? filteredPayments
      : filteredPayments.slice(startIdx, endIdx);

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Records</h2>
            <p className="text-gray-600">View and manage all payment transactions</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search payments..."
              value={paymentSearchTerm}
              onChange={(e) => {
                setPaymentPage(1);
                setPaymentSearchTerm(e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64"
            />

            {/* Page size selector */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-sm text-gray-600">Rows:</span>
              <select
                value={paymentLimit}
                onChange={(e) => {
                  setPaymentPage(1);
                  setPaymentLimit(Number(e.target.value));
                }}
                className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <button className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedPayments.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{payment.ownerName}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{payment.ownerPhone}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">{payment.petName}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-mono">
                    {String(payment.petId || 'N/A')}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{payment.serviceType}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 capitalize">{payment.paymentMethod}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-mono">
                    {payment.transactionId || 'N/A [Cash]'}
                  </td>
                </tr>
              ))}
              {pagedPayments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    {paymentSearchTerm ? 'No payments found matching your search.' : 'No payment records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {effectiveTotal > 0
              ? `Showing ${effectiveTotal ? startIdx + 1 : 0}–${effectiveTotal ? endIdx : 0} of ${effectiveTotal} payments`
              : 'Showing 0 of 0 payments'}
          </div>

          <div className="inline-flex items-center gap-1">
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaymentPage(1)}
              disabled={paymentPage <= 1}
              title="First"
            >
              «
            </button>
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaymentPage(p => Math.max(1, p - 1))}
              disabled={paymentPage <= 1}
              title="Previous"
            >
              ‹
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50 rounded-lg">
              Page {paymentPage} of {pageCount}
            </span>
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaymentPage(p => Math.min(pageCount, p + 1))}
              disabled={paymentPage >= pageCount}
              title="Next"
            >
              ›
            </button>
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaymentPage(pageCount)}
              disabled={paymentPage >= pageCount}
              title="Last"
            >
              »
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderServicesTab = () => {
    // Group services by category
    const groupedServices = {
      basic: services.filter(s => s.category === 'basic'),
      premium: services.filter(s => s.category === 'premium'),
      luxury: services.filter(s => s.category === 'luxury')
    };

    const renderServiceCard = (service) => (
      <div key={service._id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-200 group">
        <div className="flex justify-between gap-3 items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getCategoryIcon(service.category)}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                {service.name}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(service.category)}`}>
                {service.category}
              </span>
            </div>
          </div>
          <div className="text-xl font-bold text-orange-600">{formatCurrency(service.price)}</div>
        </div>

        <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-3">{service.description}</p>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            <span>{service.duration} mins</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditService(service)}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Service"
              disabled={isLoading}
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleDeleteService(service._id)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Service"
              disabled={isLoading}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );

    const renderEmptyState = (category, description, icon) => (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">{icon}</div>
        <h4 className="font-medium text-gray-900 mb-2">No {category} Services</h4>
        <p className="text-gray-500 text-sm mb-4">{description}</p>
        <button
          onClick={handleAddService}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow text-sm"
        >
          <Plus size={16} />
          <span>Add {category} Service</span>
        </button>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Services Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Grooming Services</h2>
              <p className="text-gray-600">Manage your shop's grooming services and pricing</p>
            </div>
            <button
              onClick={handleAddService}
              className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow"
            >
              <Plus size={16} />
              <span>Add Service</span>
            </button>
          </div>

          {/* Services Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Services</p>
                  <p className="text-2xl font-bold text-blue-900">{services.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Avg. Price</p>
                  <p className="text-2xl font-bold text-green-900">
                    ₹{services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length) : 0}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Premium Services</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {services.filter(s => s.category === 'premium' || s.category === 'luxury').length}
                  </p>
                </div>
                <Star className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Avg. Duration</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length) : 0}m
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Basic Services */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🧼</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Basic Services</h3>
                <p className="text-sm text-gray-600">Essential grooming services for everyday care</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {groupedServices.basic.length} services
              </span>
            </div>
          </div>

          {groupedServices.basic.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedServices.basic.map(renderServiceCard)}
            </div>
          ) : (
            renderEmptyState('Basic', 'Add essential grooming services like basic wash, nail trimming, etc.', '🧼')
          )}
        </div>

        {/* Premium Services */}
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Premium Services</h3>
                <p className="text-sm text-gray-600">Enhanced grooming with additional care and styling</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                {groupedServices.premium.length} services
              </span>
            </div>
          </div>

          {groupedServices.premium.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedServices.premium.map(renderServiceCard)}
            </div>
          ) : (
            renderEmptyState('Premium', 'Add enhanced services with styling, conditioning, and special treatments.', '✨')
          )}
        </div>

        {/* Luxury Services */}
        <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">👑</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Luxury Services</h3>
                <p className="text-sm text-gray-600">Premium spa treatments and VIP grooming experiences</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {groupedServices.luxury.length} services
              </span>
            </div>
          </div>

          {groupedServices.luxury.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedServices.luxury.map(renderServiceCard)}
            </div>
          ) : (
            renderEmptyState('Luxury', 'Add VIP services like full spa treatments, aromatherapy, and deluxe packages.', '👑')
          )}
        </div>

        {/* All Services Empty State (only show if no services at all) */}
        {services.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-12">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
                <Scissors className="w-12 h-12 text-orange-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">No Services Found</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Get started by adding your first grooming service. You can organize them into Basic, Premium, and Luxury categories.
              </p>
              <button
                onClick={handleAddService}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-shadow"
              >
                <Plus size={18} />
                <span>Add Your First Service</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} stats={shopStats} />

      <div className="flex-1 flex flex-col ml-64">
        <header className="bg-white shadow-sm border-b border-orange-100">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                    {activeTab === 'overview' ? 'Shop Manager Dashboard' :
                      activeTab === 'bookings' ? 'Appointment Management' :
                        activeTab === 'reports' ? 'Payment Records' :
                          activeTab === 'users' ? 'User Management' :
                            activeTab === 'services' ? 'Grooming Services' :
                              activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h1>
                  <div className="flex items-center space-x-4">
                    <p className="text-gray-600">
                      Welcome back, <span className="font-medium">{user?.fullName || 'Manager'}</span>
                    </p>
                    {shopInfo && (
                      <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full">
                        <MapPin className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">
                          Managing: {shopInfo.name}
                        </span>
                      </div>
                    )}

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
              {/* ... rest of header buttons remain same ... */}
            </div>

            {/* Add shop status bar */}
            {shopInfo && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Shop Status: Active</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      📍 {shopInfo.address}
                    </div>
                    <div className="text-sm text-gray-600">
                      📞 {shopInfo.phone}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Shop ID: {typeof user?.assignedShop === 'object' ? user.assignedShop._id : user.assignedShop}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="w-full px-6 py-8 flex-1">
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

          {/* Tab Content */}
          <main className="w-full">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'bookings' && renderBookingsTab()}
            {activeTab === 'payments' && renderPaymentsTab()}
            {activeTab === 'services' && renderServicesTab()}
            {activeTab === 'users' && renderStaffTab()}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h3>
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Settings Panel</h4>
                  <p className="text-gray-600">
                    Manage your account preferences and settings here.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* Pet-themed footer */}
          <div className="mt-8 text-center">
            <div className="flex justify-center items-center space-x-4 text-3xl mb-2">
              <span className="animate-pulse">✂️</span>
              <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>🐕</span>
              <span className="animate-pulse" style={{ animationDelay: '1s' }}>💼</span>
              <span className="animate-pulse" style={{ animationDelay: '1.5s' }}>🐱</span>
              <span className="animate-pulse" style={{ animationDelay: '2s' }}>✨</span>
            </div>
            <p className="text-sm text-gray-500">Leading your grooming team to success! 🐾</p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedAppointment.petName}</h4>
                  <p className="text-sm text-gray-600">{selectedAppointment.serviceType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedAppointment.appointmentDate)}
                  </p>
                  <p className="font-medium text-orange-600">
                    {formatCurrency(selectedAppointment.servicePrice)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Customer: {selectedAppointment.customerName}
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Enter amount"
                  required
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="mb-4 flex-col gap-5">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex-col">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-25 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                </select>
                <select
                  value={paymentForm.paymentType}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                  className="w-35 ml-1 px-3 py-2 border rounded-lg"
                >
                  <option value="full">Full Payment</option>
                  <option value="advance">Advance Payment</option>
                </select>
              </div>

              {paymentForm.paymentMethod !== 'cash' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter transaction ID"
                    required={paymentForm.paymentMethod !== 'cash'}
                  />
                </div>
              )}
              {paymentForm.paymentType === 'advance' && (
                <input
                  type="number"
                  value={paymentForm.advancePercentage}
                  onChange={(e) => setPaymentForm({ ...paymentForm, advancePercentage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg mt-2"
                  placeholder="Enter advance percentage (e.g., 50)"
                  min="1"
                  max="100"
                />
              )}


              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                >
                  {/* {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )} */}
                  {isLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40">
                      <div className="bg-white rounded-2xl p-6 flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                        <span className="text-gray-700">Processing...</span>
                      </div>
                    </div>
                  )}
                  <span>Record Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {
        showStaffModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={staffForm.fullName}
                    onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="number"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingStaff ? '(Leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter password"
                    required={!editingStaff}
                    minLength="6"
                  />
                </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>{editingStaff ? 'Update' : 'Add'} Staff</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                onClick={() => setShowServiceModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) => handleServiceFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="e.g., Full Grooming Package"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => handleServiceFormChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                  placeholder="Describe what's included in this service..."
                  required
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {serviceForm.description.length}/500 characters
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    value={serviceForm.price}
                    onChange={(e) => handleServiceFormChange('price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="0"
                    required
                    min="0"
                    max="100000"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins) *</label>
                  <input
                    type="number"
                    value={serviceForm.duration}
                    onChange={(e) => handleServiceFormChange('duration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="60"
                    required
                    min="1"
                    max="480"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={serviceForm.category}
                  onChange={(e) => handleServiceFormChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                >
                  <option value="basic">🧼 Basic - Standard grooming services</option>
                  <option value="premium">✨ Premium - Enhanced grooming with extras</option>
                  <option value="luxury">👑 Luxury - Full spa treatment experience</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span>{editingService ? 'Update' : 'Add'} Service</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;