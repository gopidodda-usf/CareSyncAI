import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Activity, LogOut, Search, Calendar, Clock, Sparkles, Send, 
  MapPin, DollarSign, CalendarCheck, CheckCircle2, XCircle, RefreshCw, MessageSquare, Star,
  ArrowRight, Bell
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

  // Book Appointment
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00:00');
  const [noShowRisk, setNoShowRisk] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // History & Notifications
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('book'); // 'book', 'appointments', 'symptom-matcher', 'chat'

  // AI Symptom Matcher
  const [symptomsInput, setSymptomsInput] = useState('');
  const [matchingResult, setMatchingResult] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  // Chatbot
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your CareSync AI health assistant. What questions or symptoms can I help you with today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Feedback
  const [feedbackApptId, setFeedbackApptId] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');

  // Alerts Drawer state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
  }, [selectedSpecialty, selectedClinic, searchQuery]);

  // Predict no-show probability when date/time changes
  useEffect(() => {
    if (bookingDoctor && bookingDate && bookingTime) {
      predictNoShowRisk();
    }
  }, [bookingDate, bookingTime, bookingDoctor]);

  const searchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await API.get('/api/patient/doctors', {
        params: {
          specialty_id: selectedSpecialty || undefined,
          clinic_id: selectedClinic || undefined,
          search: searchQuery || undefined
        }
      });
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDoctors(false);
    }
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
          <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-800 mb-6">
            <div className="text-xs text-sky-400 font-semibold mb-1">Patient Portal</div>
            <div className="font-semibold text-white text-sm">
              {user?.patient_profile ? `${user.patient_profile.first_name} ${user.patient_profile.last_name}` : 'CareSync Patient'}
            </div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'book', label: 'Search Doctors', icon: Search },
              { id: 'appointments', label: 'My Appointments', icon: Calendar },
              { id: 'symptom-matcher', label: 'AI Specialty Matcher', icon: Sparkles },
              { id: 'chat', label: 'AI Chat Assistant', icon: MessageSquare }
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === nav.id 
                      ? 'bg-sky-500/15 border border-sky-500/20 text-sky-300' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs text-slate-400">Welcome back! Manage your healthcare schedule and insights.</p>
          </div>
          
          {/* Notifications & Sign Out */}
          <div className="flex items-center gap-3">
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

              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Specialties</option>
                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select
                value={selectedClinic}
                onChange={(e) => setSelectedClinic(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Clinics</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative">
                  <h3 className="text-lg font-bold text-white mb-4">Book with Dr. {bookingDoctor.last_name}</h3>
                  
                  {bookingError && (
                    <div className="bg-red-500/10 border border-red-500/25 text-red-200 text-xs px-4 py-2 mb-4 rounded-lg">
                      {bookingError}
                    </div>
                  )}

                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Appointment Date</label>
                      <input
                        type="date"
                        required
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        onClick={(e) => e.target.showPicker()}
                        onFocus={(e) => e.target.showPicker()}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Preferred Time</label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      >
                        <option value="09:00:00">09:00 AM</option>
                        <option value="10:00:00">10:00 AM</option>
                        <option value="11:00:00">11:00 AM</option>
                        <option value="13:00:00">01:00 PM</option>
                        <option value="14:00:00">02:00 PM</option>
                        <option value="15:00:00">03:00 PM</option>
                        <option value="16:00:00">04:00 PM</option>
                      </select>
                    </div>

                    {/* AI Prediction Section */}
                    {bookingDate && (
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
                        onClick={() => setBookingDoctor(null)}
                        className="flex-1 btn-secondary py-2 text-xs font-semibold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 btn-primary py-2 text-xs font-semibold rounded-lg"
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
                  <div key={appt.id} className="glass-card rounded-xl p-5 border border-slate-800">
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
                            <span>{appt.start_time}</span>
                          </div>
                          <div className="col-span-2 md:col-span-1 text-slate-500">
                            ID: #{appt.id}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {appt.status === 'scheduled' && (
                          <button
                            onClick={() => cancelAppointment(appt.id)}
                            className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-lg border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
                          >
                            Cancel
                          </button>
                        )}
                        {appt.status === 'completed' && !appt.feedback && (
                          <button
                            onClick={() => setFeedbackApptId(appt.id)}
                            className="btn-primary py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center gap-1"
                          >
                            <Star className="h-3.5 w-3.5" />
                            <span>Leave Rating</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Medical Note Summary Section */}
                    {appt.medical_note && (
                      <div className="mt-4 pt-4 border-t border-slate-800/60 p-4 rounded-lg bg-slate-900/30 border border-slate-800/50">
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold mb-2">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>AI Medical Note Summary</span>
                        </div>
                        {/* We will simulate summary generation by printing note details or triggering a request.
                            In this case, since we generated seed note, we display a nice formatting */}
                        <div className="space-y-2 text-xs text-slate-300">
                          <div><span className="font-semibold text-slate-400">Symptoms reported:</span> {appt.medical_note.symptoms}</div>
                          <div><span className="font-semibold text-slate-400">Clinical Diagnosis:</span> {appt.medical_note.diagnosis}</div>
                          <div><span className="font-semibold text-slate-400">Treatment Plan:</span> {appt.medical_note.treatment_plan}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Leave Feedback Modal */}
            {feedbackApptId && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
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

        {activeTab === 'symptom-matcher' && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">AI Symptom-based Specialty Triage</h3>
              <p className="text-xs text-slate-400 mb-6">
                Enter what symptoms you are experiencing, and our triage engine will match you with the appropriate clinical specialty.
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

            {/* AI Recommendation Output */}
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

        {activeTab === 'chat' && (
          <div className="h-[600px] flex flex-col glass-card rounded-xl overflow-hidden border border-slate-800">
            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-900/10">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md rounded-xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-sky-500 text-white rounded-br-none' 
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl rounded-bl-none p-4 max-w-md text-xs text-slate-500 animate-pulse">
                    CareSync AI is thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleChatSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your care plan, clinic location, or scheduling questions..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="btn-primary p-2.5 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
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
    </div>
  );
}
