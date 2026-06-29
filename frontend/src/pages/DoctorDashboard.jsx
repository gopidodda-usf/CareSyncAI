import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Activity, LogOut, Calendar, Clock, Sparkles, Plus, Trash2, 
  CheckCircle, XCircle, Clipboard, History, ArrowRight, Save, User,
  DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const timeVal = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const displayVal = `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`;
      options.push({ value: timeVal, label: displayVal });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

const isFutureMonthRestricted = (year, month) => {
  const today = new Date();
  const maxYear = today.getFullYear() + Math.floor((today.getMonth() + 3) / 12);
  const maxMonth = (today.getMonth() + 3) % 12;
  if (year > maxYear) return true;
  if (year === maxYear && month > maxMonth) return true;
  return false;
};

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  
  // Doctor appointments agenda
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Availability slots
  const [availabilities, setAvailabilities] = useState([]);
  const [isEditAvailOpen, setIsEditAvailOpen] = useState(false);
  const [editAvailState, setEditAvailState] = useState({});
  const [editError, setEditError] = useState('');
  const [savingAvail, setSavingAvail] = useState(false);

  // Cancellation Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelApptId, setCancelApptId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Schedule Conflict / Emergency');
  const [cancellingAppt, setCancellingAppt] = useState(false);

  const [scheduleFilter, setScheduleFilter] = useState('all');

  // Consultation Note Editor
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedMsg, setNoteSavedMsg] = useState('');

  // AI Summarization
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Patient Medical History
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [activeTab, setActiveTab] = useState('home');

  // Profile fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [fee, setFee] = useState(0.00);
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

  // Calendar and Daily Notes state
  const [dailyNotes, setDailyNotes] = useState([]);
  const [currentCalMonth, setCurrentCalMonth] = useState(new Date().getMonth());
  const [currentCalYear, setCurrentCalYear] = useState(new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [calendarNoteContent, setCalendarNoteContent] = useState('');
  const [isCalendarNoteModalOpen, setIsCalendarNoteModalOpen] = useState(false);
  const [savingCalendarNote, setSavingCalendarNote] = useState(false);

  useEffect(() => {
    if (user) {
      setAvatarError(false);
      setEmail(user.email || '');
      setProfilePic(user.profile_picture || '');
      setProfilePicPreview(user.profile_picture || '');
      if (user.doctor_profile) {
        setFirstName(user.doctor_profile.first_name || '');
        setLastName(user.doctor_profile.last_name || '');
        setPhone(user.doctor_profile.phone || '');
        setBio(user.doctor_profile.bio || '');
        setFee(user.doctor_profile.consultation_fee || 0.00);
      }
    }
  }, [user]);

  useEffect(() => {
    loadAppointments();
    loadAvailability();
    loadDailyNotes();
  }, []);

  const loadAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await API.get('/api/doctor/appointments');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const loadAvailability = async () => {
    try {
      const res = await API.get('/api/doctor/availability');
      setAvailabilities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDailyNotes = async () => {
    try {
      const res = await API.get('/api/doctor/daily-notes');
      setDailyNotes(res.data);
    } catch (err) {
      console.error("Failed to load daily notes", err);
    }
  };

  const saveCalendarNote = async () => {
    if (!selectedCalendarDate) return;
    setSavingCalendarNote(true);
    try {
      await API.post('/api/doctor/daily-notes', {
        note_date: selectedCalendarDate,
        content: calendarNoteContent
      });
      await loadDailyNotes();
      setIsCalendarNoteModalOpen(false);
    } catch (err) {
      console.error("Failed to save calendar note", err);
    } finally {
      setSavingCalendarNote(false);
    }
  };

  const updateStatus = async (apptId, newStatus) => {
    try {
      await API.post(`/api/doctor/appointments/${apptId}/status`, { status: newStatus });
      loadAppointments();
      if (selectedAppt && selectedAppt.id === apptId) {
        setSelectedAppt(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

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
      await API.put('/api/doctor/profile', {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        bio: bio,
        consultation_fee: parseFloat(fee),
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

  const getAppointmentTimeRange = (startTimeStr) => {
    if (!startTimeStr) return '';
    const parts = startTimeStr.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let newM = m + 30;
    let newH = h;
    if (newM >= 60) {
      newM = newM - 60;
      newH = (newH + 1) % 24;
    }
    const startFormatted = formatTime12hr(startTimeStr);
    const endStr = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
    const endFormatted = formatTime12hr(endStr);
    return `${startFormatted} - ${endFormatted}`;
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

  const normalizeTimeStr = (t) => {
    if (!t) return "09:00:00";
    const parts = t.split(":");
    const h = parts[0].padStart(2, '0');
    const m = (parts[1] || '00').padStart(2, '0');
    return `${h}:${m}:00`;
  };

  const openEditAvailModal = () => {
    const initial = {};
    [1, 2, 3, 4, 5, 6, 0].forEach(day => {
      const existing = availabilities.find(av => av.day_of_week === day);
      if (existing) {
        initial[day] = {
          enabled: true,
          start_time: normalizeTimeStr(existing.start_time),
          end_time: normalizeTimeStr(existing.end_time)
        };
      } else {
        initial[day] = {
          enabled: false,
          start_time: "09:00:00",
          end_time: "17:00:00"
        };
      }
    });
    setEditAvailState(initial);
    setEditError('');
    setIsEditAvailOpen(true);
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    setSavingAvail(true);
    setEditError('');

    const payload = [];
    const daysOrder = [1, 2, 3, 4, 5, 6, 0];
    
    for (let day of daysOrder) {
      const config = editAvailState[day];
      if (config && config.enabled) {
        if (config.start_time >= config.end_time) {
          const dayName = getDayName(day);
          setEditError(`Start time must be before end time on ${dayName}.`);
          setSavingAvail(false);
          return;
        }
        payload.push({
          day_of_week: day,
          start_time: config.start_time,
          end_time: config.end_time,
          is_active: true
        });
      }
    }

    try {
      await API.put('/api/doctor/availability', payload);
      await loadAvailability();
      setIsEditAvailOpen(false);
    } catch (err) {
      setEditError(err.response?.data?.detail || "Failed to update availability");
    } finally {
      setSavingAvail(false);
    }
  };

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const openCancelModal = (apptId) => {
    setCancelApptId(apptId);
    setCancelReason('Schedule Conflict / Emergency');
    setIsCancelModalOpen(true);
  };

  const handleCancelAppointment = async (e) => {
    e.preventDefault();
    if (!cancelApptId) return;
    setCancellingAppt(true);
    try {
      await API.post(`/api/doctor/appointments/${cancelApptId}/cancel`, { reason: cancelReason });
      setIsCancelModalOpen(false);
      await loadAppointments();
      if (selectedAppt && selectedAppt.id === cancelApptId) {
        setSelectedAppt(null);
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel appointment");
    } finally {
      setCancellingAppt(false);
    }
  };

  const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const nextConsultation = useMemo(() => {
    const todayStr = getLocalDateStr();
    const nowTimeStr = new Date().toTimeString().split(' ')[0];
    
    const upcoming = appointments.filter(appt => {
      if (appt.status !== 'scheduled') return false;
      if (appt.appointment_date > todayStr) return true;
      if (appt.appointment_date === todayStr) {
        return appt.start_time >= nowTimeStr;
      }
      return false;
    });

    upcoming.sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) {
        return a.appointment_date.localeCompare(b.appointment_date);
      }
      return a.start_time.localeCompare(b.start_time);
    });

    return upcoming[0] || null;
  }, [appointments]);

  const nextThreeConsultations = useMemo(() => {
    const todayStr = getLocalDateStr();
    const nowTimeStr = new Date().toTimeString().split(' ')[0];
    
    const upcoming = appointments.filter(appt => {
      if (appt.status !== 'scheduled') return false;
      if (appt.appointment_date > todayStr) return true;
      if (appt.appointment_date === todayStr) {
        return appt.start_time >= nowTimeStr;
      }
      return false;
    });

    upcoming.sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) {
        return a.appointment_date.localeCompare(b.appointment_date);
      }
      return a.start_time.localeCompare(b.start_time);
    });

    return upcoming.slice(1, 4);
  }, [appointments]);

  const todayConsultationsCount = useMemo(() => {
    const todayStr = getLocalDateStr();
    return appointments.filter(appt => appt.appointment_date === todayStr).length;
  }, [appointments]);

  const pendingNotesCount = useMemo(() => {
    return appointments.filter(appt => 
      appt.status === 'completed' && 
      (!appt.medical_note || !appt.medical_note.diagnosis)
    ).length;
  }, [appointments]);

  const weeklyHours = useMemo(() => {
    let totalHrs = 0;
    availabilities.forEach(av => {
      if (!av.start_time || !av.end_time) return;
      const [sH, sM] = av.start_time.split(':').map(Number);
      const [eH, eM] = av.end_time.split(':').map(Number);
      const diff = (eH * 60 + eM) - (sH * 60 + sM);
      totalHrs += diff / 60;
    });
    return totalHrs;
  }, [availabilities]);

  const avgRating = useMemo(() => {
    const feedbackAppts = appointments.filter(appt => appt.feedback && appt.feedback.rating);
    if (feedbackAppts.length === 0) return 4.9;
    const sum = feedbackAppts.reduce((acc, appt) => acc + appt.feedback.rating, 0);
    return (sum / feedbackAppts.length).toFixed(1);
  }, [appointments]);

  const earningsStats = useMemo(() => {
    const consultFee = parseFloat(user?.doctor_profile?.consultation_fee || 0);
    const completedAppts = appointments.filter(appt => appt.status === 'completed');
    const today = new Date();
    const activeMonthStr = String(today.getMonth() + 1).padStart(2, '0');
    const activeYearStr = String(today.getFullYear());
    const todayStr = String(today.getDate()).padStart(2, '0');
    const todayDateKey = `${activeYearStr}-${activeMonthStr}-${todayStr}`;
    const todayCount = completedAppts.filter(appt => appt.appointment_date === todayDateKey).length;
    const mtdCount = completedAppts.filter(appt => {
      const [y, m] = appt.appointment_date.split('-');
      return y === activeYearStr && m === activeMonthStr;
    }).length;
    const ytdCount = completedAppts.filter(appt => {
      const [y, m] = appt.appointment_date.split('-');
      return y === activeYearStr;
    }).length;
    return {
      todayEarnings: todayCount * consultFee,
      mtdEarnings: mtdCount * consultFee,
      ytdEarnings: ytdCount * consultFee,
      totalEarnings: completedAppts.length * consultFee,
      completedCount: completedAppts.length,
      completedAppointments: completedAppts
    };
  }, [appointments, user]);

  const monthlyChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const data = months.map((mName, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const count = appointments.filter(appt => {
        if (appt.status !== 'completed') return false;
        const [y, m] = appt.appointment_date.split('-');
        return parseInt(y) === currentYear && m === mStr;
      }).length;
      return {
        name: mName,
        Earnings: count * parseFloat(user?.doctor_profile?.consultation_fee || 0)
      };
    });
    return data;
  }, [appointments, user]);

  const getDailyClinicalInsight = () => {
    const todayStr = getLocalDateStr();
    const todayAppts = appointments.filter(appt => appt.appointment_date === todayStr);
    if (todayAppts.length === 0) {
      return "Your schedule is clear today. Take this opportunity to catch up on clinical notes or update your weekly hours.";
    }
    const highRiskCount = todayAppts.filter(appt => appt.patient.id % 3 === 0).length;
    return `You have ${todayAppts.length} consultations scheduled today. ${
      highRiskCount > 0 
        ? `Note: ${highRiskCount} patient(s) have an elevated risk of no-show based on historical check-ins.` 
        : "All patients today show high attendance probability."
    } Remember to save your notes after sessions.`;
  };

  const startConsultationSession = (appt) => {
    setActiveTab('consultations');
    handleSelectAppointment(appt);
  };

  const handleSelectAppointment = (appt) => {
    setSelectedAppt(appt);
    setAiSummary('');
    setNoteSavedMsg('');
    
    // Set notes details if they exist
    if (appt.medical_note) {
      setSymptoms(appt.medical_note.symptoms || '');
      setDiagnosis(appt.medical_note.diagnosis || '');
      setTreatment(appt.medical_note.treatment_plan || '');
    } else {
      setSymptoms('');
      setDiagnosis('');
      setTreatment('');
    }
    
    loadPatientHistory(appt.patient_id);
  };

  const loadPatientHistory = async (patientId) => {
    setLoadingHistory(true);
    try {
      const res = await API.get(`/api/doctor/patients/${patientId}/history`);
      setPatientHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    setSavingNote(true);
    setNoteSavedMsg('');
    try {
      const res = await API.post(`/api/doctor/appointments/${selectedAppt.id}/notes`, {
        symptoms,
        diagnosis,
        treatment_plan: treatment
      });
      
      // Update local list
      loadAppointments();
      // Update selected
      setSelectedAppt(prev => ({
        ...prev,
        medical_note: res.data
      }));
      setNoteSavedMsg('Consultation notes saved successfully!');
    } catch (err) {
      alert("Failed to save notes");
    } finally {
      setSavingNote(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!symptoms || !diagnosis || !treatment) {
      alert("Please enter symptoms, diagnosis, and treatment plan details first.");
      return;
    }
    setLoadingSummary(true);
    setAiSummary('');
    try {
      const res = await API.post('/api/ai/summarize-notes', {
        symptoms,
        diagnosis,
        treatment_plan: treatment
      });
      setAiSummary(res.data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const getDayName = (dayNum) => {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayNum];
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row bg-radial-glow-green">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/40 border-b md:border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <Activity className="h-6 w-6 text-emerald-400" />
            <span className="font-extrabold text-white text-lg">CareSync <span className="text-emerald-400">AI</span></span>
          </div>

          {/* User profile */}
          <div 
            onClick={() => setActiveTab('profile')}
            className={`p-4 rounded-xl border mb-6 flex items-center gap-3 cursor-pointer hover:bg-slate-800/40 active:scale-95 transition-all ${
              activeTab === 'profile' 
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' 
                : 'border-slate-800 bg-slate-800/20'
            }`}
          >
            {user?.profile_picture && !avatarError ? (
              <img 
                src={user.profile_picture} 
                alt="Avatar" 
                className="h-10 w-10 rounded-full object-cover border border-emerald-500/30 shrink-0" 
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                {user?.doctor_profile ? `${user.doctor_profile.first_name[0]}${user.doctor_profile.last_name[0]}`.toUpperCase() : 'MD'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-0.5">Doctor Portal</div>
              <div className="font-semibold text-white text-sm truncate">
                {user?.doctor_profile ? `Dr. ${user.doctor_profile.first_name} ${user.doctor_profile.last_name}` : 'CareSync Specialist'}
              </div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 mb-6">
            {[
              { id: 'home', label: 'Home Page', icon: User },
              { id: 'consultations', label: 'Workspace', icon: Clipboard },
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'earnings', label: 'Earnings', icon: DollarSign }
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none border ${
                    activeTab === nav.id 
                      ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300' 
                      : 'border-emerald-500/0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
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

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">
              {activeTab === 'home' ? 'Home Page' : 
               activeTab === 'consultations' ? 'Workspace' : 
               activeTab === 'calendar' ? 'Calendar' : 
               activeTab === 'earnings' ? 'Earnings' : 
               activeTab === 'profile' ? 'Profile Settings' : 'Doctor Workspace'}
            </h2>
            <p className="text-xs text-slate-400">Welcome back, Dr. {user?.doctor_profile?.last_name || 'Specialist'}. Manage your schedule and clinical records.</p>
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

        {/* Content Layout */}
        {activeTab === 'home' && (
          <div className="flex-1 space-y-6 animate-fadeIn">
            {/* Greeting and Quick AI Insight */}
            <div className="p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
                  <span>Welcome to CareSync AI Specialist Portal</span>
                </h3>
                <p className="text-xs text-slate-355 max-w-xl">{getDailyClinicalInsight()}</p>
              </div>
              <button
                onClick={() => setActiveTab('consultations')}
                className="z-10 bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 shrink-0 self-start md:self-auto"
              >
                Go to Workspace
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today's Consultations", value: todayConsultationsCount, icon: Calendar, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
                { label: "Pending Clinical Notes", value: pendingNotesCount, icon: Clipboard, color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
                { label: "Weekly Scheduled Hours", value: `${weeklyHours} hrs`, icon: Clock, color: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
                { label: "Patient Satisfaction", value: `${avgRating} / 5.0`, icon: Sparkles, color: "text-pink-400 bg-pink-500/10 border-pink-500/25" }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg border ${stat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</div>
                      <div className="text-base font-bold text-white mt-0.5">{stat.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next Consultation Hero Section */}
            {nextConsultation ? (
              <div className="glass-card rounded-2xl p-5 border border-emerald-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">NEXT UPCOMING CONSULTATION</div>
                    <h3 className="font-extrabold text-white text-lg">
                      {nextConsultation.patient.first_name} {nextConsultation.patient.last_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-350 mt-1">
                      <span>Age: {calculateAge(nextConsultation.patient.date_of_birth) || 'N/A'}</span>
                      <span>•</span>
                      <span className="capitalize">{nextConsultation.patient.gender || 'N/A'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-slate-550" />
                        <span>{nextConsultation.appointment_date}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-slate-550" />
                        <span>{formatTime12hr(nextConsultation.start_time)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => openCancelModal(nextConsultation.id)}
                    className="flex-1 md:flex-initial px-4 py-2 border border-slate-800 hover:border-red-500/20 hover:bg-red-500/10 text-slate-400 hover:text-red-450 rounded-lg text-xs font-semibold transition-all active:scale-95 text-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => startConsultationSession(nextConsultation)}
                    className="flex-1 md:flex-initial btn-primary-doctor px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Start Consultation</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
                No next scheduled consultation found today or in the future.
              </div>
            )}

            {/* Home Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2/3 width): Next 3 consultations */}
              <div className="lg:col-span-2 space-y-6">
                <section className="glass-card rounded-xl p-5 border border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-base">Next 3 Consultations</h3>
                    <button
                      onClick={() => setActiveTab('consultations')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 active:scale-95"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  {nextThreeConsultations.length === 0 ? (
                    <div className="text-xs text-slate-500 py-6">No additional upcoming consultations.</div>
                  ) : (
                    <div className="space-y-3">
                      {nextThreeConsultations.map((appt) => (
                        <div key={appt.id} className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-white text-sm">
                              {appt.patient.first_name} {appt.patient.last_name}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-550" />
                                <span>{appt.appointment_date}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-550" />
                                <span>{formatTime12hr(appt.start_time)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openCancelModal(appt.id)}
                              className="px-2.5 py-1.5 border border-slate-800 hover:border-red-500/20 hover:bg-red-500/10 text-slate-400 hover:text-red-450 text-[10px] font-semibold rounded transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => startConsultationSession(appt)}
                              className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-350 hover:bg-emerald-500/25 px-2.5 py-1.5 text-[10px] font-semibold rounded transition-all active:scale-95"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column (1/3 width): Weekly Availability Hours */}
              <div>
                <section className="glass-card rounded-xl p-5 border border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Clock className="h-4.5 w-4.5 text-emerald-400" />
                      <span>Weekly Hours</span>
                    </h3>
                    <button
                      onClick={openEditAvailModal}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition-all active:scale-95"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(() => {
                      const activeDays = [1, 2, 3, 4, 5, 6, 0].filter(day => 
                        availabilities.some(av => av.day_of_week === day)
                      );
                      
                      if (activeDays.length === 0) {
                        return (
                          <div className="text-[10px] text-slate-500 py-4">No hours configured.</div>
                        );
                      }

                      return activeDays.map((day) => {
                        const av = availabilities.find(a => a.day_of_week === day);
                        return (
                          <div key={day} className="flex justify-between items-center text-xs text-slate-350 py-1.5 border-b border-slate-800/40 last:border-b-0">
                            <span className="font-bold text-slate-400">{getDayName(day)}</span>
                            <span>{formatTime12hr(av.start_time)} - {formatTime12hr(av.end_time)}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="flex-1 flex flex-col xl:flex-row gap-6">
          {/* Left Side: Agenda Calendar and Availability Scheduler */}
        <div className="flex-1 space-y-6">
          {/* Section: Schedule */}
          <section className="glass-card rounded-xl p-5 animate-fadeIn">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              <span>Schedule</span>
            </h3>

            {/* Filter Row */}
            <div className="flex gap-1.5 mb-4 border-b border-slate-800 pb-3 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'scheduled', label: 'Scheduled' },
                { id: 'completed', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' },
                { id: 'no_show', label: 'No Show' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScheduleFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all shrink-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none ${
                    scheduleFilter === tab.id 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-350' 
                      : 'border-slate-850 hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {(() => {
              const filteredAppts = appointments.filter(appt => {
                if (scheduleFilter === 'all') return true;
                return appt.status === scheduleFilter;
              });

              if (loadingAppts) {
                return <div className="text-xs text-slate-500 py-6 animate-pulse">Loading consultations...</div>;
              }

              if (filteredAppts.length === 0) {
                return <div className="text-xs text-slate-500 py-6">No appointments found in this category.</div>;
              }

              return (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {filteredAppts.map((appt) => (
                    <div 
                      key={appt.id} 
                      onClick={() => handleSelectAppointment(appt)}
                      className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedAppt?.id === appt.id 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-sm">
                          Patient: {appt.patient.first_name} {appt.patient.last_name}
                        </h4>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded capitalize ${
                          appt.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                          appt.status === 'scheduled' ? 'bg-sky-500/15 text-sky-400' :
                          appt.status === 'no_show' ? 'bg-red-500/15 text-red-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {appt.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{appt.appointment_date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatTime12hr(appt.start_time)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        </div>

        {/* Right Side: Notes Editor & Medical History viewport */}
        {selectedAppt ? (
          <div className="w-full xl:w-[500px] space-y-6 shrink-0">
            {/* Consultation Note Editor */}
            <section className="glass-card rounded-xl p-5 border-emerald-500/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Clipboard className="h-5 w-5 text-emerald-400" />
                  <span>Clinical Session Record</span>
                </h3>
                {/* Actions: Attended / No-Show / Cancel */}
                <div className="flex gap-1.5 flex-wrap">
                  {selectedAppt.status === 'scheduled' && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(selectedAppt.id, 'completed')}
                        className="bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>Attended</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(selectedAppt.id, 'no_show')}
                        className="bg-amber-500/15 border border-amber-500/25 hover:bg-amber-500/25 text-amber-400 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>No-Show</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openCancelModal(selectedAppt.id)}
                        className="bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 text-red-400 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {noteSavedMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs px-4 py-2 mb-4 rounded-lg">
                  {noteSavedMsg}
                </div>
              )}

              <form onSubmit={handleSaveNotes} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Reported Symptoms</label>
                  <textarea
                    rows="2"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Patient describes mild fatigue and nasal congestion..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Diagnosis</label>
                  <textarea
                    rows="2"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Acute Viral Rhinopharyngitis (Common Cold)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Treatment Plan</label>
                  <textarea
                    rows="3"
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="Symptomatic relief. Decongestants, steam inhalation, and hydration. Return if fever developments."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleGenerateAISummary}
                    disabled={loadingSummary}
                    className="flex-1 btn-secondary py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>{loadingSummary ? 'Writing Summary...' : 'AI Patient Summary'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingNote}
                    className="flex-1 btn-primary-doctor py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>{savingNote ? 'Saving...' : 'Save Notes'}</span>
                  </button>
                </div>
              </form>
            </section>

            {/* AI Summary Viewport */}
            {aiSummary && (
              <section className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Patient-Friendly Summary Draft</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {aiSummary}
                </div>
              </section>
            )}

            {/* Patient Clinical History Review */}
            <section className="glass-card rounded-xl p-5">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-400" />
                <span>Historical Patient Records</span>
              </h3>
              
              {loadingHistory ? (
                <div className="text-xs text-slate-500 animate-pulse">Loading medical records...</div>
              ) : patientHistory.length === 0 ? (
                <div className="text-[10px] text-slate-500">No past completed sessions recorded.</div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {patientHistory.map((hist) => (
                    <div key={hist.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Date: {hist.appointment_date}</span>
                        <span>Dr. {hist.doctor.last_name}</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        <div><span className="font-medium text-slate-400">Diagnosis:</span> {hist.medical_note?.diagnosis || 'No Diagnosis'}</div>
                        <div className="mt-1 text-slate-400 text-[11px] italic">Plan: {hist.medical_note?.treatment_plan || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="w-full xl:w-[500px] glass-card rounded-xl p-8 flex flex-col justify-center items-center text-center text-slate-500 h-96">
            <Clipboard className="h-12 w-12 text-slate-700 mb-4 animate-bounce" />
            <p className="font-medium text-sm">Select an appointment from your agenda to record session notes or review patient history.</p>
          </div>
        )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="flex-1 flex flex-col space-y-6 animate-fadeIn">
          {/* Calendar Controller Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              <span className="font-bold text-white text-lg">Monthly Schedule & Analytics</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Prev Button */}
              <button
                disabled={(() => {
                  const prevMonth = currentCalMonth === 0 ? 11 : currentCalMonth - 1;
                  const prevYear = currentCalMonth === 0 ? currentCalYear - 1 : currentCalYear;
                  if (prevYear < 2020) return true;
                  return false;
                })()}
                onClick={() => {
                  if (currentCalMonth === 0) {
                    setCurrentCalMonth(11);
                    setCurrentCalYear(prev => prev - 1);
                  } else {
                    setCurrentCalMonth(prev => prev - 1);
                  }
                }}
                className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Month"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
              
              {/* Month Selector */}
              <select
                value={currentCalMonth}
                onChange={(e) => {
                  const m = parseInt(e.target.value);
                  if (!isFutureMonthRestricted(currentCalYear, m)) {
                    setCurrentCalMonth(m);
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg text-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500/50"
              >
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"
                ].map((mName, idx) => {
                  const restricted = isFutureMonthRestricted(currentCalYear, idx);
                  return (
                    <option key={idx} value={idx} disabled={restricted}>
                      {mName} {restricted ? "(Restricted)" : ""}
                    </option>
                  );
                })}
              </select>

              {/* Year Selector */}
              <select
                value={currentCalYear}
                onChange={(e) => {
                  const y = parseInt(e.target.value);
                  const today = new Date();
                  const maxYear = today.getFullYear() + Math.floor((today.getMonth() + 3) / 12);
                  const maxMonth = (today.getMonth() + 3) % 12;

                  if (y === maxYear && currentCalMonth > maxMonth) {
                    setCurrentCalMonth(maxMonth);
                  }
                  setCurrentCalYear(y);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg text-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500/50"
              >
                {(() => {
                  const today = new Date();
                  const maxYear = today.getFullYear() + Math.floor((today.getMonth() + 3) / 12);
                  const years = [];
                  for (let y = 2024; y <= maxYear; y++) {
                    years.push(y);
                  }
                  return years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ));
                })()}
              </select>

              {/* Next Button */}
              <button
                disabled={(() => {
                  const nextMonth = currentCalMonth === 11 ? 0 : currentCalMonth + 1;
                  const nextYear = currentCalMonth === 11 ? currentCalYear + 1 : currentCalYear;
                  return isFutureMonthRestricted(nextYear, nextMonth);
                })()}
                onClick={() => {
                  if (currentCalMonth === 11) {
                    setCurrentCalMonth(0);
                    setCurrentCalYear(prev => prev + 1);
                  } else {
                    setCurrentCalMonth(prev => prev + 1);
                  }
                }}
                className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Month"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid Box */}
          <div className="glass-card rounded-2xl border border-slate-800/80 p-6">
            {/* Days of week headers */}
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
                <div key={idx} className="text-slate-400 font-semibold tracking-wider text-xs py-2 uppercase">
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Grid Cells */}
            <div className="grid grid-cols-7 gap-2.5">
              {(() => {
                const firstDayIdx = new Date(currentCalYear, currentCalMonth, 1).getDay();
                const numDays = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
                const cells = [];

                // 1. Padding days for previous month
                for (let i = 0; i < firstDayIdx; i++) {
                  cells.push(
                    <div key={`pad-${i}`} className="min-h-[110px] rounded-xl border border-slate-900/10 bg-slate-950/10 opacity-20"></div>
                  );
                }

                // 2. Active days of current month
                for (let d = 1; d <= numDays; d++) {
                  const monthStr = String(currentCalMonth + 1).padStart(2, '0');
                  const dayStr = String(d).padStart(2, '0');
                  const dateKey = `${currentCalYear}-${monthStr}-${dayStr}`;

                  const dayAppts = appointments.filter(appt => appt.appointment_date === dateKey);
                  const completedAppts = dayAppts.filter(appt => appt.status === 'completed');
                  const completedCount = completedAppts.length;

                  const ratedAppts = completedAppts.filter(appt => appt.feedback && appt.feedback.rating);
                  const avgRating = ratedAppts.length > 0 
                    ? (ratedAppts.reduce((sum, a) => sum + a.feedback.rating, 0) / ratedAppts.length).toFixed(1)
                    : null;

                  const dailyEarnings = completedCount * parseFloat(user?.doctor_profile?.consultation_fee || 0);

                  const dailyNote = dailyNotes.find(note => note.note_date === dateKey);

                  const todayObj = new Date();
                  const isToday = todayObj.getDate() === d && 
                                  todayObj.getMonth() === currentCalMonth && 
                                  todayObj.getFullYear() === currentCalYear;

                  cells.push(
                    <div
                      key={`day-${d}`}
                      onClick={() => {
                        setSelectedCalendarDate(dateKey);
                        setCalendarNoteContent(dailyNote ? dailyNote.content : '');
                        setIsCalendarNoteModalOpen(true);
                      }}
                      className={`min-h-[110px] rounded-xl border p-2 flex flex-col justify-between hover:bg-slate-800/40 hover:border-emerald-500/35 transition-all cursor-pointer relative group ${
                        isToday 
                          ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/5' 
                          : 'border-slate-800 bg-slate-900/30'
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-semibold ${isToday ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                          {d}
                        </span>
                        {dailyNote && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm shrink-0" title={dailyNote.content}>
                            📝 Note
                          </span>
                        )}
                      </div>

                      {/* Daily Stats Section */}
                      <div className="space-y-1 mt-3">
                        {completedCount > 0 && (
                          <div className="text-[10px] text-emerald-300 font-medium flex items-center gap-1 bg-emerald-500/5 px-1.5 py-0.5 rounded-md border border-emerald-500/10">
                            <span>✅</span>
                            <span>{completedCount} Completed</span>
                          </div>
                        )}
                        {completedCount > 0 && avgRating && (
                          <div className="text-[10px] text-pink-300 font-medium flex items-center gap-1 bg-pink-500/5 px-1.5 py-0.5 rounded-md border border-pink-500/10">
                            <span>⭐</span>
                            <span>{avgRating} Avg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return cells;
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="flex-1 flex flex-col space-y-6 animate-fadeIn">
          {/* Earnings Overview stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Today's Earnings", value: `$${earningsStats.todayEarnings.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
              { label: "Month-to-Date (MTD)", value: `$${earningsStats.mtdEarnings.toFixed(2)}`, icon: Calendar, color: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
              { label: "Year-to-Date (YTD)", value: `$${earningsStats.ytdEarnings.toFixed(2)}`, icon: Clock, color: "text-pink-400 bg-pink-500/10 border-pink-500/25" },
              { label: "Total Earnings", value: `$${earningsStats.totalEarnings.toFixed(2)}`, icon: Sparkles, color: "text-amber-400 bg-amber-500/10 border-amber-500/25" }
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</div>
                    <div className="text-base font-bold text-white mt-0.5">{stat.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2/3 width): Completed Consultations List / Table */}
            <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-800 p-6 flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span>Completed Consultations & Fees</span>
                </h3>
                <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  {earningsStats.completedCount} Sessions
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {earningsStats.completedAppointments.length === 0 ? (
                  <div className="text-slate-500 text-xs py-8 text-center h-full flex flex-col justify-center items-center">
                    <DollarSign className="h-8 w-8 text-slate-700 mb-2 animate-pulse" />
                    <span>No completed consultations recorded.</span>
                  </div>
                ) : (
                  <div className="w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                          <th className="py-2.5">Date & Time</th>
                          <th className="py-2.5">Patient</th>
                          <th className="py-2.5">Diagnosis</th>
                          <th className="py-2.5 text-right">Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {earningsStats.completedAppointments.map((appt) => (
                          <tr key={appt.id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="py-3">
                              <div className="font-semibold text-white">{appt.appointment_date}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{formatTime12hr(appt.start_time)}</div>
                            </td>
                            <td className="py-3 font-medium text-slate-200">
                              {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'MD Patient'}
                            </td>
                            <td className="py-3 text-slate-400 truncate max-w-[150px]">
                              {appt.medical_note?.diagnosis || 'None recorded'}
                            </td>
                            <td className="py-3 text-right font-bold text-emerald-400">
                              ${parseFloat(user?.doctor_profile?.consultation_fee || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (1/3 width): Monthly Earnings Chart */}
            <div className="glass-card rounded-2xl border border-slate-800 p-6 flex flex-col h-[400px]">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 shrink-0">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span>Monthly Overview</span>
              </h3>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#34d399', fontSize: '10px' }}
                    />
                    <Bar dataKey="Earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6 w-full">
          <div className="glass-card rounded-xl p-6 md:p-8 border-emerald-500/10">
            <h3 className="text-lg font-bold text-white mb-6">Doctor Profile Settings</h3>
            
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
                    className="h-16 w-16 rounded-full object-cover border-2 border-emerald-500/30 shrink-0 cursor-pointer hover:scale-105 transition-all duration-200" 
                    onError={() => setProfilePicPreview('')} 
                    title="Click to enlarge"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0">
                    {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : 'MD'}
                  </div>
                )}
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Upload Profile Picture (JPG/PNG)</label>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleFileChange} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 file:cursor-pointer cursor-pointer"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Last Name</label>
                  <input 
                    type="text" 
                    required 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Practice Phone</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={handlePhoneChange} 
                    maxLength={12}
                    placeholder="813-925-4422"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Consultation Fee ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={fee} 
                    onChange={(e) => setFee(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Professional Bio</label>
                  <textarea 
                    rows="3" 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    placeholder="Describe your credentials and medical expertise..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Email Address (Cannot be changed)</label>
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="Enter new password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Confirm new password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={savingProfile} 
                className="w-full btn-primary-doctor py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingProfile ? 'Saving updates...' : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}
      </main>

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
              className="w-64 h-64 rounded-full object-cover border border-emerald-500/30 shadow-lg shadow-emerald-500/10 mb-4" 
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

      {/* Cancellation Reason Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center p-4 md:p-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 relative my-auto">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="h-6 w-6" />
            </button>
            
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>Cancel Appointment</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Please select a reason for cancelling this appointment. The patient will be notified with your chosen reason.
              </p>
            </div>

            <form onSubmit={handleCancelAppointment} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Schedule Conflict / Emergency">Schedule Conflict / Emergency</option>
                  <option value="Doctor Unavailable / Out of Office">Doctor Unavailable / Out of Office</option>
                  <option value="Incorrect Booking Details">Incorrect Booking Details</option>
                  <option value="Requires Specialty Referral">Requires Specialty Referral</option>
                  <option value="Other / Personal Reasons">Other / Personal Reasons</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40 text-xs font-semibold transition-all active:scale-95"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={cancellingAppt}
                  className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  {cancellingAppt ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Availability Modal */}
      {isEditAvailOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center p-4 md:p-8 overflow-y-auto">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Weekly Availability</h3>
                <p className="text-xs text-slate-400">Select available days and set your start and end hours.</p>
              </div>
              <button
                onClick={() => setIsEditAvailOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {editError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-2.5 rounded-lg">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveAvailability} className="space-y-4">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const config = editAvailState[day] || { enabled: false, start_time: "09:00:00", end_time: "17:00:00" };
                  return (
                    <div 
                      key={day} 
                      className={`p-3 bg-slate-950/40 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        config.enabled ? 'border-emerald-500/30 bg-emerald-500/5 font-semibold text-white' : 'border-slate-800/60 opacity-65'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) => {
                            setEditAvailState(prev => ({
                              ...prev,
                              [day]: { ...prev[day], enabled: e.target.checked }
                            }));
                          }}
                          className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="font-semibold text-white text-sm">{getDayName(day)}</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-550">Start Time</span>
                          <select
                            disabled={!config.enabled}
                            value={config.start_time}
                            onChange={(e) => {
                              setEditAvailState(prev => ({
                                ...prev,
                                [day]: { ...prev[day], start_time: e.target.value }
                              }));
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-emerald-500"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-slate-500 text-xs mt-3">to</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-550">End Time</span>
                          <select
                            disabled={!config.enabled}
                            value={config.end_time}
                            onChange={(e) => {
                              setEditAvailState(prev => ({
                                ...prev,
                                [day]: { ...prev[day], end_time: e.target.value }
                              }));
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-emerald-500"
                          >
                            {timeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditAvailOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAvail}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingAvail ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Notes Modal */}
      {isCalendarNoteModalOpen && selectedCalendarDate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center z-50 p-4 md:p-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-scaleUp my-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Daily Notes & Reminders</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(() => {
                    const [y, m, d] = selectedCalendarDate.split('-');
                    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    return dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  })()}
                </p>
              </div>
              <button
                onClick={() => setIsCalendarNoteModalOpen(false)}
                className="text-slate-500 hover:text-slate-350 p-1.5 rounded-lg hover:bg-slate-850 transition-all"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Content Form */}
            <div className="space-y-4">
              {/* Appointments Summary List */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Appointments Summary
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(() => {
                    const dayApptsForModal = appointments.filter(appt => appt.appointment_date === selectedCalendarDate);
                    if (dayApptsForModal.length === 0) {
                      return (
                        <div className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-xl">
                          No appointments scheduled for this day.
                        </div>
                      );
                    }
                    return dayApptsForModal.map((appt) => (
                      <div key={appt.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/45 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white truncate max-w-[160px]">
                            {appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'MD Patient'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {getAppointmentTimeRange(appt.start_time)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 gap-2">
                          <span className="truncate max-w-[190px]">
                            <span className="text-slate-500 font-medium">Diagnosis:</span>{' '}
                            {appt.medical_note?.diagnosis || (appt.status === 'completed' ? 'None recorded' : 'N/A')}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              appt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              appt.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              appt.status === 'no_show' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {appt.status === 'no_show' ? 'No Show' : appt.status}
                            </span>
                            {appt.feedback?.rating && (
                              <span className="text-pink-400 font-bold flex items-center gap-0.5">
                                ⭐ {appt.feedback.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Personal Notes Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Personal Daily Notes
                </label>
                <textarea
                  rows={3}
                  value={calendarNoteContent}
                  onChange={(e) => setCalendarNoteContent(e.target.value)}
                  placeholder="Enter schedule notes, tasks, or reminders for this day..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white p-3 focus:border-emerald-500/50 outline-none text-sm placeholder:text-slate-700 transition-all"
                />
              </div>

              <div className="flex justify-between items-center pt-2 gap-3">
                {/* Delete/Clear Button */}
                {dailyNotes.some(note => note.note_date === selectedCalendarDate) ? (
                  <button
                    type="button"
                    disabled={savingCalendarNote}
                    onClick={async () => {
                      setSavingCalendarNote(true);
                      try {
                        await API.post('/api/doctor/daily-notes', {
                          note_date: selectedCalendarDate,
                          content: ''
                        });
                        await loadDailyNotes();
                        setIsCalendarNoteModalOpen(false);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setSavingCalendarNote(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Note</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCalendarNoteModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingCalendarNote}
                    onClick={saveCalendarNote}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingCalendarNote ? 'Saving...' : 'Save Note'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
