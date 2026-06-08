import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Activity, LogOut, Calendar, Clock, Sparkles, Plus, Trash2, 
  CheckCircle, XCircle, Clipboard, History, ArrowRight, Save, User
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  
  // Doctor appointments agenda
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Availability slots
  const [availabilities, setAvailabilities] = useState([]);
  const [newDay, setNewDay] = useState(1); // Monday
  const [newStart, setNewStart] = useState('09:00:00');
  const [newEnd, setNewEnd] = useState('17:00:00');

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

  const [activeTab, setActiveTab] = useState('schedule');

  // Profile fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [fee, setFee] = useState(0.00);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const { reloadUser } = useAuth();

  useEffect(() => {
    if (user) {
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');
    try {
      await API.put('/api/doctor/profile', {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        bio: bio,
        consultation_fee: parseFloat(fee),
        profile_picture: profilePic,
        email: email,
        password: password
      });
      setProfileMessage('Your profile settings have been updated successfully!');
      setPassword(''); // clear password field
      await reloadUser();
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/doctor/availability', {
        day_of_week: parseInt(newDay),
        start_time: newStart,
        end_time: newEnd,
        is_active: true
      });
      loadAvailability();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add availability slot");
    }
  };

  const handleDeleteAvailability = async (slotId) => {
    try {
      await API.delete(`/api/doctor/availability/${slotId}`);
      loadAvailability();
    } catch (err) {
      alert("Failed to delete slot");
    }
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
          <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-800 mb-6 flex items-center gap-3">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Avatar" className="h-10 w-10 rounded-full object-cover border border-emerald-500/30 shrink-0" />
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
              { id: 'schedule', label: 'Doctor Schedule', icon: Calendar },
              { id: 'profile', label: 'Profile Settings', icon: User }
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === nav.id 
                      ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-300' 
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

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{activeTab === 'profile' ? 'Profile Settings' : 'Doctor Workspace'}</h2>
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
        {activeTab === 'schedule' && (
          <div className="flex-1 flex flex-col xl:flex-row gap-6">
          {/* Left Side: Agenda Calendar and Availability Scheduler */}
        <div className="flex-1 space-y-6">
          {/* Section: Appointment list */}
          <section className="glass-card rounded-xl p-5">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              <span>Today's Consultation Schedule</span>
            </h3>
            
            {loadingAppts ? (
              <div className="text-xs text-slate-500 py-6 animate-pulse">Loading consultations...</div>
            ) : appointments.length === 0 ? (
              <div className="text-xs text-slate-500 py-6">No appointments booked today.</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {appointments.map((appt) => (
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
                        <span>{appt.start_time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Availability Editor */}
          <section className="glass-card rounded-xl p-5">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              <span>Define Slot Availability</span>
            </h3>

            {/* Create Slot */}
            <form onSubmit={handleAddAvailability} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">Day</label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">Start Time</label>
                <input
                  type="text"
                  placeholder="09:00:00"
                  required
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">End Time</label>
                <input
                  type="text"
                  placeholder="17:00:00"
                  required
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full btn-primary py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Slot</span>
                </button>
              </div>
            </form>

            {/* List Active slots */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">Active Calendar Hours</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto">
                {availabilities.length === 0 ? (
                  <div className="text-[10px] text-slate-500 col-span-2">No availability configured.</div>
                ) : (
                  availabilities.map((av) => (
                    <div key={av.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg flex items-center justify-between">
                      <div className="text-xs text-slate-300">
                        <span className="font-semibold">{getDayName(av.day_of_week)}:</span> {av.start_time} - {av.end_time}
                      </div>
                      <button
                        onClick={() => handleDeleteAvailability(av.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/5 p-1 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
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
                {/* Actions: Complete / No Show */}
                <div className="flex gap-2">
                  {selectedAppt.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => updateStatus(selectedAppt.id, 'completed')}
                        className="bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Attended</span>
                      </button>
                      <button
                        onClick={() => updateStatus(selectedAppt.id, 'no_show')}
                        className="bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 text-red-400 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>No-Show</span>
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
                    className="flex-1 btn-primary py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
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
                  <img src={profilePicPreview} alt="Avatar Preview" className="h-16 w-16 rounded-full object-cover border-2 border-emerald-500/30 shrink-0" onError={() => setProfilePicPreview('')} />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0">
                    {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : 'MD'}
                  </div>
                )}
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Profile Picture URL</label>
                  <input 
                    type="text" 
                    value={profilePic} 
                    onChange={(e) => { setProfilePic(e.target.value); setProfilePicPreview(e.target.value); }} 
                    placeholder="https://images.unsplash.com/photo-..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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
                    onChange={(e) => setPhone(e.target.value)} 
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
                  <label className="text-xs text-slate-400 font-medium">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h4 className="text-sm font-semibold text-white">Change Password</h4>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">New Password (leave empty to keep current)</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Enter new password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={savingProfile} 
                className="w-full btn-primary py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                {savingProfile ? 'Saving updates...' : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
