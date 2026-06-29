import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Activity, LogOut, Search, Calendar, Clock, Sparkles, Send, 
  MapPin, DollarSign, CalendarCheck, CheckCircle2, XCircle, RefreshCw, MessageSquare, Star,
  ArrowRight, Bell, User, Home, HelpCircle, ChevronLeft, ChevronRight, Info, CheckCircle,
  Building, Phone
} from 'lucide-react';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  
  // Search doctors
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Doctor Location Search states
  const [locationQuery, setLocationQuery] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [useGps, setUseGps] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Clinic Search states
  const [clinicsList, setClinicsList] = useState([]);
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [clinicLocationQuery, setClinicLocationQuery] = useState('');
  const [useGpsForClinics, setUseGpsForClinics] = useState(false);
  const [loadingClinics, setLoadingClinics] = useState(false);

  // Book Appointment
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00:00');
  const [noShowRisk, setNoShowRisk] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  
  // Book Appointment updates
  const [bookedSlots, setBookedSlots] = useState([]);
  const [doctorAvailabilities, setDoctorAvailabilities] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // History & Notifications
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'book', 'appointments', 'symptom-matcher', 'profile'

  // Help drawer state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Selected appointment details modal state
  const [selectedAppt, setSelectedAppt] = useState(null);

  // AI Symptom Matcher
  const [symptomsInput, setSymptomsInput] = useState('');
  const [matchingResult, setMatchingResult] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  // Chatbot
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am Casy, your CareSync AI health assistant. What questions or symptoms can I help you with today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Feedback
  const [feedbackApptId, setFeedbackApptId] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');

  // Alerts Drawer state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Developer Guide state
  const [isDeveloperGuideOpen, setIsDeveloperGuideOpen] = useState(false);

  // Profile fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [isEnlargedAvatarOpen, setIsEnlargedAvatarOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const { reloadUser } = useAuth();

  useEffect(() => {
    if (user) {
      setAvatarError(false);
      setEmail(user.email || '');
      setProfilePic(user.profile_picture || '');
      setProfilePicPreview(user.profile_picture || '');
      if (user.patient_profile) {
        setFirstName(user.patient_profile.first_name || '');
        setLastName(user.patient_profile.last_name || '');
        setPhone(user.patient_profile.phone || '');
        setDob(user.patient_profile.date_of_birth || '');
        setGender(user.patient_profile.gender || 'Male');
      }
    }
  }, [user]);

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');

    if (newPassword) {
      if (!oldPassword) {
        setProfileError("Old password is required to change password");
        setSavingProfile(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError("New passwords do not match");
        setSavingProfile(false);
        return;
      }
      if (newPassword.length < 6) {
        setProfileError("New password must be at least 6 characters long");
        setSavingProfile(false);
        return;
      }
    }

    try {
      await API.put('/api/patient/profile', {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        date_of_birth: dob || null,
        gender: gender,
        profile_picture: profilePic,
        old_password: oldPassword || undefined,
        new_password: newPassword || undefined
      });
      setProfileMessage('Your profile settings have been updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await reloadUser();
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile settings.');
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
        setProfilePic(reader.result); // Base64 data URL
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Load doctor availability and booked slots when doctor selected
  useEffect(() => {
    if (bookingDoctor) {
      loadDoctorAvailabilityAndBookedSlots(bookingDoctor.id);
      setCalendarMonth(new Date());
      setBookingDate('');
      setBookingTime('');
    }
  }, [bookingDoctor]);

  const loadDoctorAvailabilityAndBookedSlots = async (docId) => {
    try {
      const [availRes, slotsRes] = await Promise.all([
        API.get(`/api/patient/doctors/${docId}/availability`),
        API.get(`/api/patient/doctors/${docId}/booked-slots`)
      ]);
      setDoctorAvailabilities(availRes.data);
      setBookedSlots(slotsRes.data);
    } catch (err) {
      console.error("Error loading doctor availability or booked slots", err);
    }
  };

  const getMinMaxDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    maxDate.setHours(23, 59, 59, 999);

    return { today, maxDate };
  };

  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    const { today, maxDate } = getMinMaxDates();

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        disabled: true
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const compareDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      const isPast = compareDate < today;
      const isTooFuture = compareDate > maxDate;
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        disabled: isPast || isTooFuture
      });
    }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const dayDate = new Date(year, month + 1, i);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        disabled: true
      });
    }

    return days;
  };

  const getSlotsForSelectedDate = () => {
    if (!bookingDate || !bookingDoctor) return [];
    
    const parts = bookingDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const selectedDateObj = new Date(year, month, day);
    const dayOfWeek = selectedDateObj.getDay();

    const matchingAvails = doctorAvailabilities.filter(av => av.day_of_week === dayOfWeek && av.is_active);
    if (matchingAvails.length === 0) return [];

    const slots = [];
    const now = new Date();

    matchingAvails.forEach(av => {
      const startHour = parseInt(av.start_time.split(':')[0], 10);
      const endHour = parseInt(av.end_time.split(':')[0], 10);

      for (let h = startHour; h < endHour; h++) {
        const timeStr = `${String(h).padStart(2, '0')}:00:00`;
        
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        const displayStr = `${String(displayHour).padStart(2, '0')}:00 ${ampm}`;

        const isBooked = bookedSlots.some(bs => {
          return bs.appointment_date === bookingDate && bs.start_time === timeStr;
        });

        let isPast = false;
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (bookingDate === todayStr) {
          if (h <= now.getHours()) {
            isPast = true;
          }
        }

        const patientConflict = appointments.some(appt => {
          return appt.appointment_date === bookingDate && appt.start_time === timeStr && appt.status !== 'cancelled';
        });

        slots.push({
          timeValue: timeStr,
          timeLabel: displayStr,
          available: !isBooked && !isPast && !patientConflict
        });
      }
    });

    return slots;
  };

  const formatTime12hr = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = hours < 10 ? `0${hours}` : hours;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  // Load basic configurations
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [specRes, clinicRes] = await Promise.all([
          API.get('/api/patient/specialties'),
          API.get('/api/patient/clinics')
        ]);
        setSpecialties(specRes.data);
        setClinics(clinicRes.data);
      } catch (err) {
        console.error("Config load error:", err);
      }
    };
    loadConfig();
    loadAppointments();
    loadNotifications();
  }, []);

  // Run doctor search when filters change
  useEffect(() => {
    searchDoctors();
  }, [selectedSpecialty, selectedClinic, searchQuery, locationQuery, gpsCoords, useGps]);

  const searchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const params = {
        specialty_id: selectedSpecialty || undefined,
        clinic_id: selectedClinic || undefined,
        search: searchQuery || undefined,
        location_query: locationQuery || undefined
      };
      if (useGps && gpsCoords) {
        params.lat = gpsCoords.lat;
        params.lng = gpsCoords.lng;
      }
      const res = await API.get('/api/patient/doctors', { params });
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const searchClinics = async () => {
    setLoadingClinics(true);
    try {
      const params = {
        search: clinicSearchQuery || undefined,
        location_query: clinicLocationQuery || undefined
      };
      if (useGpsForClinics && gpsCoords) {
        params.lat = gpsCoords.lat;
        params.lng = gpsCoords.lng;
      }
      const res = await API.get('/api/patient/clinics-search', { params });
      setClinicsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClinics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'clinics-search') {
      searchClinics();
    }
  }, [activeTab, clinicSearchQuery, clinicLocationQuery, useGpsForClinics, gpsCoords]);

  useEffect(() => {
    if (bookingDoctor && bookingDate && bookingTime) {
      predictNoShowRisk();
    }
  }, [bookingDate, bookingTime, bookingDoctor]);

  const handleDetectLocation = () => {
    if (useGps) {
      setUseGps(false);
      setGpsCoords(null);
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setUseGps(true);
        setGpsLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to obtain GPS coordinates. Falling back to textual location filters.");
        setUseGps(false);
        setGpsLoading(false);
      }
    );
  };

  const toggleGpsForClinics = () => {
    if (useGpsForClinics) {
      setUseGpsForClinics(false);
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setUseGpsForClinics(true);
        setGpsLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to obtain GPS coordinates. Falling back to textual location filters.");
        setUseGpsForClinics(false);
        setGpsLoading(false);
      }
    );
  };

  const loadAppointments = async () => {
    try {
      const res = await API.get('/api/patient/appointments');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await API.get('/api/patient/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const predictNoShowRisk = async () => {
    setRiskLoading(true);
    try {
      const res = await API.get('/api/ai/predict-no-show', {
        params: {
          patient_id: user.id,
          doctor_id: bookingDoctor.id,
          appt_date: bookingDate,
          start_time: bookingTime
        }
      });
      setNoShowRisk(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRiskLoading(false);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingError('');
    try {
      await API.post('/api/patient/appointments', {
        doctor_id: bookingDoctor.id,
        appointment_date: bookingDate,
        start_time: bookingTime
      });
      setBookingDoctor(null);
      setBookingDate('');
      setNoShowRisk(null);
      loadAppointments();
      loadNotifications();
      setActiveTab('appointments');
    } catch (err) {
      setBookingError(err.response?.data?.detail || "Booking failed. Slot may not be available.");
    }
  };

  const cancelAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await API.post(`/api/patient/appointments/${apptId}/cancel`);
      loadAppointments();
      loadNotifications();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel appointment");
    }
  };

  const handleSymptomMatch = async (e) => {
    e.preventDefault();
    if (!symptomsInput.trim()) return;
    setLoadingMatch(true);
    setMatchingResult(null);
    try {
      const res = await API.post('/api/ai/recommend-specialty', { symptoms: symptomsInput });
      setMatchingResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatch(false);
    }
  };

  const filterToRecommendedSpecialty = (specName) => {
    const spec = specialties.find(s => s.name.toLowerCase() === specName.toLowerCase());
    if (spec) {
      setSelectedSpecialty(spec.id);
      setActiveTab('book');
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const res = await API.post('/api/ai/chat', { messages: newMessages });
      setChatMessages([...newMessages, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/api/patient/appointments/${feedbackApptId}/feedback`, {
        rating: feedbackRating,
        comments: feedbackComments
      });
      setFeedbackApptId(null);
      setFeedbackComments('');
      loadAppointments();
    } catch (err) {
      alert("Failed to submit feedback");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.post('/api/patient/notifications/read');
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await API.post(`/api/patient/notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleNotificationAction = async (notif) => {
    if (!notif.is_read) {
      await handleMarkSingleRead(notif.id);
    }
    setIsNotificationsOpen(false);
    setActiveTab('appointments');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row bg-radial-glow">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/40 border-b md:border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <Activity className="h-6 w-6 text-sky-400" />
            <span className="font-extrabold text-white text-lg">CareSync <span className="text-sky-400">AI</span></span>
          </div>

          {/* User profile */}
          <div 
            onClick={() => setActiveTab('profile')}
            className={`p-4 rounded-xl border mb-6 flex items-center gap-3 cursor-pointer hover:bg-slate-800/40 active:scale-95 transition-all ${
              activeTab === 'profile' 
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' 
                : 'border-slate-800 bg-slate-800/20'
            }`}
          >
            {user?.profile_picture && !avatarError ? (
              <img 
                src={user.profile_picture} 
                alt="Avatar" 
                className="h-10 w-10 rounded-full object-cover border border-sky-500/30 shrink-0" 
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold shrink-0">
                {user?.patient_profile ? `${user.patient_profile.first_name[0]}${user.patient_profile.last_name[0]}`.toUpperCase() : 'CS'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider mb-0.5">Patient Portal</div>
              <div className="font-semibold text-white text-sm truncate">
                {user?.patient_profile ? `${user.patient_profile.first_name} ${user.patient_profile.last_name}` : 'CareSync Patient'}
              </div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'book', label: 'Search Doctors', icon: Search },
              { id: 'clinics-search', label: 'Search Clinics', icon: Building },
              { id: 'appointments', label: 'My Appointments', icon: Calendar },
              { id: 'symptom-matcher', label: 'Ask Casy', icon: Sparkles }
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none border ${
                    activeTab === nav.id 
                      ? 'bg-sky-500/15 border-sky-500/20 text-sky-300' 
                      : 'border-sky-500/0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Local Run Instructions Helper */}
          <div className="mt-8 pt-4 border-t border-slate-900">
            <button
              onClick={() => setIsDeveloperGuideOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-semibold text-sky-400 hover:bg-slate-850 transition-all active:scale-[0.98]"
            >
              <Info className="h-4 w-4 shrink-0" />
              <span>Developer Guide</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {activeTab === 'home' && 'Home'}
              {activeTab === 'book' && 'Search Doctors'}
              {activeTab === 'clinics-search' && 'Search Clinics'}
              {activeTab === 'appointments' && 'My Appointments'}
              {activeTab === 'symptom-matcher' && 'Ask Casy'}
              {activeTab === 'profile' && 'Patient Profile Settings'}
            </h2>
            <p className="text-xs text-slate-400">Welcome back! Manage your healthcare schedule and insights.</p>
          </div>
          
          {/* Help, Notifications & Sign Out */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 text-xs text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/20 transition-all font-medium shadow-sm"
              title="AI Chat Assistant"
            >
              <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
              <span>Help</span>
            </button>
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 text-xs text-sky-400 hover:text-sky-300 font-semibold transition-all shadow-sm"
              title="View System Alerts"
            >
              {notifications.some(n => !n.is_read) && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
              )}
              <span>{notifications.filter(n => !n.is_read).length} Unread Alerts</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-medium shadow-sm"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Screens */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900/40 to-slate-900/40 border border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  Welcome Back, <span className="text-sky-400">{user?.patient_profile ? `${user.patient_profile.first_name}` : 'Patient'}</span>!
                </h1>
                <p className="text-sm text-slate-350 max-w-md">
                  Your health and wellness is our priority. Monitor your vitals, upcoming visits, and consult medical notes below.
                </p>
                <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Insurance Verified</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 border border-sky-500/25 text-sky-400">
                    <Activity className="h-3.5 w-3.5" />
                    <span>CareSync AI Assured</span>
                  </span>
                </div>
              </div>
              
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 w-full md:w-auto shrink-0">
                <div className="glass-card p-4 rounded-xl text-center min-w-[90px] border border-slate-800 bg-slate-950/40">
                  <div className="text-2xl font-black text-white">{appointments.length}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Bookings</div>
                </div>
                <div className="glass-card p-4 rounded-xl text-center min-w-[90px] border border-slate-800 bg-slate-950/40">
                  <div className="text-2xl font-black text-sky-400">{appointments.filter(a => a.status === 'scheduled').length}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Upcoming</div>
                </div>
                <div className="glass-card p-4 rounded-xl text-center min-w-[90px] border border-slate-800 bg-slate-950/40">
                  <div className="text-2xl font-black text-emerald-400">{appointments.filter(a => a.status === 'completed').length}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Completed</div>
                </div>
              </div>
            </div>

            {/* Next Appointment Alert */}
            {appointments.filter(a => a.status === 'scheduled').length > 0 && (() => {
              const scheduled = appointments.filter(a => a.status === 'scheduled');
              const sorted = [...scheduled].sort((a, b) => {
                const dateA = new Date(`${a.appointment_date}T${a.start_time}`);
                const dateB = new Date(`${b.appointment_date}T${b.start_time}`);
                return dateA - dateB;
              });
              const nextAppt = sorted[0];
              return (
                <div className="p-5 rounded-xl bg-sky-500/5 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                      <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-0.5">NEXT UPCOMING VISIT</div>
                      <h3 className="font-bold text-white text-base truncate">Dr. {nextAppt.doctor.first_name} {nextAppt.doctor.last_name}</h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1">
                        <span className="font-semibold text-sky-400">{nextAppt.doctor.specialty_name}</span>
                        <span className="text-slate-650">•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-slate-550" />
                          <span>{nextAppt.appointment_date}</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-555" />
                          <span>{formatTime12hr(nextAppt.start_time)}</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-slate-400 truncate max-w-[150px]" title={nextAppt.doctor.clinic_name}>
                          <MapPin className="h-3.5 w-3.5 text-slate-550 shrink-0" />
                          <span>{nextAppt.doctor.clinic_name}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAppt(nextAppt)}
                    className="w-full sm:w-auto btn-primary px-4 py-2 text-xs font-bold rounded-lg shrink-0 text-center"
                  >
                    View Details
                  </button>
                </div>
              );
            })()}

            {/* Main Home Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2/3 width on large screens): Past Appointments & Medical Records */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Past 3 Appointments */}
                <div className="glass-card rounded-xl p-5 border border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-base">Past 3 Consultations</h3>
                    <button onClick={() => setActiveTab('appointments')} className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1">
                      <span>View All</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  {appointments.filter(a => a.status !== 'scheduled').length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">No completed past consultations yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.filter(a => a.status !== 'scheduled').slice(0, 3).map((appt) => (
                        <div 
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className="p-4 rounded-xl border border-slate-800 bg-slate-950/20 hover:bg-slate-800/10 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4"
                        >
                          <div>
                            <h4 className="font-bold text-white text-sm">Dr. {appt.doctor.first_name} {appt.doctor.last_name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{appt.appointment_date} • {formatTime12hr(appt.start_time)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              appt.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' :
                              appt.status === 'no_show' ? 'bg-red-500/10 border border-red-500/25 text-red-400' :
                              'bg-slate-800 border border-slate-700 text-slate-400'
                            }`}>
                              {appt.status.replace('_', ' ')}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medical Records (Notes) */}
                <div className="glass-card rounded-xl p-5 border border-slate-800">
                  <h3 className="font-bold text-white text-base mb-4">Patient Medical Records</h3>
                  
                  {appointments.filter(a => a.status === 'completed' && a.medical_note).length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">No clinical notes or records generated yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                            <th className="pb-3 pr-4">Date</th>
                            <th className="pb-3 pr-4">Physician</th>
                            <th className="pb-3 pr-4">Diagnosis</th>
                            <th className="pb-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-350">
                          {appointments.filter(a => a.status === 'completed' && a.medical_note).map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-800/5 text-slate-300">
                              <td className="py-3 pr-4 font-medium whitespace-nowrap">{rec.appointment_date}</td>
                              <td className="py-3 pr-4 font-semibold text-white">Dr. {rec.doctor.last_name}</td>
                              <td className="py-3 pr-4 truncate max-w-[150px]">{rec.medical_note.diagnosis}</td>
                              <td className="py-3">
                                <button
                                  onClick={() => setSelectedAppt(rec)}
                                  className="text-sky-400 hover:text-sky-355 font-bold"
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (1/3 width): Health Tip of the Day & Quick Actions */}
              <div className="space-y-6">
                
                {/* Health Tip */}
                <div className="glass-card rounded-xl p-5 border border-slate-800 bg-sky-500/5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-3">
                    <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                    <span>Daily Health Advisory</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Staying hydrated is vital for metabolic function. Remember to drink at least 8-10 glasses of water daily, especially during warm weather or exercise.
                  </p>
                </div>

                {/* Quick Actions Shortcuts */}
                <div className="glass-card rounded-xl p-5 border border-slate-800">
                  <h3 className="font-bold text-white text-sm mb-4">Patient Shortcuts</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab('book')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-850/20 transition-all text-xs font-semibold text-white"
                    >
                      <span className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-sky-400" />
                        <span>Book New Appointment</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setActiveTab('symptom-matcher')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-850/20 transition-all text-xs font-semibold text-white"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sky-400" />
                        <span>Ask Casy</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-850/20 transition-all text-xs font-semibold text-white"
                    >
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4 text-sky-400" />
                        <span>Manage Profile Details</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Dynamic Screens */}
        {activeTab === 'book' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
              <div className="relative col-span-1 md:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors by name..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Location query filter */}
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City, State, Zip, County..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />

              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">All Specialties</option>
                  {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select
                  value={selectedClinic}
                  onChange={(e) => setSelectedClinic(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">All Clinics</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* GPS Geolocation Controls */}
              <div className="col-span-1 md:col-span-2 flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-850">
                <div className="text-xs">
                  <span className="text-slate-400 font-medium">Sort by Proximity (GPS):</span>{' '}
                  <span className={useGps ? 'text-sky-400 font-bold' : 'text-slate-500'}>
                    {useGps ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    useGps 
                      ? 'bg-sky-500/10 border-sky-500/35 text-sky-400 hover:bg-sky-500/20' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {gpsLoading ? 'Locating...' : useGps ? 'Use Text Filters' : 'Detect Location'}
                </button>
              </div>
            </div>

            {/* Doctor Grid */}
            {loadingDoctors ? (
              <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Loading specialist listings...</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No doctors found matching filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doc) => (
                  <div key={doc.id} className="glass-card rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 font-medium">
                          {doc.specialty_name}
                        </div>
                        <div className="flex items-center text-xs font-semibold text-emerald-400">
                          <DollarSign className="h-3 w-3" />
                          <span>{doc.consultation_fee} fee</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-base mb-1">Dr. {doc.first_name} {doc.last_name}</h3>
                      
                      {doc.distance !== null && doc.distance !== undefined && (
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold mb-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>📍 {doc.distance} miles away</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                        <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{doc.clinic_name}</span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-3 mb-4">{doc.bio}</p>
                    </div>

                    <button
                      onClick={() => setBookingDoctor(doc)}
                      className="w-full btn-primary py-2 text-xs font-semibold rounded-lg text-center"
                    >
                      Book Appointment
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Booking Modal */}
            {bookingDoctor && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center p-4 md:p-8 overflow-y-auto">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative my-auto">
                  <h3 className="text-lg font-bold text-white mb-4">Book with Dr. {bookingDoctor.last_name}</h3>
                  
                  {bookingError && (
                    <div className="bg-red-500/10 border border-red-500/25 text-red-200 text-xs px-4 py-2 mb-4 rounded-lg">
                      {bookingError}
                    </div>
                  )}

                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    {/* Calendar Section */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Select Appointment Date</label>
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                        {/* Calendar Header */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-white">
                            {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const prev = new Date(calendarMonth);
                                prev.setMonth(prev.getMonth() - 1);
                                setCalendarMonth(prev);
                              }}
                              className="p-1 rounded bg-slate-905 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Date(calendarMonth);
                                next.setMonth(next.getMonth() + 1);
                                setCalendarMonth(next);
                              }}
                              className="p-1 rounded bg-slate-905 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Day Names Header */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 uppercase mb-2">
                          <span>Su</span>
                          <span>Mo</span>
                          <span>Tu</span>
                          <span>We</span>
                          <span>Th</span>
                          <span>Fr</span>
                          <span>Sa</span>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendarDays().map((day, idx) => {
                            const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                            const isSelected = bookingDate === dateStr;
                            
                            const today = new Date();
                            const isToday = day.date.getDate() === today.getDate() && 
                                            day.date.getMonth() === today.getMonth() && 
                                            day.date.getFullYear() === today.getFullYear();

                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={day.disabled}
                                onClick={() => {
                                  setBookingDate(dateStr);
                                  setBookingTime('');
                                }}
                                className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                                  !day.isCurrentMonth ? 'text-slate-700 opacity-20' : ''
                                } ${
                                  day.disabled 
                                    ? 'text-slate-600 cursor-not-allowed opacity-30 bg-slate-950/20' 
                                    : isSelected 
                                      ? 'bg-sky-500 text-white font-bold border border-sky-400 shadow-md shadow-sky-500/20' 
                                      : isToday
                                        ? 'border border-sky-500/30 text-sky-400 font-bold bg-sky-500/5 hover:bg-sky-500/10'
                                        : 'text-slate-300 hover:bg-slate-800/60 bg-slate-900/40 hover:text-white'
                                }`}
                              >
                                {day.date.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Time Slots Section */}
                    {bookingDate && (
                      <div className="space-y-2 pt-1">
                        <label className="text-xs text-slate-400 font-medium">Select Available Time Slot</label>
                        {getSlotsForSelectedDate().length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {getSlotsForSelectedDate().map((slot) => {
                              const isSelected = bookingTime === slot.timeValue;
                              return (
                                <button
                                  key={slot.timeValue}
                                  type="button"
                                  onClick={() => {
                                    if (slot.available) {
                                      setBookingTime(slot.timeValue);
                                    }
                                  }}
                                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                                    !slot.available
                                      ? 'border-slate-900/60 bg-slate-950/40 text-slate-650 opacity-40 filter blur-[0.6px] cursor-not-allowed pointer-events-none'
                                      : isSelected
                                        ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-md shadow-sky-500/20'
                                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/45'
                                  }`}
                                >
                                  {slot.timeLabel}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic bg-slate-950/40 border border-slate-900 p-3 rounded-lg text-center">
                            Dr. {bookingDoctor.last_name} has no availability on this day of the week. Please select another date.
                          </p>
                        )}
                      </div>
                    )}

                    {/* AI Prediction Section */}
                    {bookingDate && bookingTime && (
                      <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold mb-2">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>CareSync AI Risk Predictor</span>
                        </div>
                        {riskLoading ? (
                          <div className="text-xs text-slate-500 animate-pulse">Calculating no-show risk profile...</div>
                        ) : noShowRisk ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Predicted No-Show Risk:</span>
                              <span className={`font-semibold ${
                                noShowRisk.risk_level === 'High' ? 'text-red-400' :
                                noShowRisk.risk_level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {(noShowRisk.no_show_probability * 100).toFixed(1)}% ({noShowRisk.risk_level} Risk)
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              This model evaluates clinic volume patterns, doctor delays, and day/hour features to help optimize calendar slots.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingDoctor(null);
                          setBookingDate('');
                          setBookingTime('');
                        }}
                        className="flex-1 btn-secondary py-2 text-xs font-semibold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!bookingDate || !bookingTime}
                        className="flex-1 btn-primary py-2 text-xs font-semibold rounded-lg disabled:opacity-50"
                      >
                        Confirm Booking
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-6">
            {appointments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">You have no appointment history.</div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div 
                    key={appt.id} 
                    onClick={() => setSelectedAppt(appt)}
                    className="glass-card rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer animate-fade-in"
                  >
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-white text-base">Dr. {appt.doctor.first_name} {appt.doctor.last_name}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            appt.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' :
                            appt.status === 'scheduled' ? 'bg-sky-500/10 border border-sky-500/25 text-sky-400' :
                            appt.status === 'no_show' ? 'bg-red-500/10 border border-red-500/25 text-red-400' :
                            'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}>
                            {appt.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <span>{appt.appointment_date}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            <span>{formatTime12hr(appt.start_time)}</span>
                          </div>
                          <div className="col-span-2 md:col-span-1 text-slate-550">
                            ID: #{appt.id}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {appt.status === 'scheduled' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelAppointment(appt.id); }}
                            className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-lg border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
                          >
                            Cancel
                          </button>
                        )}
                        {appt.status === 'completed' && !appt.feedback && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setFeedbackApptId(appt.id); }}
                            className="btn-primary py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center gap-1"
                          >
                            <Star className="h-3.5 w-3.5" />
                            <span>Leave Rating</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedAppt(appt); }}
                          className="btn-secondary py-1.5 px-3 text-xs font-semibold rounded-lg hover:text-white"
                        >
                          Details
                        </button>
                      </div>
                    </div>

                    {/* Medical Note Summary Section */}
                    {appt.medical_note && (
                      <div className="mt-4 pt-4 border-t border-slate-800/60 p-4 rounded-lg bg-slate-900/30 border border-slate-800/50">
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold mb-2">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Clinical Note Summary</span>
                        </div>
                        <div className="space-y-2 text-xs text-slate-350">
                          <div><span className="font-semibold text-slate-400">Diagnosis:</span> {appt.medical_note.diagnosis}</div>
                          <div className="truncate text-[11px] text-slate-400"><span className="font-semibold text-slate-500">Plan:</span> {appt.medical_note.treatment_plan}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Leave Feedback Modal */}
            {feedbackApptId && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center p-4 md:p-8 overflow-y-auto">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl my-auto">
                  <h3 className="text-lg font-bold text-white mb-4">Submit Session Feedback</h3>
                  <form onSubmit={submitFeedback} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Rating (1 to 5 Stars)</label>
                      <select
                        value={feedbackRating}
                        onChange={(e) => setFeedbackRating(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      >
                        <option value={5}>5 - Excellent care</option>
                        <option value={4}>4 - Good</option>
                        <option value={3}>3 - Average</option>
                        <option value={2}>2 - Poor</option>
                        <option value={1}>1 - Terrible</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Comments</label>
                      <textarea
                        required
                        value={feedbackComments}
                        onChange={(e) => setFeedbackComments(e.target.value)}
                        placeholder="Write a brief comment about your clinical consultation..."
                        rows="3"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setFeedbackApptId(null)}
                        className="flex-1 btn-secondary py-2 text-xs font-semibold rounded-lg"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        className="flex-1 btn-primary py-2 text-xs font-semibold rounded-lg"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clinics-search' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
              <div className="relative col-span-1 md:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={clinicSearchQuery}
                  onChange={(e) => setClinicSearchQuery(e.target.value)}
                  placeholder="Search clinics by name..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Location query filter */}
              <input
                type="text"
                value={clinicLocationQuery}
                onChange={(e) => setClinicLocationQuery(e.target.value)}
                placeholder="City, State, Zip, County..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />

              {/* GPS Geolocation Controls */}
              <div className="md:col-span-3 flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-850">
                <div className="text-xs">
                  <span className="text-slate-400 font-medium">Sort by Proximity (GPS):</span>{' '}
                  <span className={useGpsForClinics ? 'text-sky-400 font-bold' : 'text-slate-500'}>
                    {useGpsForClinics ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleGpsForClinics}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    useGpsForClinics 
                      ? 'bg-sky-500/10 border-sky-500/35 text-sky-400 hover:bg-sky-500/20' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {gpsLoading ? 'Locating...' : useGpsForClinics ? 'Use Text Filters' : 'Detect Location'}
                </button>
              </div>
            </div>

            {/* Clinics Grid */}
            {loadingClinics ? (
              <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Loading clinic list...</div>
            ) : clinicsList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No clinics found matching filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clinicsList.map((cl) => (
                  <div key={cl.id} className="glass-card rounded-xl p-5 flex flex-col justify-between border border-slate-800/80 hover:border-sky-500/20 transition-all duration-300">
                    <div>
                      {cl.distance !== null && cl.distance !== undefined && (
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold mb-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>📍 {cl.distance} miles away</span>
                        </div>
                      )}
                      <h3 className="font-bold text-white text-base mb-1">{cl.name}</h3>
                      <div className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{cl.address}</span>
                      </div>
                      
                      {cl.phone && (
                        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-650 shrink-0" />
                          <span>{cl.phone}</span>
                        </div>
                      )}

                      {cl.specialties && cl.specialties.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Available Specialties</div>
                          <div className="flex flex-wrap gap-1">
                            {cl.specialties.map((spec, sidx) => (
                              <span key={sidx} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/5 border border-sky-500/10 text-sky-300">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'symptom-matcher' && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Casy: AI Specialty Triage</h3>
              <p className="text-xs text-slate-400 mb-6">
                Enter what symptoms you are experiencing, and Casy will match you with the appropriate clinical specialty.
              </p>

              <form onSubmit={handleSymptomMatch} className="space-y-4">
                <textarea
                  required
                  rows="4"
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  placeholder="Describe your symptoms (e.g., I have been experiencing a mild dry cough and slight chest pain when breathing deeply for the past two days...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
                />
                
                <button
                  type="submit"
                  disabled={loadingMatch}
                  className="btn-primary py-2.5 px-6 text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{loadingMatch ? 'Triage Analyzing...' : 'Analyze Symptoms'}</span>
                </button>
              </form>
            </div>

            {/* Casy Recommendation Output */}
            {matchingResult && (
              <div className="p-6 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-4 animate-pulse-slow">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <Sparkles className="h-5 w-5" />
                  <span>AI Triage Recommendation Result</span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block mb-1">Recommended Specialty:</span>
                    <span className="text-lg font-extrabold text-white">{matchingResult.specialty}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block mb-1">AI Reasoning & Context:</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{matchingResult.reasoning}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex gap-4">
                  <button
                    onClick={() => filterToRecommendedSpecialty(matchingResult.specialty)}
                    className="btn-primary py-2 px-4 text-xs font-semibold rounded-lg"
                  >
                    Search {matchingResult.specialty} Doctors
                  </button>
                  <button
                    onClick={() => { setMatchingResult(null); setSymptomsInput(''); }}
                    className="btn-secondary py-2 px-4 text-xs font-semibold rounded-lg"
                  >
                    Clear Result
                  </button>
                </div>
              </div>
            )}
          </div>
        )}



        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="glass-card rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-white mb-6">Patient Profile Settings</h3>
              
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
                  {profilePicPreview ? (
                    <img 
                      src={profilePicPreview} 
                      alt="Avatar Preview" 
                      onClick={() => setIsEnlargedAvatarOpen(true)}
                      className="h-16 w-16 rounded-full object-cover border-2 border-sky-500/30 shrink-0 cursor-pointer hover:scale-105 transition-all duration-200" 
                      onError={() => setProfilePicPreview('')} 
                      title="Click to enlarge"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-lg shrink-0">
                      {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : 'CS'}
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Upload Profile Picture (JPG/PNG)</label>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      onChange={handleFileChange} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 file:cursor-pointer cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">First Name</label>
                    <input 
                      type="text" 
                      required 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Last Name</label>
                    <input 
                      type="text" 
                      required 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Contact Phone</label>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={handlePhoneChange} 
                      maxLength={12}
                      placeholder="813-925-4422"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Date of Birth</label>
                    <input 
                      type="date" 
                      value={dob} 
                      onChange={(e) => setDob(e.target.value)} 
                      onClick={(e) => e.target.showPicker()}
                      onFocus={(e) => e.target.showPicker()}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Gender</label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Email Address</label>
                    <input 
                      type="email" 
                      disabled 
                      value={email} 
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
                        value={oldPassword} 
                        onChange={(e) => setOldPassword(e.target.value)} 
                        placeholder="Enter old password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="Enter new password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Confirm new password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={savingProfile} 
                  className="w-full btn-primary py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving updates...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Alerts Slide-over Drawer */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Background overlay */}
            <div 
              onClick={() => setIsNotificationsOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity cursor-pointer" 
              aria-hidden="true"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out">
                <div className="flex h-full flex-col bg-slate-900 border-l border-slate-800 shadow-2xl">
                  {/* Drawer Header */}
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-sky-400 animate-pulse" />
                      <h2 className="text-base font-bold text-white" id="slide-over-title">CareSync System Alerts</h2>
                    </div>
                    <button 
                      onClick={() => setIsNotificationsOpen(false)}
                      className="rounded-md text-slate-400 hover:text-white focus:outline-none"
                    >
                      <span className="sr-only">Close panel</span>
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Actions bar */}
                  <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Showing latest alerts</span>
                    {notifications.some(n => !n.is_read) && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark all as read</span>
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {notifications.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-sm">
                        You have no alerts at this time.
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isAppt = notif.title.toLowerCase().includes('appointment');
                        return (
                          <div 
                            key={notif.id} 
                            className={`p-4 rounded-xl border transition-all ${
                              notif.is_read 
                                ? 'bg-slate-900/10 border-slate-800/60 text-slate-400' 
                                : 'bg-sky-500/5 border-sky-500/20 text-slate-200 shadow-lg'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {/* Unread indicator */}
                                {!notif.is_read && (
                                  <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0 animate-pulse"></span>
                                )}
                                <h4 className="font-bold text-white text-sm">{notif.title}</h4>
                              </div>
                              <span className="text-[10px] text-slate-550 shrink-0 font-medium">
                                {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 mb-3 leading-relaxed">{notif.message}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-xs">
                              <span className="text-[10px] text-slate-500">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                              
                              <div className="flex items-center gap-3">
                                {!notif.is_read && (
                                  <button
                                    onClick={() => handleMarkSingleRead(notif.id)}
                                    className="text-slate-400 hover:text-white transition-all text-[11px] font-medium"
                                  >
                                    Dismiss
                                  </button>
                                )}
                                {isAppt && (
                                  <button
                                    onClick={() => handleNotificationAction(notif)}
                                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold text-[11px]"
                                  >
                                    <span>Take Action</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Help Slide-over Drawer */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Background overlay */}
            <div 
              onClick={() => setIsHelpOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity cursor-pointer" 
              aria-hidden="true"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out">
                <div className="flex h-full flex-col bg-slate-900 border-l border-slate-800 shadow-2xl">
                  {/* Drawer Header */}
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-sky-400 animate-pulse" />
                      <h2 className="text-base font-bold text-white">Ask Casy</h2>
                    </div>
                    <button 
                      onClick={() => setIsHelpOpen(false)}
                      className="rounded-md text-slate-400 hover:text-white focus:outline-none"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/10">
                    <div className="space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-sky-500 text-white rounded-br-none shadow-md' 
                              : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-slate-955 border border-slate-800 rounded-xl rounded-bl-none p-3.5 max-w-[85%] text-[11px] text-slate-500 animate-pulse">
                            Casy is thinking...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chat Input Form */}
                  <form onSubmit={handleChatSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about care plans, symptoms..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="btn-primary p-2 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setSelectedAppt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Info className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-bold text-white">Consultation Details</h3>
            </div>

            <div className="space-y-4">
              {/* Doctor Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-white text-base">Dr. {selectedAppt.doctor.first_name} {selectedAppt.doctor.last_name}</h4>
                  <div className="text-xs text-sky-400 font-medium mt-0.5">{selectedAppt.doctor.specialty_name}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>{selectedAppt.doctor.clinic_name}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                  selectedAppt.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' :
                  selectedAppt.status === 'scheduled' ? 'bg-sky-500/10 border border-sky-500/25 text-sky-400' :
                  selectedAppt.status === 'no_show' ? 'bg-red-500/10 border border-red-500/25 text-red-400' :
                  'bg-slate-800 border border-slate-700 text-slate-400'
                }`}>
                  {selectedAppt.status.replace('_', ' ')}
                </span>
              </div>

              {/* Schedule info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-955/40 border border-slate-800 rounded-lg text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-550" />
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Date</div>
                    <div className="font-semibold">{selectedAppt.appointment_date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-555" />
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Time</div>
                    <div className="font-semibold">{formatTime12hr(selectedAppt.start_time)}</div>
                  </div>
                </div>
              </div>

              {/* Clinical Documentation (Medical Note) */}
              {selectedAppt.medical_note && (
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Clinical Notes</span>
                  </h5>
                  
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-lg">
                      <span className="font-bold text-slate-450 block mb-1">Reported Symptoms:</span>
                      <p className="text-slate-200 leading-relaxed">{selectedAppt.medical_note.symptoms || 'None recorded'}</p>
                    </div>
                    <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-lg">
                      <span className="font-bold text-slate-455 block mb-1">Clinical Diagnosis:</span>
                      <p className="text-slate-200 leading-relaxed">{selectedAppt.medical_note.diagnosis || 'Pending'}</p>
                    </div>
                    <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-lg">
                      <span className="font-bold text-slate-455 block mb-1">Treatment & Advisory Plan:</span>
                      <p className="text-slate-200 leading-relaxed">{selectedAppt.medical_note.treatment_plan || 'Pending'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Rating & Feedback */}
              {selectedAppt.status === 'completed' && (
                <div className="pt-2 border-t border-slate-800">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Session Feedback</h5>
                  {selectedAppt.feedback ? (
                    <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-lg">
                      <div className="flex items-center gap-1 mb-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < selectedAppt.feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-350 italic">"{selectedAppt.feedback.comments || 'No comment provided'}"</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setFeedbackApptId(selectedAppt.id);
                        setSelectedAppt(null); // Close details modal first
                      }}
                      className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/35 text-xs text-amber-400 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Star className="h-3.5 w-3.5" />
                      <span>Leave Rating & Review</span>
                    </button>
                  )}
                </div>
              )}

              {selectedAppt.status === 'scheduled' && (
                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      cancelAppointment(selectedAppt.id);
                      setSelectedAppt(null);
                    }}
                    className="w-full btn-secondary py-2 text-xs font-bold rounded-lg border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
                  >
                    Cancel Appointment
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-750 text-xs font-semibold rounded-lg text-white"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Avatar Modal */}
      {isEnlargedAvatarOpen && profilePicPreview && (
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
              src={profilePicPreview} 
              alt="Enlarged Avatar" 
              className="w-64 h-64 rounded-full object-cover border border-sky-500/30 shadow-lg shadow-sky-500/10 mb-4" 
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
