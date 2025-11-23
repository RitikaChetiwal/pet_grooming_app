import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import Sidebar from '../components/Sidebar';
import {
  PawPrint,
  Package,
  ClipboardList,
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  Calendar,
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Save,
  LogOut,
  Users,
  Home,
  RefreshCw,
  Settings
} from 'lucide-react';

const UserDashboard = () => {
  const user = useSelector((state) => state.auth.user);

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showPetModal, setShowPetModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);

  // Data states
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [shopDetails, setShopDetails] = useState(null);

  const [displayPets, setDisplayPets] = useState([]);  // what we actually render

  // NEW pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [serverSearchLoading, setServerSearchLoading] = useState(false);

  // Pet form state
  const [petForm, setPetForm] = useState({
    name: '',
    type: '',
    breed: '',
    age: '',
    weight: '',
    medicalConditions: '',
    specialInstructions: '',
    preferredServices: [],
    selectedPackage: '',
    vaccinationStatus: 'up-to-date',
    lastGroomed: '',
    appointmentDate: '',
    behaviorNotes: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // Stats for sidebar
  const [stats, setStats] = useState({
    totalPets: 0,
  });

  // Payment form states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'cash',
    paymentType: 'full',
    transactionId: '',
    advancePercentage: 0,  // Matches backend schema
    notes: ''              // Matches backend schema
  });
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentLimit, setAppointmentLimit] = useState(10);
  const [appointmentTotal, setAppointmentTotal] = useState(0);
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState("");

  // const mockServices = [
  //   { id: 'basic-wash', name: 'Basic Wash & Dry', price: 500, duration: 30 },
  //   { id: 'full-groom', name: 'Full Grooming', price: 1200, duration: 90 },
  //   { id: 'nail-trim', name: 'Nail Trimming', price: 200, duration: 15 },
  //   { id: 'ear-clean', name: 'Ear Cleaning', price: 150, duration: 10 },
  //   { id: 'teeth-clean', name: 'Teeth Cleaning', price: 300, duration: 20 },
  //   { id: 'flea-treatment', name: 'Flea Treatment', price: 400, duration: 25 },
  //   { id: 'de-shedding', name: 'De-shedding Treatment', price: 600, duration: 45 }
  // ];


  // const mockPackages = [
  //   {
  //     id: 'basic-package',
  //     name: 'Basic Care Package',
  //     description: 'Essential grooming services for your pet',
  //     services: ['basic-wash', 'nail-trim'],
  //     price: 650,
  //     originalPrice: 700,
  //     duration: 45
  //   },
  //   {
  //     id: 'premium-package',
  //     name: 'Premium Spa Package',
  //     description: 'Complete pampering experience for your furry friend',
  //     services: ['full-groom', 'nail-trim', 'ear-clean', 'teeth-clean'],
  //     price: 1600,
  //     originalPrice: 1850,
  //     duration: 120
  //   },
  //   {
  //     id: 'maintenance-package',
  //     name: 'Monthly Maintenance',
  //     description: 'Regular upkeep to keep your pet looking great',
  //     services: ['basic-wash', 'nail-trim', 'ear-clean'],
  //     price: 800,
  //     originalPrice: 850,
  //     duration: 55
  //   },
  //   {
  //     id: 'medical-package',
  //     name: 'Health & Hygiene Package',
  //     description: 'Focus on health-related grooming needs',
  //     services: ['teeth-clean', 'ear-clean', 'flea-treatment'],
  //     price: 800,
  //     originalPrice: 850,
  //     duration: 55
  //   }
  // ];


  // Load data on component mount

  useEffect(() => {
    // console.log('🔍 UserDashboard useEffect - User loaded:', user);
    debugUserShop();
    fetchPets();
    fetchServices();
  }, [page, limit, searchTerm]);

  // Adjust stats to use meta.total if available
  useEffect(() => {
    setStats({ totalPets: meta?.total ?? pets.length });
  }, [pets, meta]);

  // When search changes, reset to page 1
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Update stats when data changes
  useEffect(() => {
    setStats({
      totalPets: pets.length,
    });
  }, [pets]);

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
    const fetchShopDetails = async () => {
      if (user?.assignedShop) {
        try {
          // If assignedShop is just an ID string
          const shopId = typeof user.assignedShop === 'string' ? user.assignedShop : user.assignedShop._id || user.assignedShop.id;

          if (shopId) {
            const response = await api.get(`/api/shops/${shopId}`);
            setShopDetails(response.data.data || response.data);
          }
        } catch (error) {
          console.error('Failed to fetch shop details:', error);
        }
      }
    };

    fetchShopDetails();
  }, [user?.assignedShop]);


  // keep displayPets in sync when pets change and no active search
  useEffect(() => {
    if (!searchTerm.trim()) setDisplayPets(pets);
  }, [pets]); // eslint-disable-line

  useEffect(() => {
    if (user && activeTab === 'appointments') {
      loadUserAppointments(appointmentPage, appointmentLimit);
    }
  }, [appointmentPage, appointmentLimit, user, appointmentSearchTerm, activeTab]);

  // Fetch pets (server pagination + search)
  const fetchPets = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/pets', {
        params: {
          page,
          limit,
          q: searchTerm?.trim() || undefined, // backend supports q or search
        },
      });

      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      const newMeta = response.data?.meta || {
        total: rows.length,
        page: 1,
        limit: rows.length,
        totalPages: 1,
      };

      setPets(rows);          // current page rows (keep if you use elsewhere)
      setDisplayPets(rows);   // render these
      setMeta(newMeta);
    } catch (error) {
      setError('Failed to fetch pets: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };


  const fetchServices = async () => {
    try {
      setIsLoading(true);

      // Get the user's assigned shop ID
      const shopId = typeof user?.assignedShop === 'object'
        ? user.assignedShop._id || user.assignedShop.id
        : user.assignedShop;

      if (!shopId) {
        console.error('No shop ID found for user');
        setError('No shop assigned. Please contact administrator.');
        setServices([]);
        return;
      }

      // Use the correct endpoint that matches the route structure
      const response = await api.get(`/api/shops/${shopId}/services`);

      if (response.data.success) {
        setServices(response.data.data || []);
        // console.log('✅ Services loaded successfully:', response.data.data);
      } else {
        setServices(response.data || []);
      }

    } catch (error) {
      console.error('❌ Error fetching services:', error);

      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You are not authorized to view services for this shop.');
      } else if (error.response?.status === 404) {
        setError('Shop not found or no services available.');
      } else {
        setError('Failed to load services. Please try again later.');
      }

      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debugUserShop = () => {
    console.log('🔍 User Debug Info:', {
      user: user,
      assignedShop: user?.assignedShop,
      assignedShopType: typeof user?.assignedShop,
      assignedShopId: typeof user?.assignedShop === 'object'
        ? user?.assignedShop?._id || user?.assignedShop?.id
        : user?.assignedShop
    });
  };

  // refresh function (tab-aware)
  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      // Refresh selectively based on the active tab
      switch (activeTab) {
        case 'overview':
          await Promise.all([
            fetchPets(),
            fetchServices(),
            loadUserAppointments() // Add this
          ]);
          break;
        case 'pets':
          await fetchPets();
          break;
        case 'services':
          await fetchServices();
          break;
        case 'appointments': // Add this case
          await loadUserAppointments();
          break;
        default:
          // Fallback: refresh the common basics
          await Promise.all([fetchPets(), fetchServices(), loadUserAppointments()]);
      }
      setSuccess('Data refreshed successfully!');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };


  // In your UserDashboard.jsx, update the handleAddPet function:
  const handleAddPet = async (e) => {
    e.preventDefault();

    // --- normalize & validate form values on client ---
    const normalizeType = (raw) => {
      if (!raw) return '';
      const t = raw.trim().toLowerCase();
      const map = { dog: 'Dog', cat: 'Cat', bird: 'Bird', fish: 'Fish', rabbit: 'Rabbit', other: 'Other' };
      return map[t] || ''; // empty => will fail required check
    };

    const safeInt = (v, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
      if (v === '' || v === null || v === undefined) return undefined;
      const n = parseInt(v, 10);
      if (Number.isNaN(n)) return undefined;
      if (n < min || n > max) return undefined;
      return n;
    };

    const safeFloat = (v, min = 0) => {
      if (v === '' || v === null || v === undefined) return undefined;
      const n = parseFloat(v);
      if (Number.isNaN(n)) return undefined;
      if (n < min) return undefined;
      return n;
    };

    // If user picked only a date (no time), push it to noon local time to avoid “past” due to timezone.
    const toNoonISO = (dateLike) => {
      if (!dateLike) return undefined;
      const d = new Date(dateLike);
      if (Number.isNaN(d.getTime())) return undefined;
      d.setHours(12, 0, 0, 0); // 12:00 local
      return d.toISOString();
    };

    // Guard rails for required fields
    const normalizedType = normalizeType(petForm.type);
    if (!petForm.name?.trim() || !normalizedType) {
      setError('Pet name and a valid type (Dog/Cat/Bird/Fish/Rabbit/Other) are required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      // Build payload
      const petData = {
        name: petForm.name.trim(),
        type: normalizedType,
        breed: petForm.breed?.trim() || undefined,
        age: safeInt(petForm.age, 0, 50),
        weight: safeFloat(petForm.weight, 0),
        medicalConditions: petForm.medicalConditions?.trim() || undefined,
        specialInstructions: petForm.specialInstructions?.trim() || undefined,
        preferredServices: Array.isArray(petForm.preferredServices) ? petForm.preferredServices.filter(Boolean) : [],
        selectedPackage: petForm.selectedPackage || undefined,
        vaccinationStatus: petForm.vaccinationStatus || 'up-to-date',
        lastGroomed: petForm.lastGroomed ? new Date(petForm.lastGroomed).toISOString() : undefined,
        appointmentDate: petForm.appointmentDate ? toNoonISO(petForm.appointmentDate) : undefined,
        behaviorNotes: petForm.behaviorNotes?.trim() || undefined,
        emergencyContact: petForm.emergencyContact?.trim() || undefined,
        emergencyPhone: petForm.emergencyPhone?.trim() || undefined
      };

      // Strip undefined/empty values
      Object.keys(petData).forEach((k) => {
        if (petData[k] === undefined || petData[k] === '') delete petData[k];
      });

      console.log('Sending pet data:', petData);

      // Create pet
      const petResponse = await api.post('/api/pets', petData);
      setPets([...pets, petResponse.data.pet]);

      // Payment modal if appointment present
      if (petForm.appointmentDate && Array.isArray(petForm.preferredServices) && petForm.preferredServices.length > 0) {
        const totalAmountBreakdown = getTotalAmountWithGST();
        setPaymentForm({
          amount: totalAmountBreakdown.totalAmount,
          paymentMethod: 'cash',
          paymentType: 'full',
          transactionId: '',
          advancePercentage: 0,
          notes: '',
          petName: petForm.name,
          appointmentDate: petForm.appointmentDate
        });
        setCreatedAppointment({
          petName: petForm.name,
          petType: normalizedType,
          appointmentDate: petForm.appointmentDate,
          services: petForm.preferredServices,
          baseAmount: totalAmountBreakdown.baseAmount,
          gstAmount: totalAmountBreakdown.gstAmount,
          totalWithGst: totalAmountBreakdown.totalAmount
        });
        setShowPaymentModal(true);
        setSuccess('Pet added and appointment created! Please complete payment.');
      } else {
        setSuccess('Pet added successfully!');
      }

      resetPetForm();
      setShowPetModal(false);
    } catch (error) {
      console.error('Error adding pet:', error?.response?.data || error);
      // Server returns: { success:false, message:'Validation failed', errors:[{path/message/...}, ...] }
      let errorMessage = 'Failed to add pet: ';

      const data = error.response?.data;
      if (data?.message) {
        errorMessage += data.message;
      }

      // Prefer structured validation errors if present
      if (Array.isArray(data?.errors) && data.errors.length) {
        const msgs = data.errors.map(e => (e?.msg || e?.message || 'Invalid input')).join(', ');
        errorMessage += ` – ${msgs}`;
      } else if (data?.details) {
        const detailMessages = Object.values(data.details).filter(Boolean).join(', ');
        if (detailMessages) errorMessage += ` – ${detailMessages}`;
      } else if (!data?.message) {
        errorMessage += (error.message || 'Unknown error');
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  // Updated handlers for UserDashboard.jsx

  const handleUpdatePet = async (e) => {
    e.preventDefault();

    if (!editingPet) return;

    try {
      setIsLoading(true);

      // Clean and format the data
      const updateData = {
        name: petForm.name.trim(),
        type: petForm.type.trim(),
        breed: petForm.breed?.trim() || undefined,
        age: petForm.age ? parseInt(petForm.age) : undefined,
        weight: petForm.weight ? parseFloat(petForm.weight) : undefined,
        medicalConditions: petForm.medicalConditions?.trim() || undefined,
        specialInstructions: petForm.specialInstructions?.trim() || undefined,
        preferredServices: petForm.preferredServices || [],
        selectedPackage: petForm.selectedPackage || undefined,
        vaccinationStatus: petForm.vaccinationStatus || 'up-to-date',
        lastGroomed: petForm.lastGroomed ? new Date(petForm.lastGroomed).toISOString() : undefined,
        appointmentDate: petForm.appointmentDate ? new Date(petForm.appointmentDate).toISOString() : undefined,
        behaviorNotes: petForm.behaviorNotes?.trim() || undefined,
        emergencyContact: petForm.emergencyContact?.trim() || undefined,
        emergencyPhone: petForm.emergencyPhone?.trim() || undefined
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });

      console.log('Updating pet with data:', updateData);

      const response = await api.put(`/api/pets/${editingPet._id}`, updateData);

      // Handle the new response format
      const updatedPet = response.data.data || response.data;

      setPets(pets.map(p => p._id === editingPet._id ? updatedPet : p));
      setSuccess('Pet updated successfully!');
      resetPetForm();
      setShowPetModal(false);
      setEditingPet(null);

    } catch (error) {
      console.error('Error updating pet:', error);
      console.error('Error response:', error.response?.data);

      if (error.response?.data?.message) {
        setError('Failed to update pet: ' + error.response.data.message);
      } else if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.join(', ');
        setError('Failed to update pet: ' + errorMessages);
      } else {
        setError('Failed to update pet: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePet = async (petId) => {
    if (!window.confirm('Are you sure you want to delete this pet record?')) {
      return;
    }

    try {
      setIsLoading(true);

      console.log('Deleting pet with ID:', petId);

      await api.delete(`/api/pets/${petId}`);

      setPets(pets.filter(p => p._id !== petId));
      setSuccess('Pet deleted successfully!');

    } catch (error) {
      console.error('Error deleting pet:', error);
      console.error('Error response:', error.response?.data);

      if (error.response?.data?.message) {
        setError('Failed to delete pet: ' + error.response.data.message);
      } else {
        setError('Failed to delete pet: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetPetForm = () => {
    setPetForm({
      name: '',
      type: '',
      breed: '',
      age: '',
      weight: '',
      medicalConditions: '',
      specialInstructions: '',
      preferredServices: [],
      selectedPackage: '',
      vaccinationStatus: 'up-to-date',
      lastGroomed: '',
      appointmentDate: '',
      behaviorNotes: '',
      emergencyContact: '',
      emergencyPhone: ''
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault?.();

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!createdAppointment) {
        setError('No appointment context found for payment.');
        setIsLoading(false);
        return;
      }

      // 1) Backend expects the shop id
      const shopId =
        typeof user?.assignedShop === 'object'
          ? (user.assignedShop?._id || user.assignedShop?.id)
          : user?.assignedShop;

      if (!shopId) {
        setError('No shop assigned. Please contact administrator.');
        setIsLoading(false);
        return;
      }

      // 2) Pick a service id to associate (optional but useful)
      //    Prefer a selected package, otherwise first selected service (if any)
      let serviceId = createdAppointment.services?.length ? createdAppointment.services[0] : undefined;
      if (petForm?.selectedPackage) serviceId = petForm.selectedPackage;

      // 3) VERY IMPORTANT: controller treats "amount" as TOTAL (incl. GST)
      //    If it's an advance, send advancePercentage and the controller
      //    will compute the paid portion.
      const payload = {
        amount: Number(createdAppointment.totalWithGst), // total incl. GST
        paymentMethod: paymentForm.paymentMethod,
        transactionId: paymentForm.paymentMethod !== 'cash' ? (paymentForm.transactionId || '') : '',
        petName: createdAppointment.petName,
        paymentType: paymentForm.paymentType || 'full',
        advancePercentage:
          (paymentForm.paymentType === 'advance'
            ? (Number(paymentForm.advancePercentage) || 30)
            : 0),
        notes: paymentForm.notes || '',

        // required by backend
        shopId,
        serviceId, // optional, okay if undefined
        // managerId is optional; backend will infer from shopId
      };

      // Simple client-side validation
      if (payload.paymentMethod !== 'cash' && !payload.transactionId) {
        setError('Please enter a transaction ID for non-cash payments.');
        setIsLoading(false);
        return;
      }

      const resp = await api.post('/api/payments', payload);

      setSuccess(resp?.data?.message || 'Payment recorded successfully.');
      setShowPaymentModal(false);

      // (Optional) you can reset paymentForm here if you want
      // setPaymentForm({ amount: 0, paymentMethod: 'cash', paymentType: 'full', transactionId: '', advancePercentage: 0, notes: '' });
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (pet) => {
    setEditingPet(pet);
    setPetForm({
      ...pet,
      lastGroomed: pet.lastGroomed ? new Date(pet.lastGroomed).toISOString().split('T')[0] : '',
      // ADD THIS NEW FIELD
      appointmentDate: pet.appointmentDate ? new Date(pet.appointmentDate).toISOString().split('T')[0] : ''
    });
    setShowPetModal(true);
  };

  const calculateGSTBreakdown = (baseAmount) => {
    const gstRate = 0.18; // 18%
    const gstAmount = baseAmount * gstRate;
    const totalAmount = baseAmount + gstAmount;

    return {
      baseAmount: parseFloat(baseAmount.toFixed(2)),
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2))
    };
  };

  const getSelectedServicesTotalWithGST = () => {
    const baseTotal = petForm.preferredServices.reduce((total, serviceId) => {
      const service = services.find(s => (s._id || s.id) === serviceId);
      return total + (service ? service.price : 0);
    }, 0);

    return calculateGSTBreakdown(baseTotal);
  };

  const getSelectedPackageTotalWithGST = () => {
    if (!petForm.selectedPackage) return { baseAmount: 0, gstAmount: 0, totalAmount: 0 };

    const selectedPkg = services.find(p => (p._id || p.id) === petForm.selectedPackage);
    const baseAmount = selectedPkg ? selectedPkg.price : 0;

    return calculateGSTBreakdown(baseAmount);
  };

  const getTotalAmountWithGST = () => {
    const servicesTotal = getSelectedServicesTotalWithGST();
    const packageTotal = getSelectedPackageTotalWithGST();

    const totalBaseAmount = servicesTotal.baseAmount + packageTotal.baseAmount;
    return calculateGSTBreakdown(totalBaseAmount);
  };

  const handleServiceToggle = (serviceId) => {
    setPetForm(prev => ({
      ...prev,
      preferredServices: prev.preferredServices.includes(serviceId)
        ? prev.preferredServices.filter(id => id !== serviceId)
        : [...prev.preferredServices, serviceId]
    }));
  };

  const handlePackageSelect = (packageId) => {
    setPetForm(prev => ({
      ...prev,
      selectedPackage: prev.selectedPackage === packageId ? '' : packageId
    }));
  };

  const getSelectedServicesTotal = () => {
    return petForm.preferredServices.reduce((total, serviceId) => {
      const service = services.find(s => (s._id || s.id) === serviceId);
      return total + (service ? service.price : 0);
    }, 0);
  };

  const getSelectedPackageTotal = () => {
    if (!petForm.selectedPackage) return 0;
    const selectedPkg = services.find(p => (p._id || p.id) === petForm.selectedPackage);
    return selectedPkg ? selectedPkg.price : 0;
  };

  const getPetEmoji = (type) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('dog')) return '🐕';
    if (lowerType.includes('cat')) return '🐱';
    if (lowerType.includes('bird')) return '🐦';
    if (lowerType.includes('rabbit')) return '🐰';
    return '🐾';
  };

  // In UserDashboard.jsx, change the loadUserAppointments function:
  const loadUserAppointments = async (pg = appointmentPage, lim = appointmentLimit) => {
    try {
      setIsLoading(true);
      // Use the existing pets endpoint and extract appointment info
      const response = await api.get('/api/pets', {
        params: {
          page: pg,
          limit: lim,
          includeAppointments: true // if your backend supports this
        }
      });

      // Extract appointments from pets data
      const petsWithAppointments = response.data.data || response.data || [];
      const appointmentsFromPets = petsWithAppointments
        .filter(pet => pet.appointmentDate)
        .map(pet => ({
          _id: pet._id,
          petName: pet.name,
          petType: pet.type,
          appointmentDate: pet.appointmentDate,
          serviceType: pet.preferredServices?.join(', ') || 'Multiple Services',
          status: 'pending', // or determine based on your logic
          servicePrice: pet.totalAmount || 0,
          shopName: shopInfo?.name || 'Your Shop'
        }));

      setAppointments(appointmentsFromPets);
      setAppointmentTotal(response.data.meta?.total || appointmentsFromPets.length);
    } catch (error) {
      console.error('Error loading user appointments:', error);
      setAppointments([]);
      setAppointmentTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const Pagination = () => (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-sm text-gray-600">
        Showing <strong>{displayPets.length}</strong> of <strong>{meta.total}</strong> pets
        {searchTerm ? <> (filtered)</> : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(1)}
          disabled={page === 1}
          className="px-3 py-1 border rounded-lg disabled:opacity-50"
        >
          «
        </button>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded-lg disabled:opacity-50"
        >
          ‹
        </button>
        <span className="px-2 text-sm text-gray-700">
          Page <strong>{page}</strong> / {meta.totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
          disabled={page >= meta.totalPages}
          className="px-3 py-1 border rounded-lg disabled:opacity-50"
        >
          ›
        </button>
        <button
          onClick={() => setPage(meta.totalPages)}
          disabled={page >= meta.totalPages}
          className="px-3 py-1 border rounded-lg disabled:opacity-50"
        >
          »
        </button>

        <select
          value={limit}
          onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}
          className="ml-2 px-2 py-1 border rounded-lg"
        >
          {[5, 8, 12, 20, 50, 100].map(n => (
            <option key={n} value={n}>{n}/page</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">My Pets</p>
              <p className="text-2xl font-bold text-gray-900">{meta?.total ?? pets.length}</p>

            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Pets Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">My Pets</h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search pets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              {serverSearchLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">searching…</span>
              )}
            </div>
            <button
              onClick={() => {
                resetPetForm();
                setEditingPet(null);
                setShowPetModal(true);
              }}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Pet</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading pets...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayPets.length > 0 ? displayPets.map((pet) => (
              <div key={pet._id} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-100">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{getPetEmoji(pet.type)}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{pet.name}</h4>
                    <p className="text-sm text-gray-600">
                      {pet.type} {pet.breed && `• ${pet.breed}`} {pet.age && `• ${pet.age} years old`}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>Added: {formatDate(pet.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(pet)}
                    disabled={isLoading}
                    className="p-2 text-gray-500 hover:text-orange-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePet(pet._id)}
                    disabled={isLoading}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <PawPrint className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pets added yet. Click "Add Pet" to get started!</p>
              </div>
            )}
            <Pagination />
          </div>
        )}
      </div>
    </div>
  );



  const renderServicesTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Available Services</h3>
        <p className="text-gray-600">Browse and book grooming services for your pets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-900">{service.name}</h4>
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                ₹{service.price}
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">{service.description}</p>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>{service.duration} mins</span>
              </div>
              <button className="text-orange-600 hover:text-orange-800 text-sm font-medium">
                Book Service
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 w-full">
      <div className="w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">My Profile</h3>

        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl font-semibold">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{user?.fullName || 'User'}</h4>
            <p className="text-sm text-gray-600">{user?.email}</p>
            <p className="text-xs text-gray-500 capitalize">Shop User</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <p className="text-gray-900">{user?.fullName || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{user?.email || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <p className="text-gray-900">{user?.phone || 'Not Provided'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Shop</label>
            {user?.assignedShop ? (
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">🏪</div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {shopDetails?.name || shopDetails?.shopName || shopDetails?.title || 'Loading shop details...'}
                  </p>
                  <p className="text-xs text-blue-700">
                    {shopDetails?.address || shopDetails?.location || shopDetails?.fullAddress || 'Loading address...'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No shop assigned</p>
            )}
          </div>
        </div>



      </div>


    </div>
  );

  const renderAppointmentsTab = () => {
    // Calculate pagination values
    const effectiveTotal = appointmentTotal || appointments.length;
    const startIdx = (appointmentPage - 1) * appointmentLimit;
    const endIdx = Math.min(startIdx + appointmentLimit, effectiveTotal);
    const pageCount = Math.max(1, Math.ceil(effectiveTotal / appointmentLimit));
    const isServerPaged = appointmentTotal > 0;

    const filteredAppointments = appointments.filter((apt) => {
      if (!appointmentSearchTerm) return true;
      const term = appointmentSearchTerm.toLowerCase();
      return (
        apt.petName?.toLowerCase().includes(term) ||
        apt.serviceType?.toLowerCase().includes(term) ||
        apt.status?.toLowerCase().includes(term)
      );
    });

    const pagedAppointments = isServerPaged
      ? filteredAppointments
      : filteredAppointments.slice(startIdx, endIdx);

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Appointments</h2>
            <p className="text-gray-600">View your pet grooming appointments and their status</p>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search by pet name, service, or status..."
            value={appointmentSearchTerm}
            onChange={(e) => {
              setAppointmentPage(1);
              setAppointmentSearchTerm(e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-64"
          />

          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              value={appointmentLimit}
              onChange={(e) => {
                setAppointmentPage(1);
                setAppointmentLimit(Number(e.target.value));
              }}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              {[5, 10, 20, 50].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Appointments Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total</p>
                <p className="text-2xl font-bold text-blue-900">{effectiveTotal}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {appointments.filter(apt => apt.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {appointments.filter(apt => apt.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Confirmed</p>
                <p className="text-2xl font-bold text-purple-900">
                  {appointments.filter(apt => apt.status === 'confirmed').length}
                </p>
              </div>
              <Bell className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div>{appointment.shopName || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{appointment.shopAddress || ''}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                    ₹{appointment.servicePrice?.toLocaleString() || 'N/A'}
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
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {appointment.status !== 'completed' && (
                        <button
                          className="text-orange-600 hover:text-orange-800"
                          title="Edit Appointment"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pagedAppointments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    {appointmentSearchTerm ? 'No appointments found matching your search.' : 'No appointments found.'}
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
              ? `Showing ${effectiveTotal ? startIdx + 1 : 0}–${effectiveTotal ? endIdx : 0} of ${effectiveTotal} appointments`
              : 'Showing 0 of 0 appointments'}
          </div>

          <div className="inline-flex items-center gap-1">
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setAppointmentPage(1)}
              disabled={appointmentPage <= 1}
              title="First"
            >
              «
            </button>
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setAppointmentPage(p => Math.max(1, p - 1))}
              disabled={appointmentPage <= 1}
              title="Previous"
            >
              ‹
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50 rounded-lg">
              Page {appointmentPage} of {pageCount}
            </span>
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setAppointmentPage(p => Math.min(pageCount, p + 1))}
              disabled={appointmentPage >= pageCount}
              title="Next"
            >
              ›
            </button>
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setAppointmentPage(pageCount)}
              disabled={appointmentPage >= pageCount}
              title="Last"
            >
              »
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      <div className="flex-1 flex flex-col ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-orange-100">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                    {activeTab === 'overview' ? 'Staff Dashboard' :
                      activeTab === 'bookings' ? 'My Bookings' :
                        activeTab === 'profile' ? 'My Profile' :
                          activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h1>
                  <p className="text-gray-600">Welcome back, {user?.fullName || 'User'}</p>
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


          </div>
        </header>

        {/* Main Content - Removed max-width constraint and adjusted padding */}
        <div className="flex-1 p-6">
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
            {activeTab === 'services' && renderServicesTab()}
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'appointments' && renderAppointmentsTab()}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
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
              <span className="animate-pulse">📝</span>
              <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>🐕</span>
              <span className="animate-pulse" style={{ animationDelay: '1s' }}>📦</span>
              <span className="animate-pulse" style={{ animationDelay: '1.5s' }}>🐱</span>
              <span className="animate-pulse" style={{ animationDelay: '2s' }}>✨</span>
            </div>
            <p className="text-sm text-gray-500">Keeping everything organized for happy pets! 🐾</p>
          </div>
        </div>
      </div>

      {/* Pet Modal */}
      {showPetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingPet ? 'Edit Pet Profile' : 'Add New Pet'}
              </h3>
              <button
                onClick={() => {
                  setShowPetModal(false);
                  setEditingPet(null);
                  resetPetForm();
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={editingPet ? handleUpdatePet : handleAddPet} className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-xl border border-orange-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <PawPrint className="w-5 h-5 mr-2 text-orange-600" />
                  Basic Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pet Name *</label>
                    <input
                      type="text"
                      value={petForm.name}
                      onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Enter pet name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pet Type *</label>
                    <select
                      value={petForm.type}
                      onChange={(e) => setPetForm({ ...petForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      required
                    >
                      <option value="">Select pet type</option>
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Bird">Bird</option>
                      <option value="Rabbit">Rabbit</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                    <input
                      type="text"
                      value={petForm.breed}
                      onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Enter breed"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age (years)</label>
                    <input
                      type="number"
                      value={petForm.age}
                      onChange={(e) => setPetForm({ ...petForm, age: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Age in years"
                      min="0"
                      max="50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={petForm.weight}
                      onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Weight in kg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                    <input
                      type="date"
                      value={petForm.appointmentDate}
                      onChange={(e) => setPetForm({ ...petForm, appointmentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Health Information Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
                  Health Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vaccination Status</label>
                    <select
                      value={petForm.vaccinationStatus}
                      onChange={(e) => setPetForm({ ...petForm, vaccinationStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      required
                    >
                      <option value="up-to-date">Up to Date</option>
                      <option value="due-soon">Due Soon</option>
                      <option value="overdue">Overdue</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pet Owner's Name</label>
                    <input
                      type="text"
                      value={petForm.emergencyContact}
                      onChange={(e) => setPetForm({ ...petForm, emergencyContact: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Pet Owner's name"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="number"
                      value={petForm.emergencyPhone}
                      onChange={(e) => setPetForm({ ...petForm, emergencyPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Phone number"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
                    <textarea
                      value={petForm.medicalConditions}
                      onChange={(e) => setPetForm({ ...petForm, medicalConditions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Any allergies, medical conditions, or medications..."
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* Grooming Packages Section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-purple-600" />
                  Grooming Service Packages
                </h4>

                {services.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {services.map((service) => (
                      <label key={service._id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={petForm.preferredServices.includes(service._id)}
                          onChange={() => handleServiceToggle(service._id)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{service.name}</p>
                          <p className="text-xs text-gray-600">{service.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-purple-600">₹{service.price}</p>
                          <p className="text-xs text-gray-500">{service.duration} mins</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No services available yet.</p>
                  </div>
                )}
              </div>

              {/* Additional Notes Section */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Edit className="w-5 h-5 mr-2 text-yellow-600" />
                  Additional Information
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Behavior Notes</label>
                    <textarea
                      value={petForm.behaviorNotes}
                      onChange={(e) => setPetForm({ ...petForm, behaviorNotes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Any behavioral notes (e.g., anxious, aggressive, friendly with strangers...)"
                      rows="2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                    <textarea
                      value={petForm.specialInstructions}
                      onChange={(e) => setPetForm({ ...petForm, specialInstructions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Any special care instructions or requests..."
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Summary */}
              {(petForm.preferredServices.length > 0 || petForm.selectedPackage) && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-indigo-600" />
                    Pricing Summary
                  </h4>

                  <div className="space-y-2">
                    {petForm.selectedPackage && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Selected Package:</p>
                        {(() => {
                          const pkg = services.find(p => (p._id || p.id) === petForm.selectedPackage);
                          return pkg ? (
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>{pkg.name}</span>
                              <span>₹{pkg.price}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {petForm.preferredServices.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Individual Services:</p>
                        {petForm.preferredServices.map(serviceId => {
                          const service = services.find(s => (s._id || s.id) === serviceId);
                          return service ? (
                            <div key={serviceId} className="flex justify-between text-sm text-gray-600">
                              <span>{service.name}</span>
                              <span>₹{service.price}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}

                    <div className="border-t pt-2 mt-2 space-y-1">
                      {(() => {
                        const totalBreakdown = getTotalAmountWithGST();
                        return (
                          <>
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Service Amount:</span>
                              <span>₹{totalBreakdown.baseAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>GST (18%):</span>
                              <span>₹{totalBreakdown.gstAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-900">
                              <span>Total Amount (incl. GST):</span>
                              <span>₹{totalBreakdown.totalAmount.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowPetModal(false);
                    setEditingPet(null);
                    resetPetForm();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 font-medium"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingPet ? 'Update' : 'Next'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {showPaymentModal && createdAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col"> {/* Added max-h and flex-col */}
            <div className="flex-shrink-0"> {/* Prevent header from shrinking */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Complete Payment</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSuccess('Pet added successfully! You can complete payment later.');
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="overflow-y-auto px-6 py-4 flex-1"> {/* Added overflow and flex-1 */}
              {/* Appointment Summary with GST Breakdown */}
              <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-100">
                <h4 className="font-semibold text-gray-800 mb-2">Appointment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pet:</span>
                    <span className="font-medium">{createdAppointment.petName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(createdAppointment.appointmentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Services:</span>
                    <span className="font-medium">{createdAppointment.services.length} selected</span>
                  </div>

                  {/* GST Breakdown */}
                  <div className="border-t pt-2 mt-3 space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Service Amount:</span>
                      <span>₹{createdAppointment.baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>GST (18%):</span>
                      <span>₹{createdAppointment.gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-orange-600 border-t pt-1">
                      <span>Total Amount:</span>
                      <span>₹{createdAppointment.totalWithGst.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select
                    value={paymentForm.paymentType || 'full'}
                    onChange={(e) => {
                      const paymentType = e.target.value;
                      let amount = createdAppointment.totalWithGst;
                      let advancePercentage = 0;

                      if (paymentType === 'advance') {
                        // Set advance payment as 30% of total (including GST) or minimum ₹200
                        advancePercentage = 30;
                        amount = Math.max(Math.ceil(createdAppointment.totalWithGst * 0.3), 200);
                      }

                      setPaymentForm({
                        ...paymentForm,
                        paymentType: paymentType,
                        amount: amount,
                        advancePercentage: advancePercentage
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    required
                  >
                    <option value="full">Full Payment</option>
                    <option value="advance">Advance Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) - Including GST
                    {paymentForm.paymentType === 'advance' && (
                      <span className="text-xs text-orange-600 ml-1">
                        (Minimum 30% or ₹200)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => {
                      const newAmount = parseFloat(e.target.value) || 0;
                      let advancePercentage = 0;

                      if (paymentForm.paymentType === 'advance' && createdAppointment.totalWithGst > 0) {
                        advancePercentage = Math.round((newAmount / createdAppointment.totalWithGst) * 100);
                      }

                      setPaymentForm({
                        ...paymentForm,
                        amount: e.target.value,
                        advancePercentage: advancePercentage
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    required
                    step="0.01"
                    min={paymentForm.paymentType === 'advance' ? Math.max(Math.ceil(createdAppointment.totalWithGst * 0.3), 200) : 0}
                    max={createdAppointment.totalWithGst}
                  />

                  {/* Payment Amount Breakdown */}
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs space-y-1">
                    {(() => {
                      const paymentAmount = parseFloat(paymentForm.amount) || 0;
                      const baseAmount = paymentAmount / 1.18; // Remove GST to get base
                      const gstAmount = paymentAmount - baseAmount;

                      return (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>Base Amount:</span>
                            <span>₹{baseAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>GST (18%):</span>
                            <span>₹{gstAmount.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {paymentForm.paymentType === 'advance' && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        Advance: {paymentForm.advancePercentage}% of total amount
                      </p>
                      <p className="text-xs text-gray-500">
                        Remaining: ₹{(createdAppointment.totalWithGst - (parseFloat(paymentForm.amount) || 0)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </div>

                {paymentForm.paymentMethod !== 'cash' && (
                  <div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={paymentForm.notes || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Any additional notes..."
                    rows="2"
                    maxLength="200"
                  />
                </div>
              </form>
            </div>

            {/* Fixed footer with buttons */}
            <div className="flex-shrink-0 p-6 border-t border-gray-200"> {/* Prevent footer from shrinking */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSuccess('Pet added successfully! You can complete payment later.');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Pay Later
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  onClick={handlePaymentSubmit}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                >
                  <span>
                    {paymentForm.paymentType === 'advance' ? 'Pay Advance' : 'Complete Payment'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;