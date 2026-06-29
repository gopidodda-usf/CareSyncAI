import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import { 
  Activity, LogOut, Users, Heart, Clipboard, Layers, Plus, 
  MapPin, Phone, Building, Briefcase, HelpCircle, User, UserPlus,
  Search, ArrowUp, ArrowDown, X, XCircle, Trash2,
  Calendar, TrendingUp, Bot, Sparkles, Clock, DollarSign, Star, Percent
} from 'lucide-react';


const ThreeHeartsIcon = ({ className, style }) => (
  <div className={`flex items-center -space-x-1.5 ${className || ''}`} style={style}>
    <Heart className="h-3.5 w-3.5" />
    <Heart className="h-5 w-5 -mt-1" />
    <Heart className="h-3.5 w-3.5" />
  </div>
);


export default function AdminDashboard() {
  const { user, logout, reloadUser } = useAuth();
  
  // Stats overview
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Chart reports
  const [charts, setCharts] = useState(null);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [hoveredPeakHourIndex, setHoveredPeakHourIndex] = useState(null);

  // Users listing
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSortField, setUserSortField] = useState('id');
  const [userSortOrder, setUserSortOrder] = useState('asc');

  // Selected user for editing (modal dialog)
  const [editingUser, setEditingUser] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editName, setEditName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStreet1, setEditStreet1] = useState('');
  const [editStreet2, setEditStreet2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('FL');
  const [editZip, setEditZip] = useState('');
  const [editCounty, setEditCounty] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [saveUserError, setSaveUserError] = useState('');
  const [saveUserMessage, setSaveUserMessage] = useState('');
  const [errors, setErrors] = useState({});

  const clearError = (field) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  // Doctor specialty & clinic fields
  const [editPrimarySpecialty, setEditPrimarySpecialty] = useState('');
  const [editSecondarySpecialties, setEditSecondarySpecialties] = useState([]);
  const [editClinicId, setEditClinicId] = useState(null);
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState('');
  const [showClinicDropdown, setShowClinicDropdown] = useState(false);
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [realAddresses, setRealAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const addressTimeoutRef = useRef(null);
  const currentSearchQueryRef = useRef('');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [showClinicAddressDropdown, setShowClinicAddressDropdown] = useState(false);
  const [clinicRealAddresses, setClinicRealAddresses] = useState([]);
  const [loadingClinicAddresses, setLoadingClinicAddresses] = useState(false);
  const clinicAddressTimeoutRef = useRef(null);
  const clinicAddressSearchQueryRef = useRef('');

  // Clinic & Specialty list
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  // Create Clinic / Specialty states
  const [clinicName, setClinicName] = useState('');
  const [clinicStreet1, setClinicStreet1] = useState('');
  const [clinicStreet2, setClinicStreet2] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicState, setClinicState] = useState('FL');
  const [clinicZip, setClinicZip] = useState('');
  const [clinicCounty, setClinicCounty] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [specName, setSpecName] = useState('');
  const [specDesc, setSpecDesc] = useState('');

  // Selected User IDs for bulk deletion
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'users', 'metadata', 'profile'
  const [analyticsSubTab, setAnalyticsSubTab] = useState('overview');
  const [isFlipped, setIsFlipped] = useState(false);

  // Profile fields state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminProfilePic, setAdminProfilePic] = useState('');
  const [adminProfilePicPreview, setAdminProfilePicPreview] = useState('');
  const [isEnlargedAvatarOpen, setIsEnlargedAvatarOpen] = useState(false);
  const [adminOldPassword, setAdminOldPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    loadOverview();
    loadCharts();
    loadMetadataLists();

    // Dynamically load Google Maps script if API key is provided
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      if (window.google && window.google.maps && window.google.maps.places) {
        setGoogleMapsLoaded(true);
      } else {
        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
          const handleLoad = () => setGoogleMapsLoaded(true);
          existingScript.addEventListener('load', handleLoad);
        } else {
          const script = document.createElement('script');
          script.id = 'google-maps-script';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => setGoogleMapsLoaded(true);
          script.onerror = () => {
            console.error("Google Maps API script load failed.");
            setGoogleMapsLoaded(false);
          };
          document.head.appendChild(script);
        }
      }
    }

    const handleClickOutside = (event) => {
      if (!event.target.closest('.clinic-dropdown-container')) {
        setShowClinicDropdown(false);
      }
      if (!event.target.closest('.address-dropdown-container')) {
        setShowAddressDropdown(false);
      }
      if (!event.target.closest('.clinic-address-dropdown-container')) {
        setShowClinicAddressDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      setAvatarError(false);
      setAdminName(user.name || '');
      setAdminEmail(user.email || '');
      setAdminProfilePic(user.profile_picture || '');
      setAdminProfilePicPreview(user.profile_picture || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');

    if (adminNewPassword) {
      if (!adminOldPassword) {
        setProfileError("Old password is required to change password");
        setSavingProfile(false);
        return;
      }
      if (adminNewPassword !== adminConfirmPassword) {
        setProfileError("New passwords do not match");
        setSavingProfile(false);
        return;
      }
      if (adminNewPassword.length < 6) {
        setProfileError("New password must be at least 6 characters long");
        setSavingProfile(false);
        return;
      }
    }

    try {
      await API.put('/api/admin/profile', {
        name: adminName,
        profile_picture: adminProfilePic,
        old_password: adminOldPassword || undefined,
        new_password: adminNewPassword || undefined
      });
      setProfileMessage('Your profile settings have been updated successfully!');
      setAdminOldPassword('');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      await reloadUser();
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update admin profile settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size must be under 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminProfilePic(reader.result); // Base64 data URL
        setAdminProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadOverview = async () => {
    try {
      const res = await API.get('/api/admin/analytics/overview');
      setOverview(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadCharts = async () => {
    try {
      const res = await API.get('/api/admin/analytics/dashboard');
      setCharts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCharts(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await API.get('/api/admin/users');
      setUsersList(res.data);
      setSelectedUserIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleBulkDelete = async () => {
    const targets = selectedUserIds.filter(id => id !== user.id);
    if (targets.length === 0) {
      alert("No valid users selected to delete.");
      return;
    }
    
    const confirmDelete = window.confirm(`Are you sure you want to delete the ${targets.length} selected user(s)? This action is permanent and deletes all associated profile records, appointments, and notifications.`);
    if (!confirmDelete) return;

    try {
      await API.post('/api/admin/users/bulk-delete', { user_ids: targets });
      setSelectedUserIds([]);
      loadUsers();
      loadOverview();
      alert(`Successfully deleted ${targets.length} user(s).`);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to perform bulk deletion of users.");
    }
  };

  const loadMetadataLists = async () => {
    try {
      const [clinicRes, specRes] = await Promise.all([
        API.get('/api/patient/clinics'),
        API.get('/api/patient/specialties')
      ]);
      setClinics(clinicRes.data);
      setSpecialties(specRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAndSortedUsers = React.useMemo(() => {
    let list = usersList;

    // 1. Filter by role
    if (userRoleFilter !== 'all') {
      list = list.filter(u => u.role === userRoleFilter);
    }

    // 2. Filter by search query (id, name, email)
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase().trim();
      list = list.filter(u => 
        String(u.id).toLowerCase().includes(query) ||
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query))
      );
    }

    // 3. Sort
    list = [...list].sort((a, b) => {
      let valA = a[userSortField] || '';
      let valB = b[userSortField] || '';

      // Handle ID sorting as numeric if possible
      if (userSortField === 'id') {
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return userSortOrder === 'asc' ? numA - numB : numB - numA;
        }
      }

      // Handle string comparison (case-insensitive)
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return userSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return userSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [usersList, userRoleFilter, userSearchQuery, userSortField, userSortOrder]);

  const allDeletableUsers = React.useMemo(() => {
    return filteredAndSortedUsers.filter(u => u.id !== user?.id);
  }, [filteredAndSortedUsers, user]);

  const isAllChecked = React.useMemo(() => {
    return allDeletableUsers.length > 0 && allDeletableUsers.every(u => selectedUserIds.includes(u.id));
  }, [allDeletableUsers, selectedUserIds]);
  
  const handleCheckAll = () => {
    if (isAllChecked) {
      const deletableIds = allDeletableUsers.map(u => u.id);
      setSelectedUserIds(prev => prev.filter(id => !deletableIds.includes(id)));
    } else {
      const deletableIds = allDeletableUsers.map(u => u.id);
      setSelectedUserIds(prev => {
        const unique = new Set([...prev, ...deletableIds]);
        return Array.from(unique);
      });
    }
  };

  const handleCheckUser = (id) => {
    setSelectedUserIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleEditPhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, ''); // strip non-digits
    let formatted = raw;
    if (raw.length > 3 && raw.length <= 6) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6, 10)}`;
    }
    setEditPhone(formatted);
  };

  const openEditModal = (usr) => {
    setEditingUser(usr);
    setIsCreating(false);
    setEditEmail(usr.email || '');
    setEditRole(usr.role || '');
    setEditPassword('');
    setSaveUserMessage('');
    setSaveUserError('');
    setErrors({});
    
    // Set doctor-specific states
    setEditPrimarySpecialty(usr.specialty_id || '');
    setEditSecondarySpecialties(usr.secondary_specialties || []);
    setEditClinicId(usr.clinic_id || null);
    if (usr.role === 'doctor') {
      const matchedClinic = clinics.find(c => c.id === usr.clinic_id);
      setClinicSearchQuery(matchedClinic ? matchedClinic.name : '');
    } else {
      setClinicSearchQuery('');
    }
    setSpecialtySearchQuery('');
    setShowClinicDropdown(false);
    setShowSpecialtyDropdown(false);
    setShowAddressDropdown(false);
    setRealAddresses([]);
    setLoadingAddresses(false);
    currentSearchQueryRef.current = '';
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }

    if (usr.role === 'admin') {
      const nameParts = (usr.name || '').split(' ');
      setEditFirstName(nameParts[0] || '');
      setEditLastName(nameParts.slice(1).join(' ') || '');
      setEditPhone('');
      setEditStreet1('');
      setEditStreet2('');
      setEditCity('');
      setEditState('');
      setEditZip('');
      setEditCounty('');
    } else {
      setEditFirstName(usr.first_name || '');
      setEditLastName(usr.last_name || '');
      setEditPhone(usr.phone || '');
      setEditStreet1(usr.street_address_1 || '');
      setEditStreet2(usr.street_address_2 || '');
      setEditCity(usr.city || '');
      setEditState(usr.state || '');
      setEditZip(usr.zip_code || '');
      setEditCounty(usr.county || '');
    }
  };

  const openCreateModal = () => {
    setEditingUser({ id: 'new' });
    setIsCreating(true);
    setEditEmail('');
    setEditRole('');
    setEditPassword('');
    setSaveUserMessage('');
    setSaveUserError('');
    setErrors({});
    setEditFirstName('');
    setEditLastName('');
    setEditPhone('');
    setEditStreet1('');
    setEditStreet2('');
    setEditCity('');
    setEditState('');
    setEditZip('');
    setEditCounty('');

    // Reset doctor-specific states
    setEditPrimarySpecialty('');
    setEditSecondarySpecialties([]);
    setEditClinicId(null);
    setClinicSearchQuery('');
    setSpecialtySearchQuery('');
    setShowClinicDropdown(false);
    setShowSpecialtyDropdown(false);
    setShowAddressDropdown(false);
    setRealAddresses([]);
    setLoadingAddresses(false);
    currentSearchQueryRef.current = '';
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }
  };

  const handleSelectClinic = (clinic) => {
    setEditClinicId(clinic.id);
    setClinicSearchQuery(clinic.name);
    setShowClinicDropdown(false);
    // Autofill address details
    setEditStreet1(clinic.street_address_1 || '');
    setEditStreet2(clinic.street_address_2 || '');
    setEditCity(clinic.city || '');
    setEditState(clinic.state || '');
    setEditZip(clinic.zip_code || '');
    setEditCounty(clinic.county || '');
    
    // Clear errors
    clearError('clinic');
    clearError('street1');
    clearError('city');
    clearError('state');
    clearError('zip');
    clearError('county');
  };

  const fetchPhotonSuggestions = async (query) => {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ' USA')}&limit=15`;
      const res = await fetch(url);
      const data = await res.json();
      
      // Stop execution if the user has already typed something else
      if (query !== currentSearchQueryRef.current) {
        return;
      }
      
      if (data && data.features) {
        // Filter out non-US locations to be absolutely certain
        const usFeatures = data.features.filter(f => 
          f.properties && 
          (f.properties.countrycode === 'US' || 
           (f.properties.country && f.properties.country.toLowerCase().includes('united states')))
        );
        
        // Map to structured format matching our address layout
        const mapped = usFeatures.map(f => {
          const props = f.properties;
          
          // Helper to map state names to abbreviations
          const STATE_MAP = {
            "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC"
          };
          
          const lookupState = (st) => {
            if (!st) return '';
            const clean = st.trim().toLowerCase();
            if (clean.length === 2) return st.toUpperCase();
            return STATE_MAP[clean] || '';
          };
          
          // Build Street 1
          let street1 = '';
          if (props.housenumber && props.street) {
            street1 = `${props.housenumber} ${props.street}`;
          } else if (props.street) {
            street1 = props.street;
          } else {
            street1 = props.name || '';
          }
          
          // Clean county name
          let county = props.county || '';
          if (county.toLowerCase().endsWith(' county')) {
            county = county.slice(0, -7);
          }
          
          // Build readable display text
          const displayParts = [
            props.name !== props.street ? props.name : null,
            [props.housenumber, props.street].filter(Boolean).join(' '),
            props.city,
            lookupState(props.state),
            props.postcode
          ].filter(Boolean);
          const displayText = displayParts.join(', ');

          return {
            street1: street1,
            city: props.city || '',
            state: lookupState(props.state),
            zip: props.postcode || '',
            county: county,
            displayText: displayText,
            isGoogle: false
          };
        });
        
        // Remove duplicates based on street1 + zip
        const seen = new Set();
        const unique = [];
        for (const item of mapped) {
          const key = `${item.street1.toLowerCase()}|${item.zip}`;
          if (!seen.has(key) && item.street1) {
            seen.add(key);
            unique.push(item);
          }
        }
        
        setRealAddresses(unique.slice(0, 8));
      } else {
        setRealAddresses([]);
      }
    } catch (err) {
      console.error("Geocoding fetch failed:", err);
      setRealAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const fetchAddressSuggestions = async (query) => {
    if (!query || query.trim().length < 3) {
      setRealAddresses([]);
      return;
    }
    
    setLoadingAddresses(true);

    if (googleMapsLoaded && window.google && window.google.maps) {
      try {
        const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places");
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ['us']
        });

        // Stop execution if query is stale
        if (query !== currentSearchQueryRef.current) {
          return;
        }

        if (suggestions && suggestions.length > 0) {
          const mapped = suggestions.map(s => {
            const pred = s.placePrediction;
            return {
              placeId: pred.placeId,
              displayText: pred.text.toString(),
              isGoogle: true
            };
          });
          setRealAddresses(mapped);
          setLoadingAddresses(false);
        } else {
          fetchPhotonSuggestions(query);
        }
      } catch (err) {
        console.warn("Google Places Autocomplete failed, falling back to Photon:", err);
        fetchPhotonSuggestions(query);
      }
    } else {
      fetchPhotonSuggestions(query);
    }
  };

  const handleSelectAddress = async (addr) => {
    if (addr.isGoogle && addr.placeId) {
      setLoadingAddresses(true);
      try {
        const { Place } = await window.google.maps.importLibrary("places");
        const place = new Place({ id: addr.placeId });
        await place.fetchFields({
          fields: ['addressComponents']
        });

        if (addr.placeId && currentSearchQueryRef.current === '') {
          // If modal was closed/reset during query
          setLoadingAddresses(false);
          return;
        }

        setLoadingAddresses(false);

        if (place.addressComponents) {
          let streetNumber = '';
          let route = '';
          let city = '';
          let state = '';
          let zip = '';
          let county = '';

          place.addressComponents.forEach(c => {
            const types = c.types;
            if (types.includes('street_number')) {
              streetNumber = c.longText;
            } else if (types.includes('route')) {
              route = c.longText;
            } else if (types.includes('locality')) {
              city = c.longText;
            } else if (types.includes('administrative_area_level_1')) {
              state = c.shortText;
            } else if (types.includes('postal_code')) {
              zip = c.longText;
            } else if (types.includes('administrative_area_level_2')) {
              county = c.longText;
            }
          });

          if (!city) {
            const sublocality = place.addressComponents.find(c => c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'));
            if (sublocality) city = sublocality.longText;
          }

          if (county.toLowerCase().endsWith(' county')) {
            county = county.slice(0, -7);
          }

          const street1 = [streetNumber, route].filter(Boolean).join(' ');

          setEditStreet1(street1 || '');
          setEditCity(city || '');
          setEditState(state.toUpperCase() || '');
          setEditZip(zip || '');
          setEditCounty(county || '');
          setShowAddressDropdown(false);
          currentSearchQueryRef.current = '';
          
          // Clear errors
          clearError('street1');
          clearError('city');
          clearError('state');
          clearError('zip');
          clearError('county');
        } else {
          console.error("Failed to parse address components from Place details.");
        }
      } catch (err) {
        console.error("Google Places Details failed:", err);
        setLoadingAddresses(false);
      }
    } else {
      setEditStreet1(addr.street1 || '');
      setEditCity(addr.city || '');
      setEditState(addr.state || '');
      setEditZip(addr.zip || '');
      setEditCounty(addr.county || '');
      setShowAddressDropdown(false);
      currentSearchQueryRef.current = '';
      
      // Clear errors
      clearError('street1');
      clearError('city');
      clearError('state');
      clearError('zip');
      clearError('county');
    }
  };

  const fetchClinicPhotonSuggestions = async (query) => {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ' USA')}&limit=15`;
      const res = await fetch(url);
      const data = await res.json();
      
      // Stop execution if the user has already typed something else
      if (query !== clinicAddressSearchQueryRef.current) {
        return;
      }
      
      if (data && data.features) {
        // Filter out non-US locations to be absolutely certain
        const usFeatures = data.features.filter(f => 
          f.properties && 
          (f.properties.countrycode === 'US' || 
           (f.properties.country && f.properties.country.toLowerCase().includes('united states')))
        );
        
        // Map to structured format matching our address layout
        const mapped = usFeatures.map(f => {
          const props = f.properties;
          
          // Helper to map state names to abbreviations
          const STATE_MAP = {
            "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC"
          };
          
          const lookupState = (st) => {
            if (!st) return '';
            const clean = st.trim().toLowerCase();
            if (clean.length === 2) return st.toUpperCase();
            return STATE_MAP[clean] || '';
          };
          
          // Build Street 1
          let street1 = '';
          if (props.housenumber && props.street) {
            street1 = `${props.housenumber} ${props.street}`;
          } else if (props.street) {
            street1 = props.street;
          } else {
            street1 = props.name || '';
          }
          
          // Clean county name
          let county = props.county || '';
          if (county.toLowerCase().endsWith(' county')) {
            county = county.slice(0, -7);
          }
          
          // Build readable display text
          const displayParts = [
            props.name !== props.street ? props.name : null,
            [props.housenumber, props.street].filter(Boolean).join(' '),
            props.city,
            lookupState(props.state),
            props.postcode
          ].filter(Boolean);
          const displayText = displayParts.join(', ');

          return {
            street1: street1,
            city: props.city || '',
            state: lookupState(props.state),
            zip: props.postcode || '',
            county: county,
            displayText: displayText,
            isGoogle: false
          };
        });
        
        // Remove duplicates based on street1 + zip
        const seen = new Set();
        const unique = [];
        for (const item of mapped) {
          const key = `${item.street1.toLowerCase()}|${item.zip}`;
          if (!seen.has(key) && item.street1) {
            seen.add(key);
            unique.push(item);
          }
        }
        
        setClinicRealAddresses(unique.slice(0, 8));
      } else {
        setClinicRealAddresses([]);
      }
    } catch (err) {
      console.error("Clinic Geocoding fetch failed:", err);
      setClinicRealAddresses([]);
    } finally {
      setLoadingClinicAddresses(false);
    }
  };

  const fetchClinicAddressSuggestions = async (query) => {
    if (!query || query.trim().length < 3) {
      setClinicRealAddresses([]);
      return;
    }
    
    setLoadingClinicAddresses(true);

    if (googleMapsLoaded && window.google && window.google.maps) {
      try {
        const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places");
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ['us']
        });

        // Stop execution if query is stale
        if (query !== clinicAddressSearchQueryRef.current) {
          return;
        }

        if (suggestions && suggestions.length > 0) {
          const mapped = suggestions.map(s => {
            const pred = s.placePrediction;
            return {
              placeId: pred.placeId,
              displayText: pred.text.toString(),
              isGoogle: true
            };
          });
          setClinicRealAddresses(mapped);
          setLoadingClinicAddresses(false);
        } else {
          fetchClinicPhotonSuggestions(query);
        }
      } catch (err) {
        console.warn("Google Places Autocomplete failed for clinic, falling back to Photon:", err);
        fetchClinicPhotonSuggestions(query);
      }
    } else {
      fetchClinicPhotonSuggestions(query);
    }
  };

  const handleSelectClinicAddress = async (addr) => {
    if (addr.isGoogle && addr.placeId) {
      setLoadingClinicAddresses(true);
      try {
        const { Place } = await window.google.maps.importLibrary("places");
        const place = new Place({ id: addr.placeId });
        await place.fetchFields({
          fields: ['addressComponents']
        });

        if (addr.placeId && clinicAddressSearchQueryRef.current === '') {
          // If panel was closed/reset during query
          setLoadingClinicAddresses(false);
          return;
        }

        setLoadingClinicAddresses(false);

        if (place.addressComponents) {
          let streetNumber = '';
          let route = '';
          let city = '';
          let state = '';
          let zip = '';
          let county = '';

          place.addressComponents.forEach(c => {
            const types = c.types;
            if (types.includes('street_number')) {
              streetNumber = c.longText;
            } else if (types.includes('route')) {
              route = c.longText;
            } else if (types.includes('locality')) {
              city = c.longText;
            } else if (types.includes('administrative_area_level_1')) {
              state = c.shortText;
            } else if (types.includes('postal_code')) {
              zip = c.longText;
            } else if (types.includes('administrative_area_level_2')) {
              county = c.longText;
            }
          });

          if (!city) {
            const sublocality = place.addressComponents.find(c => c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'));
            if (sublocality) city = sublocality.longText;
          }

          if (county.toLowerCase().endsWith(' county')) {
            county = county.slice(0, -7);
          }

          const street1 = [streetNumber, route].filter(Boolean).join(' ');

          setClinicStreet1(street1 || '');
          setClinicCity(city || '');
          setClinicState(state.toUpperCase() || 'FL');
          setClinicZip(zip || '');
          setClinicCounty(county || '');
          setShowClinicAddressDropdown(false);
          clinicAddressSearchQueryRef.current = '';
        } else {
          console.error("Failed to parse clinic address components from Place details.");
        }
      } catch (err) {
        console.error("Google Places Details failed for clinic:", err);
        setLoadingClinicAddresses(false);
      }
    } else {
      setClinicStreet1(addr.street1 || '');
      setClinicCity(addr.city || '');
      setClinicState(addr.state || 'FL');
      setClinicZip(addr.zip || '');
      setClinicCounty(addr.county || '');
      setShowClinicAddressDropdown(false);
      clinicAddressSearchQueryRef.current = '';
    }
  };

  const handleAddSecondarySpecialty = (spec) => {
    if (!editSecondarySpecialties.some(s => s.id === spec.id)) {
      setEditSecondarySpecialties(prev => [...prev, spec]);
    }
    setSpecialtySearchQuery('');
    setShowSpecialtyDropdown(false);
  };

  const handleRemoveSecondarySpecialty = (id) => {
    setEditSecondarySpecialties(prev => prev.filter(s => s.id !== id));
  };

  const handleDeleteClinic = async (clinicId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this clinic? This will delete the clinic and permanently delete ALL doctors associated with this clinic!");
    if (!confirmDelete) return;

    try {
      await API.delete(`/api/admin/clinics/${clinicId}`);
      loadMetadataLists();
      loadUsers();
      alert("Clinic and associated doctors deleted successfully.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete clinic.");
    }
  };

  const handleDeleteSpecialty = async (specId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this specialty? This will remove this specialty from all doctor profiles.");
    if (!confirmDelete) return;

    try {
      await API.delete(`/api/admin/specialties/${specId}`);
      loadMetadataLists();
      loadUsers();
      alert("Specialty deleted successfully.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete specialty.");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!editFirstName.trim()) {
      newErrors.firstName = 'First Name is required.';
    }

    if (!editLastName.trim()) {
      newErrors.lastName = 'Last Name is required.';
    }

    if (!editRole) {
      newErrors.role = 'Access Role is required.';
    }

    if (!editEmail.trim()) {
      newErrors.email = 'Email Address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmail.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      } else {
        const emailVal = editEmail.trim().toLowerCase();
        const emailExists = usersList.some(u => u.email.toLowerCase() === emailVal && (!editingUser || u.id !== editingUser.id));
        if (emailExists) {
          newErrors.email = 'Email address is already registered.';
        }
      }
    }

    if (isCreating) {
      if (!editPassword) {
        newErrors.password = 'Password is required.';
      } else if (editPassword.length < 6) {
        newErrors.password = 'Password must be at least 6 characters long.';
      }
    } else if (editPassword && editPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }

    if (editRole === 'patient' || editRole === 'doctor') {
      const rawPhone = editPhone.replace(/\D/g, '');
      if (!rawPhone) {
        newErrors.phone = 'Phone number is required.';
      } else if (rawPhone.length !== 10) {
        newErrors.phone = 'Phone number must be exactly 10 digits.';
      }

      if (!editStreet1.trim()) {
        newErrors.street1 = 'Street Address 1 is required.';
      }

      if (!editCity.trim()) {
        newErrors.city = 'City is required.';
      }

      if (!editState) {
        newErrors.state = 'State is required.';
      }

      const zipVal = editZip.trim();
      if (!zipVal) {
        newErrors.zip = 'Zip Code is required.';
      } else if (!/^\d{5}$/.test(zipVal)) {
        newErrors.zip = 'Zip Code must be exactly 5 digits.';
      }

      if (!editCounty.trim()) {
        newErrors.county = 'County is required.';
      }

      if (editRole === 'doctor') {
        if (!editClinicId) {
          newErrors.clinic = 'Clinic selection is required.';
        }
        if (!editPrimarySpecialty) {
          newErrors.primarySpecialty = 'Primary Specialty is required.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setSaveUserMessage('');
    setSaveUserError('');

    if (!validateForm()) {
      setSavingUser(false);
      return;
    }

    setSavingUser(true);

    try {
      const payload = {
        email: editEmail,
        role: editRole,
        first_name: editFirstName,
        last_name: editLastName,
        phone: editRole !== 'admin' ? editPhone : undefined,
        password: editPassword || undefined,
        street_address_1: editRole !== 'admin' ? editStreet1 : undefined,
        street_address_2: editRole !== 'admin' ? editStreet2 || null : undefined,
        city: editRole !== 'admin' ? editCity : undefined,
        state: editRole !== 'admin' ? editState : undefined,
        zip_code: editRole !== 'admin' ? editZip : undefined,
        county: editRole !== 'admin' ? editCounty : undefined,
        specialty_id: editRole === 'doctor' ? Number(editPrimarySpecialty) : undefined,
        secondary_specialty_ids: editRole === 'doctor' ? editSecondarySpecialties.map(s => s.id) : undefined,
        clinic_id: editRole === 'doctor' ? Number(editClinicId) : undefined
      };

      if (isCreating) {
        await API.post('/api/admin/users', payload);
        setSaveUserMessage('User created successfully!');
      } else {
        await API.put(`/api/admin/users/${editingUser.id}`, payload);
        setSaveUserMessage('User details updated successfully!');
      }
      
      // Reload users list
      loadUsers();

      // If we edited ourselves, reload our auth user details
      if (!isCreating && editingUser.id === user.id) {
        reloadUser();
      }

      // Close modal after 1.5 seconds on success
      setTimeout(() => {
        setEditingUser(null);
        setIsCreating(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Failed to save user details.';
      if (errMsg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: 'Email address is already registered.' }));
      } else {
        setSaveUserError(errMsg);
      }
    } finally {
      setSavingUser(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const handleCreateClinic = async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/admin/clinics', {
        name: clinicName,
        street_address_1: clinicStreet1,
        street_address_2: clinicStreet2 || null,
        city: clinicCity,
        state: clinicState,
        zip_code: clinicZip,
        county: clinicCounty,
        phone: clinicPhone
      });
      setClinicName('');
      setClinicStreet1('');
      setClinicStreet2('');
      setShowClinicAddressDropdown(false);
      setClinicRealAddresses([]);
      clinicAddressSearchQueryRef.current = '';
      setClinicCity('');
      setClinicState('FL');
      setClinicZip('');
      setClinicCounty('');
      setClinicPhone('');
      loadMetadataLists();
      alert("Clinic registered successfully!");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to register clinic");
    }
  };

  const handleCreateSpecialty = async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/admin/specialties', {
        name: specName,
        description: specDesc
      });
      setSpecName('');
      setSpecDesc('');
      loadMetadataLists();
      alert("Medical specialty registered successfully!");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to register specialty");
    }
  };

  // 20-color custom palette for consistent specialty coloring
  const PALETTE = [
    '#ec4899', // pink
    '#6366f1', // indigo
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#f43f5e', // rose
    '#3b82f6', // blue
    '#84cc16', // lime
    '#eab308', // yellow
    '#ef4444', // red
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#64748b', // slate
    '#059669', // dark emerald
    '#b91c1c', // dark red
    '#4338ca', // dark indigo
    '#0369a1', // dark sky
    '#6d28d9', // dark violet
  ];

  const getSpecialtyColor = (name) => {
    if (name === 'Others') {
      return '#64748b'; // Neutral slate color
    }
    const allKnownSpecs = [
      "Family Medicine", "Pediatrics", "Internal Medicine", 
      "OB/GYN", "Dermatology", 
      "Cardiology", "Orthopedics", "Gastroenterology", 
      "Ophthalmology", "Psychiatry", "Allergy and Immunology", 
      "Endocrinology", "Neurology", "Physical Therapy"
    ];
    const index = allKnownSpecs.indexOf(name);
    if (index !== -1) {
      return PALETTE[index % PALETTE.length];
    }
    // Fallback hashing for unknown specialties
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % PALETTE.length;
    return PALETTE[idx];
  };

  // Compute specialty data for the chart & flipped card details
  const { pieChartData, fullSpecialtyList } = React.useMemo(() => {
    if (!charts || !charts.specialty_demand || charts.specialty_demand.length === 0) {
      return { pieChartData: [], fullSpecialtyList: [] };
    }

    // Sort in decreasing order
    const sorted = [...charts.specialty_demand].sort((a, b) => b.count - a.count);
    const totalCount = sorted.reduce((sum, item) => sum + item.count, 0);

    // Calculate percentage for each and map long names (rounded to nearest integer)
    const withPct = sorted.map(item => {
      const cleanName = item.specialty === "Obstetrics and Gynecology (OB/GYN)"
        ? "OB/GYN"
        : item.specialty;
      return {
        ...item,
        specialty: cleanName,
        percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0
      };
    });

    // Group everything beyond top 9 into "Others"
    let pieData = [];
    if (withPct.length > 10) {
      const top9 = withPct.slice(0, 9);
      const othersList = withPct.slice(9);
      const othersCount = othersList.reduce((sum, item) => sum + item.count, 0);
      const othersPct = totalCount > 0 ? Math.round((othersCount / totalCount) * 100) : 0;

      pieData = [
        ...top9,
        {
          specialty: 'Others',
          count: othersCount,
          percentage: othersPct
        }
      ];
    } else {
      pieData = [...withPct];
    }

    return {
      pieChartData: pieData,
      fullSpecialtyList: withPct
    };
  }, [charts]);

  // Pre-calculate label offsets deterministically to avoid render-time side-effects and cross-label overlaps
  const labelOffsets = React.useMemo(() => {
    if (!pieChartData || pieChartData.length === 0) {
      return {};
    }

    const RADIAN = Math.PI / 180;
    const outerRadius = 105;
    let startAngle = 90;
    
    const totalCount = pieChartData.reduce((sum, item) => sum + item.count, 0);

    const computedSectors = pieChartData.map((entry) => {
      const percent = totalCount > 0 ? entry.count / totalCount : 0;
      const angle = percent * 360;
      const nextAngle = startAngle - angle;
      const midAngle = (startAngle + nextAngle) / 2;
      startAngle = nextAngle;
      return { ...entry, midAngle };
    });

    const offsetsList = [];

    computedSectors.forEach((entry) => {
      const radius = outerRadius + 14;
      const dx = radius * Math.cos(-entry.midAngle * RADIAN);
      const dy = radius * Math.sin(-entry.midAngle * RADIAN);

      let adjustedDy = dy;
      const isRightSide = dx > 0;
      const minSpacing = 20; // 20% increase from 16px minSpacing = 19.2px -> 20px

      let attempts = 0;
      let hasOverlap = true;
      while (hasOverlap && attempts < 15) {
        hasOverlap = false;
        for (const pos of offsetsList) {
          if (pos.isRightSide === isRightSide && Math.abs(adjustedDy - pos.dy) < minSpacing) {
            if (isRightSide) {
              adjustedDy += 18; // 20% increase from 15px shift = 18px
            } else {
              adjustedDy -= 18;
            }
            hasOverlap = true;
            break;
          }
        }
        attempts++;
      }

      offsetsList.push({
        name: entry.specialty,
        dx,
        dy: adjustedDy,
        isRightSide
      });
    });

    const offsetsMap = {};
    offsetsList.forEach((item) => {
      offsetsMap[item.name] = { dx: item.dx, dy: item.dy, isRightSide: item.isRightSide };
    });

    return offsetsMap;
  }, [pieChartData]);

  // Helper to split long specialty names into two lines for clean wrapping in SVG
  const splitLabel = (name) => {
    if (name === "Allergy and Immunology") {
      return ["Allergy and", "Immunology"];
    }
    if (name === "Family Medicine") {
      return ["Family", "Medicine"];
    }
    if (name === "Physical Therapy") {
      return ["Physical", "Therapy"];
    }
    return [name];
  };

  // Spaced out, non-overlapping label arrangement logic using pre-calculated offsets
  const renderCustomizedLabel = ({ cx, cy, name, percent }) => {
    if (percent < 0.015) return null; // hide extremely small sectors (<1.5%) to avoid clutter

    const offset = labelOffsets[name];
    if (!offset) return null;

    const x = cx + offset.dx;
    const y = cy + offset.dy;
    const isRightSide = offset.isRightSide;
    const labelColor = getSpecialtyColor(name);
    const parts = splitLabel(name);

    if (parts.length === 2) {
      return (
        <text 
          x={x} 
          y={y - 7} // offset slightly upward to center the 2 lines vertically (6 * 1.2 = 7.2)
          fill={labelColor} 
          textAnchor={isRightSide ? 'start' : 'end'} 
          dominantBaseline="central"
          style={{ fontSize: '14.4px' }} // font size increased by 20%
        >
          <tspan x={x} dy="0">{parts[0]}</tspan>
          <tspan x={x} dy="16">{`${parts[1]} (${Math.round(percent * 100)}%)`}</tspan>
        </text>
      );
    }

    return (
      <text 
        x={x} 
        y={y} 
        fill={labelColor} 
        textAnchor={isRightSide ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '14.4px' }} // font size increased by 20%
      >
        {`${name} (${Math.round(percent * 100)}%)`}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row bg-radial-glow-pink">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/40 border-b md:border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <Activity className="h-6 w-6 text-fuchsia-400" />
            <span className="font-extrabold text-white text-lg">CareSync <span className="text-fuchsia-400">AI</span></span>
          </div>

          {/* User profile */}
          <div 
            onClick={() => setActiveTab('profile')}
            className={`p-4 rounded-xl border mb-6 flex items-center gap-3 cursor-pointer hover:bg-slate-800/40 active:scale-95 transition-all ${
              activeTab === 'profile' 
                ? 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300' 
                : 'border-slate-800 bg-slate-800/20'
            }`}
          >
            {user?.profile_picture && !avatarError ? (
              <img 
                src={user.profile_picture} 
                alt="Avatar" 
                className="h-10 w-10 rounded-full object-cover border border-fuchsia-500/30 shrink-0" 
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-fuchsia-400 font-bold shrink-0">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] text-fuchsia-400 font-semibold uppercase tracking-wider mb-0.5">Admin</div>
              <div className="font-semibold text-white text-sm truncate">
                {user?.name || 'CareSync Admin'}
              </div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'analytics', label: 'Dashboard', icon: Activity },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'metadata', label: 'Clinics & Specialties', icon: Layers }
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none border ${
                    activeTab === nav.id 
                      ? 'bg-fuchsia-500/15 border-fuchsia-500/20 text-fuchsia-300' 
                      : 'border-fuchsia-500/0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
 
      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {
                activeTab === 'analytics' ? 'Dashboard' :
                activeTab === 'users' ? 'User Management' :
                activeTab === 'metadata' ? 'Clinics & Specialties' :
                activeTab === 'profile' ? 'Profile Settings' :
                'Dashboard'
              }
            </h2>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-medium shadow-sm"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Sticky Sub-Tab Navigation Bar */}
            <div className="flex flex-wrap items-center gap-2 pb-4 mb-6 sticky top-0 bg-transparent z-10">
              {[
                { id: 'overview', label: 'Platform Overview' },
                { id: 'patients', label: 'Patient Metrics' },
                { id: 'doctors', label: 'Doctor Metrics' },
                { id: 'appointments', label: 'Appointment Metrics' },
                { id: 'ai', label: 'Casy AI' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAnalyticsSubTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    analyticsSubTab === tab.id
                      ? tab.id === 'overview'
                        ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/20'
                        : tab.id === 'patients'
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                        : tab.id === 'doctors'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : tab.id === 'appointments'
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : tab.id === 'ai'
                        ? 'bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 to-indigo-500 text-white font-bold shadow-lg shadow-orange-500/20'
                        : 'bg-sky-500 text-white'
                      : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800/50 border border-slate-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loadingOverview || loadingCharts ? (
              <div className="text-center py-24 text-slate-400 text-sm animate-pulse flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin"></div>
                <span>Loading analytics visualization...</span>
              </div>
            ) : charts && overview ? (
              <div className="space-y-12">
                
                {/* 1. Platform Overview Section */}
                {(analyticsSubTab === 'all' || analyticsSubTab === 'overview') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-5 w-5 text-fuchsia-500" />
                      <h3 className="text-base font-bold text-white">Platform Overview</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: "Total Patients", value: overview.total_patients, icon: User, color: "text-fuchsia-400" },
                        { title: "Patients Today", value: overview.active_patients_today, icon: User, color: "text-sky-400" },
                        { title: "Total Doctors", value: overview.total_doctors, icon: Heart, style: { color: 'rgb(129, 140, 248)' } },
                        { title: "Doctors Today", value: overview.active_doctors_today, icon: Heart, style: { color: 'rgb(52, 211, 153)' } },
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 opacity-40 ${card.color || ''}`} style={card.style} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: "Today's Appointments", value: overview.today_appointments, icon: Clipboard, color: "text-pink-400" },
                        { title: "Completed Today", value: overview.today_completed, icon: Activity, color: "text-emerald-400" },
                        { title: "Cancelled Today", value: overview.today_cancelled, icon: XCircle, color: "text-rose-400" },
                        { title: "Pending Today", value: overview.today_pending, icon: Clock, color: "text-amber-400" },
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Patient Metrics Section */}
                {(analyticsSubTab === 'all' || analyticsSubTab === 'patients') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-sky-500" />
                      <h3 className="text-base font-bold text-white">Patient Metrics</h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: "New Patients - Last 24hrs", value: charts.patient_metrics?.new_patients_24h, icon: UserPlus, color: "text-teal-400" },
                        { title: "New Patients - Last 7 days", value: charts.patient_metrics?.new_patients_7d, icon: UserPlus, color: "text-blue-400" },
                        { title: "New Patients - Last 30 days", value: charts.patient_metrics?.new_patients_30d, icon: UserPlus, color: "text-violet-400" },
                        { isSpacer: true },
                        { title: "Active Patients - Last 24hrs", value: charts.patient_metrics?.active_patients_24h, icon: User, color: "text-amber-400" },
                        { title: "Active Patients - Last 7 days", value: charts.patient_metrics?.active_patients_7d, icon: User, color: "text-emerald-400" },
                        { title: "Active Patients - Last 30 days", value: charts.patient_metrics?.active_patients_30d, icon: User, color: "text-fuchsia-400" },
                        { isSpacer: true }
                      ].map((card, i) => {
                        if (card.isSpacer) {
                          return <div key={i} className="hidden lg:block"></div>;
                        }
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="py-2"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart 1: New Patients Over Time */}
                      <div className="glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-[400px]">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">New Patients Over Time</h4>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={charts.patient_charts?.new_patients_over_time}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                              <YAxis stroke="#64748b" fontSize={9} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '10px' }} />
                              <Line type="monotone" dataKey="patients" stroke="#22d3ee" strokeWidth={2} activeDot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Daily Active Patients */}
                      <div className="glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-[400px]">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Daily Active Patients</h4>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={charts.patient_charts?.daily_active_users}>
                              <defs>
                                <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="day" stroke="#64748b" fontSize={9} />
                              <YAxis stroke="#64748b" fontSize={9} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '10px' }} />
                              <Area type="monotone" dataKey="dau" stroke="#d946ef" fillOpacity={1} fill="url(#colorDau)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="py-2"></div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: "New Patients - Current Week", value: charts.patient_metrics?.new_patients_cur_week, icon: UserPlus, color: "text-teal-400" },
                        { title: "New Patients - Previous Week", value: charts.patient_metrics?.new_patients_prev_week, icon: UserPlus, color: "text-blue-400" },
                        { title: "New Patients - Current Month", value: charts.patient_metrics?.new_patients_cur_month, icon: UserPlus, color: "text-violet-400" },
                        { title: "New Patients - Previous Month", value: charts.patient_metrics?.new_patients_prev_month, icon: UserPlus, color: "text-indigo-400" },
                        { title: "Active Patients - Current Week", value: charts.patient_metrics?.active_patients_cur_week, icon: User, color: "text-amber-400" },
                        { title: "Active Patients - Previous Week", value: charts.patient_metrics?.active_patients_prev_week, icon: User, color: "text-emerald-400" },
                        { title: "Active Patients - Current Month", value: charts.patient_metrics?.active_patients_cur_month, icon: User, color: "text-fuchsia-400" },
                        { title: "Active Patients - Previous Month", value: charts.patient_metrics?.active_patients_prev_month, icon: User, color: "text-rose-400" }
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="py-2"></div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: "Returning Patients", value: charts.patient_metrics?.returning_patients, icon: Activity, color: "text-violet-400" },
                        { title: "Avg Appts / Patient", value: charts.patient_metrics?.avg_appointments_per_patient, icon: Clipboard, color: "text-fuchsia-400" },
                        { title: "Average Wait Time", value: `${charts.patient_metrics?.avg_wait_time_min} mins`, icon: Clock, color: "text-amber-400" },
                        { title: "Appointment No-Show Rate", value: `${charts.patient_metrics?.no_show_rate_pct}%`, icon: XCircle, color: "text-rose-400" }
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Doctor Metrics Section */}
                {(analyticsSubTab === 'all' || analyticsSubTab === 'doctors') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-5 w-5 text-emerald-500" />
                      <h3 className="text-base font-bold text-white">Doctor Metrics</h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: "New Doctors - Last 24hrs", value: charts.doctor_metrics?.new_doctors_24h, icon: Users, color: "text-teal-400" },
                        { title: "New Doctors - Last 7 days", value: charts.doctor_metrics?.new_doctors_7d, icon: Users, color: "text-blue-400" },
                        { title: "New Doctors - Last 30 days", value: charts.doctor_metrics?.new_doctors_30d, icon: Users, color: "text-violet-400" },
                        { isSpacer: true },
                        { title: "Active Doctors - Last 24hrs", value: charts.doctor_metrics?.active_doctors_24h, icon: Heart, color: "text-amber-400" },
                        { title: "Active Doctors - Last 7 days", value: charts.doctor_metrics?.active_doctors_7d, icon: Heart, color: "text-emerald-400" },
                        { title: "Active Doctors - Last 30 days", value: charts.doctor_metrics?.active_doctors_30d, icon: Heart, color: "text-fuchsia-400" },
                        { isSpacer: true }
                      ].map((card, i) => {
                        if (card.isSpacer) {
                          return <div key={i} className="hidden lg:block"></div>;
                        }
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="py-2"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart 1: New Doctors Over Time */}
                      <div className="glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-[400px]">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">New Doctors Over Time</h4>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={charts.doctor_charts?.new_doctors_over_time}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                              <YAxis stroke="#64748b" fontSize={9} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '10px' }} />
                              <Line type="monotone" dataKey="doctors" stroke="#10b981" strokeWidth={2} activeDot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Clinical Specialty Demand (Flip Card) */}
                      <div className="flip-card-container h-[400px] w-full">
                        <div className={`flip-card-inner h-full w-full ${isFlipped ? 'flipped' : ''}`}>
                          
                          {/* Front Face: Pie Chart */}
                           <div className="flip-card-front glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-full">
                             <div className="flex flex-col h-full">
                               <div className="flex justify-between items-center mb-2 shrink-0">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Specialty Demand</h4>
                                 <button 
                                   onClick={() => setIsFlipped(true)}
                                   className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 font-semibold px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 transition-all duration-300"
                                 >
                                   More Details
                                 </button>
                               </div>
                               <div className="flex-1 min-h-0 relative">
                                 {pieChartData.length === 0 ? (
                                   <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                                     No active current/future appointments found.
                                   </div>
                                 ) : (
                                   <ResponsiveContainer width="100%" height="100%">
                                     <PieChart>
                                       <Pie
                                         data={pieChartData}
                                         cx="50%"
                                         cy="50%"
                                         labelLine={false}
                                         label={renderCustomizedLabel}
                                         outerRadius={105}
                                         isAnimationActive={false}
                                         fill="#8884d8"
                                         dataKey="count"
                                         nameKey="specialty"
                                         startAngle={90}
                                         endAngle={-270}
                                       >
                                         {pieChartData.map((entry, index) => (
                                           <Cell key={`cell-${index}`} fill={getSpecialtyColor(entry.specialty)} />
                                         ))}
                                       </Pie>
                                       <Tooltip 
                                         contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '10px' }}
                                         formatter={(value) => [value, "Appointments"]}
                                       />
                                     </PieChart>
                                   </ResponsiveContainer>
                                 )}
                               </div>
                             </div>
                           </div>

                           {/* Back Face: Table Details */}
                           <div className="flip-card-back glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-full">
                             <div className="flex flex-col h-full overflow-hidden">
                               <div className="flex justify-between items-center mb-2 shrink-0">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Specialty Demand Details</h4>
                                 <button 
                                   onClick={() => setIsFlipped(false)}
                                   className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 font-semibold px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 transition-all duration-300"
                                 >
                                   Show Chart
                                 </button>
                               </div>
                               
                               <div className="flex-1 overflow-y-auto pr-1">
                                 {fullSpecialtyList.length === 0 ? (
                                   <div className="text-center py-12 text-xs text-slate-400">
                                     No active current/future appointments found.
                                   </div>
                                 ) : (
                                   <table className="w-full text-left text-[13px] text-slate-300">
                                     <thead>
                                       <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                                         <th className="py-2.5">Specialty</th>
                                         <th className="py-2.5 text-center">Appointments</th>
                                         <th className="py-2.5 text-center">Percentage</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {fullSpecialtyList.map((spec, i) => {
                                         const color = getSpecialtyColor(spec.specialty);
                                         return (
                                           <tr key={i} className="border-b border-slate-900/50 hover:bg-slate-900/20">
                                             <td className="py-2.5 flex items-center gap-2 font-medium text-slate-200">
                                               <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                               {spec.specialty}
                                             </td>
                                             <td className="py-2.5 text-center font-bold text-white">{spec.count}</td>
                                             <td className="py-2.5 text-center text-slate-400 font-semibold">{spec.percentage}%</td>
                                           </tr>
                                         );
                                       })}
                                     </tbody>
                                   </table>
                                 )}
                               </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="py-2"></div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      {[
                        { title: "Verified / Pending", value: `${charts.doctor_metrics?.verified_doctors} / ${charts.doctor_metrics?.pending_verification}`, icon: HelpCircle, color: "text-teal-400" },
                        { title: "Doctor Utilization - Avg", value: `${charts.doctor_metrics?.doctor_utilization_avg}%`, icon: Percent, color: "text-indigo-400" },
                        { title: "Avg Appts / Day", value: charts.doctor_metrics?.avg_appointments_per_day, icon: Clipboard, color: "text-pink-400" },
                        { title: "Average Rating", value: `${charts.doctor_metrics?.avg_rating} / 5.0`, icon: Star, color: "text-amber-400" },
                        { title: "Cancellation Rate", value: `${charts.doctor_metrics?.cancellation_rate}%`, icon: XCircle, color: "text-rose-400" }
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="py-2"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart: Doctor Capacity Utilization */}
                      <div className="glass-card rounded-xl p-5 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top Doctor Capacity Utilization (%)</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.doctor_utilization} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 100]} />
                              <YAxis dataKey="doctor" type="category" stroke="#64748b" fontSize={10} width={80} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                              <Bar dataKey="utilization" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {/* Wait Time Insights */}
                      <div className="glass-card rounded-xl p-5 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Real-Time Specialty Wait-Time Predictions</h4>
                        <div className="overflow-y-auto max-h-64 pr-1">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-850 text-slate-400 font-semibold">
                                <th className="py-2.5">Medical Specialty</th>
                                <th className="py-2.5">Waiting</th>
                                <th className="py-2.5">Baseline</th>
                                <th className="py-2.5">Predicted Wait</th>
                              </tr>
                            </thead>
                            <tbody>
                              {charts.wait_time_insights?.map((wt, idx) => (
                                <tr key={idx} className="border-b border-slate-900/30 hover:bg-slate-900/20">
                                  <td className="py-3 font-semibold text-white">{wt.specialty}</td>
                                  <td className="py-3 text-slate-300">{wt.active_patients} patients</td>
                                  <td className="py-3 text-slate-400">{wt.base_wait_min} mins</td>
                                  <td className="py-3 text-fuchsia-400 font-bold">{wt.predicted_wait_min} mins</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Appointment Metrics Section */}
                {(analyticsSubTab === 'all' || analyticsSubTab === 'appointments') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clipboard className="h-5 w-5 text-indigo-400" />
                      <h3 className="text-base font-bold text-white">Appointment Metrics</h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                      {[
                        { title: "Total Bookings", value: charts.appointment_metrics?.total_appointments, icon: Clipboard, color: "text-indigo-400" },
                        { title: "Scheduled", value: charts.appointment_metrics?.scheduled, icon: Calendar, color: "text-sky-400" },
                        { title: "Completed", value: charts.appointment_metrics?.completed, icon: Activity, color: "text-emerald-400" },
                        { title: "Cancelled", value: charts.appointment_metrics?.cancelled, icon: XCircle, color: "text-rose-400" },
                        { title: "Rescheduled", value: charts.appointment_metrics?.rescheduled, icon: TrendingUp, color: "text-amber-400" },
                        { title: "Missed / No-Show", value: charts.appointment_metrics?.missed, icon: HelpCircle, color: "text-slate-400" }
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="py-2"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Peak Booking Hours */}
                      <div className="glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-[400px]">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Peak Appointment Booking Hours</h4>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.peak_hours}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                              <YAxis stroke="#64748b" fontSize={10} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} 
                                cursor={{ fill: 'transparent' }} 
                                active={hoveredPeakHourIndex !== null}
                              />
                              <Bar dataKey="appointments" fill="#ec4899" radius={[4, 4, 0, 0]}>
                                {charts.peak_hours?.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={hoveredPeakHourIndex === index ? "#f472b6" : "#ec4899"}
                                    onMouseEnter={() => setHoveredPeakHourIndex(index)}
                                    onMouseLeave={() => setHoveredPeakHourIndex(null)}
                                    className="cursor-pointer transition-colors duration-200"
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Patient Visit Trends */}
                      <div className="glass-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between h-[400px]">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Weekly Patient Visit Trends</h4>
                        </div>
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={charts.visit_trends}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="week" stroke="#64748b" fontSize={10} />
                              <YAxis stroke="#64748b" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                              <Line type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Casy AI Metrics Section */}
                {(analyticsSubTab === 'all' || analyticsSubTab === 'ai') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-5 w-5 text-orange-500" />
                      <h3 className="text-base font-bold text-white">Casy AI Metrics</h3>
                    </div>

                    {/* Featured Casy Widget */}
                    <div className="glass-card rounded-xl p-5 border border-orange-900/30 bg-gradient-to-r from-orange-950/10 via-slate-900/40 to-slate-950/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0 flex items-center justify-center">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">Casy Today</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 xl:gap-8 shrink-0">
                        {[
                          { label: "Requests Today", val: charts.ai_metrics?.copilot_today?.requests },
                          { label: "Avg Response", val: `${charts.ai_metrics?.copilot_today?.response_time}s` },
                          { label: "Acceptance Rate", val: `${charts.ai_metrics?.copilot_today?.acceptance_rate}%` },
                          { label: "Time Saved", val: `${charts.ai_metrics?.copilot_today?.time_saved_hrs} hrs` }
                        ].map((item, i) => (
                          <div key={i} className="px-4 py-2.5 bg-slate-950/50 border border-slate-900 rounded-lg">
                            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">{item.label}</span>
                            <span className="text-lg font-black text-orange-400">{item.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      {[
                        { title: "Clinical Notes Generated", value: charts.ai_metrics?.clinical_notes_generated, icon: Clipboard, color: "text-sky-400" },
                        { title: "Suggestions Accepted", value: `${charts.ai_metrics?.ai_suggestions_accepted_rate}%`, icon: Percent, color: "text-emerald-400" },
                        { title: "Avg AI Response Time", value: `${charts.ai_metrics?.avg_ai_response_time} sec`, icon: Clock, color: "text-amber-400" },
                        { title: "AI Chat Sessions", value: charts.ai_metrics?.ai_chat_sessions, icon: Bot, color: "text-fuchsia-400" },
                        { title: "AI Diagnoses Generated", value: charts.ai_metrics?.ai_diagnoses_generated, icon: Sparkles, color: "text-indigo-400" },
                        { title: "Average Time Saved", value: `${charts.ai_metrics?.avg_time_saved_hrs} hrs`, icon: Clock, color: "text-violet-400" },
                        { title: "Prediction Accuracy", value: `${charts.ai_metrics?.prediction_accuracy}%`, icon: Percent, color: "text-teal-400" },
                        { title: "Medication Success Rate", value: `${charts.ai_metrics?.medication_reminder_success_rate}%`, icon: Heart, color: "text-rose-400" },
                        { title: "Symptom Checker Usage", value: charts.ai_metrics?.symptom_checker_usage, icon: Users, color: "text-pink-400" },
                        { title: "Escalation Rate", value: `${charts.ai_metrics?.escalation_rate}%`, icon: HelpCircle, color: "text-slate-400" }
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="py-6 px-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{card.title}</span>
                              <span className="text-2xl font-black text-white">{card.value !== undefined ? card.value : '0'}</span>
                            </div>
                            <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}



              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-card rounded-xl p-5 border border-slate-800">
            {/* Single line control bar: Search, Role, Sort By, Sort Order, Delete, Add User */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-slate-900/30 border border-slate-800/80">
              
              {/* Left Group: Search Bar */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, name, or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/30 transition-all"
                />
                {userSearchQuery && (
                  <button 
                    onClick={() => setUserSearchQuery('')} 
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-[10px]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Right Group: Filters, Sort options, Delete and Add User buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Segregation Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Role</span>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-500 cursor-pointer"
                  >
                    <option value="all">All Users</option>
                    <option value="patient">Patients</option>
                    <option value="doctor">Doctors</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sort By</span>
                  <select
                    value={userSortField}
                    onChange={(e) => setUserSortField(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-500 cursor-pointer"
                  >
                    <option value="id">User ID</option>
                    <option value="first_name">First Name</option>
                    <option value="last_name">Last Name</option>
                    <option value="email">Email</option>
                    <option value="created_at">Registration Date</option>
                  </select>
                </div>

                {/* Sort Order button */}
                <button
                  type="button"
                  onClick={() => setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-2 text-slate-400 hover:text-white transition-colors"
                  title={userSortOrder === 'asc' ? "Sort Ascending" : "Sort Descending"}
                >
                  {userSortOrder === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5 text-fuchsia-400" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-fuchsia-400" />
                  )}
                </button>

                {/* Selected counts indicator */}
                {selectedUserIds.length > 0 && (
                  <span className="text-[10px] font-semibold text-fuchsia-400 animate-in fade-in duration-200">
                    {selectedUserIds.length} selected
                  </span>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedUserIds.length === 0}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    selectedUserIds.length === 0
                      ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                      : 'bg-red-500/10 border border-red-500/25 hover:border-red-500/55 text-red-400 hover:bg-red-500 hover:text-white shadow-md'
                  }`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>

                {/* Add User button */}
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="btn-primary-admin py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add User</span>
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="text-xs text-slate-500 py-6 animate-pulse">Loading system user directories...</div>
            ) : usersList.length === 0 ? (
              <div className="text-xs text-slate-500 py-6">No users found.</div>
            ) : (
              <>
                {filteredAndSortedUsers.length === 0 ? (
                  <div className="text-xs text-slate-500 py-8 text-center bg-slate-900/10 border border-slate-800/50 rounded-lg">
                    No users match the search criteria or filter role.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-3 px-4 w-10">
                            <input 
                              type="checkbox"
                              checked={isAllChecked}
                              onChange={handleCheckAll}
                              className="rounded bg-slate-950 border-slate-800 text-fuchsia-500 focus:ring-fuchsia-500/30 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-4">UID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Access Role</th>
                          <th className="py-3 px-4">Registered Date</th>
                          <th className="py-3 px-4">Onboarded Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedUsers.map((usr) => (
                          <tr key={usr.id} className="border-b border-slate-900/60 hover:bg-slate-900/20 text-slate-300">
                            <td className="py-3.5 px-4 w-10">
                              {usr.id !== user?.id ? (
                                <input 
                                  type="checkbox"
                                  checked={selectedUserIds.includes(usr.id)}
                                  onChange={() => handleCheckUser(usr.id)}
                                  className="rounded bg-slate-950 border-slate-800 text-fuchsia-500 focus:ring-fuchsia-500/30 cursor-pointer"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-600 font-semibold" title="Self (Current Account)">Self</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">#{usr.id}</td>
                            <td className="py-3.5 px-4 font-semibold text-white">
                              <button
                                type="button"
                                onClick={() => openEditModal(usr)}
                                className="hover:text-fuchsia-400 hover:underline transition-colors text-left font-semibold focus:outline-none"
                              >
                                {usr.name}
                              </button>
                            </td>
                            <td className="py-3.5 px-4">{usr.email}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                                usr.role === 'patient' ? 'bg-sky-500/10 text-sky-400' :
                                usr.role === 'doctor' ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {usr.role === 'patient' && usr.registered_at ? new Date(usr.registered_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {usr.role === 'doctor' && usr.onboarded_at ? new Date(usr.onboarded_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Edit User Modal Dialog */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex justify-center bg-slate-950/70 backdrop-blur-md p-4 md:p-8 overflow-y-auto">
            <div className="glass-card border border-slate-800 rounded-xl w-full max-w-xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => { setEditingUser(null); setIsCreating(false); }}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 pb-4 border-b border-slate-800 relative flex items-center justify-center min-h-[40px]">
                {!isCreating && (
                  <div className="absolute left-0 text-xs text-slate-400 font-bold">
                    ID: {editingUser.id}
                  </div>
                )}
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-fuchsia-400" />
                  <span>{isCreating ? 'New User Profile' : 'User Profile'}</span>
                </h3>
              </div>

              {saveUserMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs px-4 py-2 mb-4 rounded-lg">
                  {saveUserMessage}
                </div>
              )}
              {saveUserError && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-200 text-xs px-4 py-2 mb-4 rounded-lg">
                  {saveUserError}
                </div>
              )}

              <form onSubmit={handleEditUserSubmit} className="space-y-4" noValidate>
                
                {/* Personal Details Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider">
                    Personal Details
                  </h4>
                  
                  {/* First Name, Last Name, Role (all in one line) */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">First Name</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => {
                          setEditFirstName(e.target.value);
                          clearError('firstName');
                        }}
                        placeholder="First Name"
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none ${
                          errors.firstName ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        }`}
                      />
                      {errors.firstName && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Last Name</label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => {
                          setEditLastName(e.target.value);
                          clearError('lastName');
                        }}
                        placeholder="Last Name"
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none ${
                          errors.lastName ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        }`}
                      />
                      {errors.lastName && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.lastName}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Access Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => {
                          setEditRole(e.target.value);
                          clearError('role');
                        }}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer ${
                          errors.role ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        } ${!editRole ? 'text-white/40' : 'text-white'}`}
                      >
                        <option value="" disabled className="text-slate-500">Choose Role</option>
                        <option value="patient" className="text-white bg-slate-950">Patient</option>
                        <option value="doctor" className="text-white bg-slate-950">Doctor</option>
                        <option value="admin" className="text-white bg-slate-950">Admin</option>
                      </select>
                      {errors.role && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.role}</p>
                      )}
                    </div>
                  </div>

                  {/* Email & Phone in the same line */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => {
                          setEditEmail(e.target.value);
                          clearError('email');
                        }}
                        placeholder="user@example.com"
                        className={`w-full bg-slate-950 border rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none ${
                          errors.email ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        }`}
                      />
                      {errors.email && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => {
                          handleEditPhoneChange(e);
                          clearError('phone');
                        }}
                        placeholder={editRole === 'admin' ? "Not required for Admin" : "123-456-7890"}
                        maxLength={12}
                        disabled={editRole === 'admin'}
                        className={`w-full bg-slate-950 border rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                          errors.phone ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        }`}
                      />
                      {errors.phone && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Specialties container with smooth transition for Doctor */}
                  <div 
                    className={`transition-all duration-500 ease-in-out ${
                      editRole === 'doctor' 
                        ? 'max-h-32 opacity-100 mt-4 overflow-visible' 
                        : 'max-h-0 opacity-0 mt-0 overflow-hidden pointer-events-none'
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-4">
                      {/* Primary Specialty (1/3 width -> col-span-4) */}
                      <div className="col-span-4 space-y-1">
                        <label className="text-xs text-slate-400 font-medium">Primary Specialty</label>
                        <select
                          value={editPrimarySpecialty}
                          onChange={(e) => {
                            setEditPrimarySpecialty(e.target.value);
                            clearError('primarySpecialty');
                          }}
                          className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer ${
                            errors.primarySpecialty ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                          } ${!editPrimarySpecialty ? 'text-white/40' : 'text-white'}`}
                        >
                          <option value="" disabled className="text-slate-500">Choose One</option>
                          {specialties.map((s) => (
                            <option key={s.id} value={s.id} className="text-white bg-slate-950">{s.name}</option>
                          ))}
                        </select>
                        {errors.primarySpecialty && (
                          <p className="text-[10px] text-red-400 font-medium mt-1">{errors.primarySpecialty}</p>
                        )}
                      </div>

                      {/* Other Specialties Dropdown & Pills (2/3 width -> col-span-8) */}
                      <div className="col-span-8 space-y-1">
                        <label className="text-xs text-slate-400 font-medium">Other Specialties</label>
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-6">
                            <select
                              value=""
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const selectedSpec = specialties.find(s => s.id === val);
                                if (selectedSpec && editSecondarySpecialties.length < 3) {
                                  setEditSecondarySpecialties(prev => [...prev, selectedSpec]);
                                }
                              }}
                              disabled={editSecondarySpecialties.length >= 3}
                              className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-fuchsia-500 cursor-pointer ${
                                editSecondarySpecialties.length >= 3 
                                  ? 'opacity-50 cursor-not-allowed text-slate-500' 
                                  : 'text-white/40'
                              }`}
                            >
                              <option value="" className="text-slate-500">
                                {editSecondarySpecialties.length >= 3 ? 'Max Selected' : 'Choose Specialty'}
                              </option>
                              {specialties
                                .filter(s => 
                                  s.id !== Number(editPrimarySpecialty) &&
                                  !editSecondarySpecialties.some(sec => sec.id === s.id)
                                )
                                .map(s => (
                                  <option key={s.id} value={s.id} className="text-white bg-slate-950">{s.name}</option>
                                ))
                              }
                            </select>
                          </div>
                          
                          {/* Pills next to it on the side */}
                          <div className="col-span-6 flex flex-wrap gap-1.5 pt-0.5">
                            {editSecondarySpecialties.map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center gap-1 bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400 text-[10px] font-semibold px-2 py-0.5 rounded-full animate-in fade-in zoom-in duration-100"
                              >
                                {s.name}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSecondarySpecialty(s.id)}
                                  className="hover:text-red-400 transition-colors focus:outline-none"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Address Section with transition (hidden for admin) */}
                <div 
                  className={`transition-all duration-500 ease-in-out ${
                    editRole === 'patient' || editRole === 'doctor'
                      ? 'max-h-[500px] opacity-100 pt-4 border-t border-slate-800 space-y-4 overflow-visible' 
                      : 'max-h-0 opacity-0 pt-0 border-t-0 overflow-hidden pointer-events-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider">Address Details</h4>
                  </div>
                  
                  {/* Clinic field (only for Doctor, transitions smoothly) */}
                  <div 
                    className={`transition-all duration-500 ease-in-out ${
                      editRole === 'doctor' 
                        ? 'max-h-96 opacity-100 overflow-visible' 
                        : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'
                    }`}
                  >
                    <div className="space-y-1 relative clinic-dropdown-container">
                      <label className="text-xs text-slate-400 font-medium">Clinic</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search Clinic by Name or ID..."
                          value={clinicSearchQuery}
                          onFocus={() => setShowClinicDropdown(true)}
                          onClick={() => setShowClinicDropdown(true)}
                          onChange={(e) => {
                            setClinicSearchQuery(e.target.value);
                            setShowClinicDropdown(true);
                            clearError('clinic');
                          }}
                          className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none ${
                            errors.clinic ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                          }`}
                        />
                        {errors.clinic && (
                          <p className="text-[10px] text-red-400 font-medium mt-1">{errors.clinic}</p>
                        )}
                        {showClinicDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {(() => {
                              const query = clinicSearchQuery.toLowerCase();
                              const filtered = clinics.filter(c => 
                                c.name.toLowerCase().includes(query) ||
                                String(c.id).includes(query) ||
                                (c.street_address_1 && c.street_address_1.toLowerCase().includes(query)) ||
                                (c.street_address_2 && c.street_address_2.toLowerCase().includes(query)) ||
                                (c.city && c.city.toLowerCase().includes(query)) ||
                                (c.state && c.state.toLowerCase().includes(query)) ||
                                (c.zip_code && String(c.zip_code).includes(query)) ||
                                (c.county && c.county.toLowerCase().includes(query))
                              );
                              if (filtered.length === 0) {
                                return <div className="px-3 py-2 text-xs text-slate-500">No matching clinics found</div>;
                              }
                              return filtered.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleSelectClinic(c)}
                                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-900 transition-colors border-b border-slate-900 last:border-b-0"
                                >
                                  {c.id} - {c.name}
                                </button>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Street Address 1 (2/3 width -> col-span-8) and Street Address 2 (1/3 width -> col-span-4) */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8 space-y-1 relative address-dropdown-container">
                      <label className="text-xs text-slate-400 font-medium">Street Address 1</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editStreet1}
                          onFocus={() => {
                            if (editRole === 'patient') {
                              setShowAddressDropdown(true);
                            }
                          }}
                          onClick={() => {
                            if (editRole === 'patient') {
                              setShowAddressDropdown(true);
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditStreet1(val);
                            clearError('street1');
                            if (editRole === 'patient') {
                              setShowAddressDropdown(true);
                              
                              currentSearchQueryRef.current = val;
                              if (addressTimeoutRef.current) {
                                clearTimeout(addressTimeoutRef.current);
                              }
                              addressTimeoutRef.current = setTimeout(() => {
                                fetchAddressSuggestions(val);
                              }, 300);
                            }
                          }}
                          placeholder=""
                          disabled={editRole === 'admin' || editRole === 'doctor'}
                          className={`w-full bg-slate-950 border rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                            errors.street1 ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                          }`}
                        />
                        {errors.street1 && (
                          <p className="text-[10px] text-red-400 font-medium mt-1">{errors.street1}</p>
                        )}
                        {showAddressDropdown && editStreet1.trim() !== '' && editRole === 'patient' && (
                          <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {/* API Source Indicator Header */}
                            <div className="px-3 py-1.5 text-[9px] text-slate-500 bg-slate-900/60 border-b border-slate-900 flex justify-between items-center select-none">
                              <span>Address Search</span>
                              <span className={`font-semibold ${googleMapsLoaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {googleMapsLoaded ? 'Google Places API' : 'OSM Fallback (No Key)'}
                              </span>
                            </div>
                            {editStreet1.trim().length < 3 ? (
                              <div className="px-3 py-2 text-xs text-slate-500">Type at least 3 characters to search...</div>
                            ) : loadingAddresses ? (
                              <div className="px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
                                <svg className="animate-spin h-3 w-3 text-fuchsia-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Searching real-world addresses...
                              </div>
                            ) : realAddresses.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-500">No matching US addresses found</div>
                            ) : (
                              realAddresses.map((addr, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleSelectAddress(addr)}
                                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-900 transition-colors border-b border-slate-900 last:border-b-0"
                                >
                                  {addr.displayText}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-4 space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Street Address 2 (optional)</label>
                      <input
                        type="text"
                        value={editStreet2}
                        onChange={(e) => setEditStreet2(e.target.value)}
                        placeholder=""
                        disabled={editRole === 'admin' || editRole === 'doctor'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none focus:border-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* City, State, Zip Code, and County (all in one line) */}
                  <div className="grid grid-cols-12 gap-4">
                    {/* City */}
                    <div className="col-span-4 space-y-1">
                      <label className="text-xs text-slate-400 font-medium">City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => {
                          setEditCity(e.target.value);
                          clearError('city');
                        }}
                        placeholder=""
                        disabled={editRole === 'admin' || editRole === 'doctor'}
                        className={`w-full bg-slate-950 border rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                          errors.city ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        }`}
                      />
                      {errors.city && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.city}</p>
                      )}
                    </div>
                    
                    {/* State */}
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-400 font-medium">State</label>
                      <select
                        value={editState}
                        onChange={(e) => {
                          setEditState(e.target.value);
                          clearError('state');
                        }}
                        disabled={editRole === 'admin' || editRole === 'doctor'}
                        className={`w-full bg-slate-950 border rounded-lg px-2 py-2 text-xs focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          errors.state ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        } ${!editState ? 'text-white/40' : 'text-white'}`}
                      >
                        <option value="" disabled className="text-slate-500">State</option>
                        {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'].map((st) => (
                          <option key={st} value={st} className="text-white bg-slate-950">{st}</option>
                        ))}
                      </select>
                      {errors.state && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.state}</p>
                      )}
                    </div>

                    {/* Zip Code */}
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Zip Code</label>
                      <input
                        type="text"
                        value={editZip}
                        onChange={(e) => {
                          setEditZip(e.target.value);
                          clearError('zip');
                        }}
                        placeholder=""
                        disabled={editRole === 'admin' || editRole === 'doctor'}
                        className={`w-full bg-slate-950 border rounded-lg px-2 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                          errors.zip ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        }`}
                      />
                      {errors.zip && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.zip}</p>
                      )}
                    </div>

                    {/* County */}
                    <div className="col-span-4 space-y-1">
                      <label className="text-xs text-slate-400 font-medium">County</label>
                      <input
                        type="text"
                        value={editCounty}
                        onChange={(e) => {
                          setEditCounty(e.target.value);
                          clearError('county');
                        }}
                        placeholder=""
                        disabled={editRole === 'admin' || editRole === 'doctor'}
                        className={`w-full bg-slate-950 border rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                          errors.county ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                        }`}
                      />
                      {errors.county && (
                        <p className="text-[10px] text-red-400 font-medium mt-1">{errors.county}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Password Section */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h4 className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider">
                    Account Password
                  </h4>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">
                      {isCreating ? 'Enter Password' : 'New Password (leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => {
                        setEditPassword(e.target.value);
                        clearError('password');
                      }}
                      placeholder=""
                      className={`w-full bg-slate-950 border rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500/40 focus:outline-none ${
                        errors.password ? 'border-red-500/85 focus:border-red-500' : 'border-slate-800 focus:border-fuchsia-500'
                      }`}
                    />
                    {errors.password && (
                      <p className="text-[10px] text-red-400 font-medium mt-1">{errors.password}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setEditingUser(null); setIsCreating(false); }}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser || (isCreating && !editRole)}
                    className="btn-primary-admin py-2.5 px-6 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {savingUser ? 'Saving...' : isCreating ? 'Register User' : 'Save Settings'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-6">
            
            {/* Manage Clinics */}
            <div className="glass-card rounded-xl p-5 border border-slate-800 space-y-6">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building className="h-5 w-5 text-fuchsia-400" />
                <span>Register Clinics</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Clinic Form */}
                <form onSubmit={handleCreateClinic} className="space-y-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Clinic Name</label>
                      <input
                        type="text"
                        required
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="CareSync South Family Clinic"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1 relative clinic-address-dropdown-container">
                      <label className="text-[10px] text-slate-400 font-medium">Street Address 1</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={clinicStreet1}
                          onFocus={() => setShowClinicAddressDropdown(true)}
                          onClick={() => setShowClinicAddressDropdown(true)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClinicStreet1(val);
                            setShowClinicAddressDropdown(true);
                            
                            clinicAddressSearchQueryRef.current = val;
                            if (clinicAddressTimeoutRef.current) {
                              clearTimeout(clinicAddressTimeoutRef.current);
                            }
                            clinicAddressTimeoutRef.current = setTimeout(() => {
                              fetchClinicAddressSuggestions(val);
                            }, 300);
                          }}
                          placeholder="120 Sunset Blvd"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                        />
                        {showClinicAddressDropdown && clinicStreet1.trim() !== '' && (
                          <div className="absolute z-50 w-full mt-1 bg-slate-950 border border-slate-800 rounded shadow-xl max-h-48 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[9px] text-slate-500 bg-slate-900/60 border-b border-slate-900 flex justify-between items-center select-none">
                              <span>Address Search</span>
                              <span className={`font-semibold ${googleMapsLoaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {googleMapsLoaded ? 'Google Places API' : 'OSM Fallback (No Key)'}
                              </span>
                            </div>
                            {clinicStreet1.trim().length < 3 ? (
                              <div className="px-3 py-2 text-xs text-slate-500">Type at least 3 characters to search...</div>
                            ) : loadingClinicAddresses ? (
                              <div className="px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
                                <svg className="animate-spin h-3 w-3 text-fuchsia-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Searching real-world addresses...
                              </div>
                            ) : clinicRealAddresses.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-500">No matching US addresses found</div>
                            ) : (
                              clinicRealAddresses.map((addr, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleSelectClinicAddress(addr)}
                                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-900 transition-colors border-b border-slate-900 last:border-b-0"
                                >
                                  {addr.displayText}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Street Address 2 (Optional)</label>
                      <input
                        type="text"
                        value={clinicStreet2}
                        onChange={(e) => setClinicStreet2(e.target.value)}
                        placeholder="Suite 300"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">City</label>
                        <input
                          type="text"
                          required
                          value={clinicCity}
                          onChange={(e) => setClinicCity(e.target.value)}
                          placeholder="Miami"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">County</label>
                        <input
                          type="text"
                          required
                          value={clinicCounty}
                          onChange={(e) => setClinicCounty(e.target.value)}
                          placeholder="Miami-Dade"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">State</label>
                        <select
                          value={clinicState}
                          onChange={(e) => setClinicState(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white cursor-pointer"
                        >
                          {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'].map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">Zip Code</label>
                        <input
                          type="text"
                          required
                          value={clinicZip}
                          onChange={(e) => setClinicZip(e.target.value)}
                          placeholder="33101"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Phone</label>
                      <input
                        type="text"
                        value={clinicPhone}
                        onChange={(e) => setClinicPhone(e.target.value)}
                        placeholder="555-0199"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full btn-primary-admin py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Register Clinic</span>
                    </button>
                  </div>
                </form>

                {/* Clinics list */}
                <div className="flex flex-col h-full">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">Registered Locations ({clinics.length})</h4>
                  <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[510px]">
                    {clinics.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-lg flex items-center justify-between gap-4">
                        <div className="text-xs min-w-0">
                          <div className="font-semibold text-white truncate">{c.name}</div>
                          <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono text-slate-600">ID #{c.id}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClinic(c.id)}
                            className="text-slate-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-all"
                            title="Delete clinic and associated doctors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Manage Specialties */}
            <div className="glass-card rounded-xl p-5 border border-slate-800 space-y-6">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-fuchsia-400" />
                <span>Register Specialties</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Specialty Form */}
                <form onSubmit={handleCreateSpecialty} className="space-y-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Specialty Name</label>
                      <input
                        type="text"
                        required
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        placeholder="Psychiatry"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-medium">Description</label>
                      <textarea
                        rows="4"
                        value={specDesc}
                        onChange={(e) => setSpecDesc(e.target.value)}
                        placeholder="Care for mental health conditions, cognitive therapies..."
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white resize-none"
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full btn-primary-admin py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Register Specialty</span>
                    </button>
                  </div>
                </form>

                {/* Specialties list */}
                <div className="flex flex-col h-full">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">Registered Specialties ({specialties.length})</h4>
                  <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[270px]">
                    {specialties.map((s) => (
                      <div key={s.id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-lg flex items-center justify-between gap-4">
                        <div className="text-xs min-w-0">
                          <div className="font-semibold text-white truncate">{s.name}</div>
                          <div className="text-slate-500 text-[10px] truncate max-w-xs">{s.description}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono text-slate-600">ID #{s.id}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSpecialty(s.id)}
                            className="text-slate-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-all"
                            title="Delete specialty"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="glass-card rounded-xl p-6 md:p-8 border border-slate-800">
              <h3 className="text-lg font-bold text-white mb-6">Admin Profile Settings</h3>
              
              {profileMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs px-4 py-2 mb-4 rounded-lg">
                  {profileMessage}
                </div>
              )}
              {profileError && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-200 text-xs px-4 py-2 mb-4 rounded-lg">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Avatar section */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-slate-900/30 border border-slate-800">
                  {adminProfilePicPreview ? (
                    <img 
                      src={adminProfilePicPreview} 
                      alt="Avatar Preview" 
                      onClick={() => setIsEnlargedAvatarOpen(true)}
                      className="h-16 w-16 rounded-full object-cover border-2 border-fuchsia-500/30 shrink-0 cursor-pointer hover:scale-105 transition-all duration-200" 
                      onError={() => setAdminProfilePicPreview('')} 
                      title="Click to enlarge"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-fuchsia-400 font-bold text-lg shrink-0">
                      {adminName ? adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Upload Profile Picture (JPG/PNG)</label>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      onChange={handleFileChange} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-fuchsia-500/10 file:text-fuchsia-400 hover:file:bg-fuchsia-500/20 file:cursor-pointer cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Administrative Display Name</label>
                    <input 
                      type="text" 
                      required 
                      value={adminName} 
                      onChange={(e) => setAdminName(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Email Address (Cannot be changed)</label>
                    <input 
                      type="email" 
                      disabled 
                      value={adminEmail} 
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-400 cursor-not-allowed opacity-60 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h4 className="text-sm font-semibold text-white">Change Password</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Old Password</label>
                      <input 
                        type="password" 
                        value={adminOldPassword} 
                        onChange={(e) => setAdminOldPassword(e.target.value)} 
                        placeholder="Enter old password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">New Password</label>
                      <input 
                        type="password" 
                        value={adminNewPassword} 
                        onChange={(e) => setAdminNewPassword(e.target.value)} 
                        placeholder="Enter new password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={adminConfirmPassword} 
                        onChange={(e) => setAdminConfirmPassword(e.target.value)} 
                        placeholder="Confirm new password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={savingProfile} 
                  className="w-full btn-primary-admin py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving updates...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Enlarged Avatar Modal */}
      {isEnlargedAvatarOpen && adminProfilePicPreview && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-4">
          <div className="relative max-w-sm w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setIsEnlargedAvatarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="h-6 w-6" />
            </button>
            <h4 className="text-sm font-semibold text-slate-350 mb-4 uppercase tracking-wider">Profile Picture Preview</h4>
            <img 
              src={adminProfilePicPreview} 
              alt="Enlarged Avatar" 
              className="w-64 h-64 rounded-full object-cover border border-fuchsia-500/30 shadow-lg shadow-fuchsia-500/10 mb-4" 
            />
            <button
              onClick={() => setIsEnlargedAvatarOpen(false)}
              className="w-full btn-secondary py-2 text-xs font-semibold rounded-lg"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
