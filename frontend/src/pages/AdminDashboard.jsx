import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { 
  Activity, LogOut, Users, Heart, Clipboard, Layers, Plus, 
  MapPin, Phone, Building, Briefcase, HelpCircle, User
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout, reloadUser } = useAuth();
  
  // Stats overview
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Chart reports
  const [charts, setCharts] = useState(null);
  const [loadingCharts, setLoadingCharts] = useState(true);

  // Users listing
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Clinic & Specialty list
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  // Create Clinic / Specialty states
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [specName, setSpecName] = useState('');
  const [specDesc, setSpecDesc] = useState('');

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'users', 'metadata', 'profile'

  // Profile fields state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminProfilePic, setAdminProfilePic] = useState('');
  const [adminProfilePicPreview, setAdminProfilePicPreview] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    loadOverview();
    loadCharts();
    loadMetadataLists();
  }, []);

  useEffect(() => {
    if (user) {
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
    try {
      await API.put('/api/admin/profile', {
        name: adminName,
        profile_picture: adminProfilePic,
        email: adminEmail,
        password: adminPassword || undefined
      });
      setProfileMessage('Your profile settings have been updated successfully!');
      setAdminPassword(''); // clear password field
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
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
        address: clinicAddress,
        phone: clinicPhone
      });
      setClinicName('');
      setClinicAddress('');
      setClinicPhone('');
      loadMetadataLists();
      alert("Clinic registered successfully!");
    } catch (err) {
      alert("Failed to register clinic");
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

  // Pie chart coloring
  const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

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
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Avatar" className="h-10 w-10 rounded-full object-cover border border-sky-500/30 shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold shrink-0">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider mb-0.5">Administrative Center</div>
              <div className="font-semibold text-white text-sm truncate">
                {user?.name || 'CareSync Admin'}
              </div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'analytics', label: 'Analytics Dashboard', icon: Activity },
              { id: 'users', label: 'Manage System Users', icon: Users },
              { id: 'metadata', label: 'Clinics & Specialties', icon: Layers }
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

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs text-slate-400">System metrics and configurations panel.</p>
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
            {/* Overview cards */}
            {loadingOverview ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-900/40 border border-slate-800 rounded-xl"></div>
                ))}
              </div>
            ) : overview ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "Total Users", value: overview.total_users, icon: Users, color: "text-sky-400" },
                  { title: "Total Patients", value: overview.total_patients, icon: Users, color: "text-emerald-400" },
                  { title: "Active Doctors", value: overview.total_doctors, icon: Heart, color: "text-indigo-400" },
                  { title: "Appointments booked", value: overview.total_appointments, icon: Clipboard, color: "text-pink-400" }
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div key={i} className="p-5 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">{card.title}</span>
                        <span className="text-2xl font-black text-white">{card.value}</span>
                      </div>
                      <Icon className={`h-8 w-8 ${card.color} opacity-40`} />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Charts Section */}
            {loadingCharts ? (
              <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Loading analytics visualization...</div>
            ) : charts ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Specialty Demand */}
                <div className="glass-card rounded-xl p-5 border border-slate-800">
                  <h4 className="text-sm font-bold text-white mb-4">Clinical Specialty Demand</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts.specialty_demand}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="specialty"
                        >
                          {charts.specialty_demand.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Peak Hours */}
                <div className="glass-card rounded-xl p-5 border border-slate-800">
                  <h4 className="text-sm font-bold text-white mb-4">Peak Appointment Booking Hours</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.peak_hours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                        <Bar dataKey="appointments" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Visit Trends */}
                <div className="glass-card rounded-xl p-5 border border-slate-800">
                  <h4 className="text-sm font-bold text-white mb-4">Weekly Patient Visit Trends</h4>
                  <div className="h-64">
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

                {/* Doctor Utilization */}
                <div className="glass-card rounded-xl p-5 border border-slate-800">
                  <h4 className="text-sm font-bold text-white mb-4">Top Doctor Capacity Utilization (%)</h4>
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
                <div className="glass-card rounded-xl p-5 border border-slate-800 lg:col-span-2">
                  <h4 className="text-sm font-bold text-white mb-4">Real-Time Clinic Wait-Time Analytics</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-400">
                          <th className="py-2.5">Medical Specialty</th>
                          <th className="py-2.5">Active Waiting Patients</th>
                          <th className="py-2.5">Baseline Wait Time</th>
                          <th className="py-2.5">Predicted Wait Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charts.wait_time_insights.map((wt, idx) => (
                          <tr key={idx} className="border-b border-slate-900/50 hover:bg-slate-900/20">
                            <td className="py-3 font-semibold text-white">{wt.specialty}</td>
                            <td className="py-3 text-slate-300">{wt.active_patients} patients</td>
                            <td className="py-3 text-slate-400">{wt.base_wait_min} mins</td>
                            <td className="py-3 text-sky-400 font-bold">{wt.predicted_wait_min} mins</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-card rounded-xl p-5 border border-slate-800">
            <h3 className="font-bold text-white text-base mb-4">System User Registry</h3>
            {loadingUsers ? (
              <div className="text-xs text-slate-500 py-6 animate-pulse">Loading system user directories...</div>
            ) : usersList.length === 0 ? (
              <div className="text-xs text-slate-500 py-6">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-4">UID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Access Role</th>
                      <th className="py-3 px-4">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="border-b border-slate-900/60 hover:bg-slate-900/20 text-slate-300">
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">#{usr.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{usr.name}</td>
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
                        <td className="py-3.5 px-4 text-slate-500">{new Date(usr.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Manage Clinics */}
            <div className="glass-card rounded-xl p-5 border border-slate-800 space-y-6">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building className="h-5 w-5 text-sky-400" />
                <span>Register Clinic Locations</span>
              </h3>

              {/* Create Clinic Form */}
              <form onSubmit={handleCreateClinic} className="space-y-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
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
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium">Address</label>
                  <input
                    type="text"
                    required
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    placeholder="120 Sunset Blvd, South Hills"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                  />
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
                <button
                  type="submit"
                  className="w-full btn-primary py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Clinic</span>
                </button>
              </form>

              {/* Clinics list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400">Registered Locations ({clinics.length})</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {clinics.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-lg flex items-center justify-between">
                      <div className="text-xs">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span>{c.address}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600">ID #{c.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Manage Specialties */}
            <div className="glass-card rounded-xl p-5 border border-slate-800 space-y-6">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-sky-400" />
                <span>Register Specialties</span>
              </h3>

              {/* Create Specialty Form */}
              <form onSubmit={handleCreateSpecialty} className="space-y-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
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
                    rows="2"
                    value={specDesc}
                    onChange={(e) => setSpecDesc(e.target.value)}
                    placeholder="Care for mental health conditions, cognitive therapies..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full btn-primary py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Specialty</span>
                </button>
              </form>

              {/* Specialties list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400">Registered Specialties ({specialties.length})</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {specialties.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-lg flex items-center justify-between">
                      <div className="text-xs">
                        <div className="font-semibold text-white">{s.name}</div>
                        <div className="text-slate-500 text-[10px] truncate max-w-xs">{s.description}</div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600">ID #{s.id}</span>
                    </div>
                  ))}
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
                    <img src={adminProfilePicPreview} alt="Avatar Preview" className="h-16 w-16 rounded-full object-cover border-2 border-sky-500/30 shrink-0" onError={() => setAdminProfilePicPreview('')} />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-lg shrink-0">
                      {adminName ? adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
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
                    <label className="text-xs text-slate-400 font-medium">Administrative Display Name</label>
                    <input 
                      type="text" 
                      required 
                      value={adminName} 
                      onChange={(e) => setAdminName(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={adminEmail} 
                      onChange={(e) => setAdminEmail(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h4 className="text-sm font-semibold text-white">Change Password</h4>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">New Password (leave empty to keep current)</label>
                    <input 
                      type="password" 
                      value={adminPassword} 
                      onChange={(e) => setAdminPassword(e.target.value)} 
                      placeholder="Enter new password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-sky-500"
                    />
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
    </div>
  );
}
