import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { 
  Activity, LogOut, Users, Heart, Clipboard, Layers, Plus, 
  MapPin, Phone, Building, Briefcase, HelpCircle, User,
  Search, ArrowUp, ArrowDown, X
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
  const [savingUser, setSavingUser] = useState(false);
  const [saveUserError, setSaveUserError] = useState('');
  const [saveUserMessage, setSaveUserMessage] = useState('');

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
    setEditEmail(usr.email || '');
    setEditRole(usr.role || '');
    setEditPassword('');
    setSaveUserMessage('');
    setSaveUserError('');
    
    if (usr.role === 'admin') {
      setEditName(usr.name || '');
      setEditFirstName('');
      setEditLastName('');
      setEditPhone('');
    } else {
      setEditName('');
      setEditFirstName(usr.first_name || '');
      setEditLastName(usr.last_name || '');
      setEditPhone(usr.phone || '');
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    setSaveUserMessage('');
    setSaveUserError('');

    // If password is provided, validate length
    if (editPassword && editPassword.length < 6) {
      setSaveUserError('Password must be at least 6 characters long');
      setSavingUser(false);
      return;
    }

    // Phone format validation (if patient/doctor and phone is set)
    if (editRole !== 'admin' && editPhone) {
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
      if (!phoneRegex.test(editPhone)) {
        setSaveUserError('Phone number must be in XXX-XXX-XXXX format');
        setSavingUser(false);
        return;
      }
    }

    try {
      const payload = {
        email: editEmail,
        role: editRole,
        name: editRole === 'admin' ? editName : undefined,
        first_name: editRole !== 'admin' ? editFirstName : undefined,
        last_name: editRole !== 'admin' ? editLastName : undefined,
        phone: editRole !== 'admin' ? editPhone : undefined,
        password: editPassword || undefined
      };

      await API.put(`/api/admin/users/${editingUser.id}`, payload);
      setSaveUserMessage('User details updated successfully!');
      
      // Reload users list
      loadUsers();

      // If we edited ourselves, reload our auth user details
      if (editingUser.id === user.id) {
        reloadUser();
      }

      // Close modal after 1.5 seconds on success
      setTimeout(() => {
        setEditingUser(null);
      }, 1500);

    } catch (err) {
      console.error(err);
      setSaveUserError(err.response?.data?.detail || 'Failed to update user details.');
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
            {user?.profile_picture && !avatarError ? (
              <img 
                src={user.profile_picture} 
                alt="Avatar" 
                className="h-10 w-10 rounded-full object-cover border border-sky-500/30 shrink-0" 
                onError={() => setAvatarError(true)}
              />
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
              <>
                {/* Search, Filter and Sort Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-slate-900/30 border border-slate-800/80">
                  {/* Search Bar */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by ID, name, or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
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

                  {/* Filters & Sort options */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Segregation Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Role</span>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
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
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
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
                        <ArrowUp className="h-3.5 w-3.5 text-sky-400" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-sky-400" />
                      )}
                    </button>
                  </div>
                </div>

                {filteredAndSortedUsers.length === 0 ? (
                  <div className="text-xs text-slate-500 py-8 text-center bg-slate-900/10 border border-slate-800/50 rounded-lg">
                    No users match the search criteria or filter role.
                  </div>
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
                        {filteredAndSortedUsers.map((usr) => (
                          <tr key={usr.id} className="border-b border-slate-900/60 hover:bg-slate-900/20 text-slate-300">
                            <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">#{usr.id}</td>
                            <td className="py-3.5 px-4 font-semibold text-white">
                              <button
                                type="button"
                                onClick={() => openEditModal(usr)}
                                className="hover:text-sky-400 hover:underline transition-colors text-left font-semibold focus:outline-none"
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
                            <td className="py-3.5 px-4 text-slate-500">{new Date(usr.created_at).toLocaleDateString()}</td>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto">
            <div className="glass-card border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-sky-400" />
                <span>Edit User Credentials</span>
                <span className="text-xs text-slate-500 font-mono">#{editingUser.id}</span>
              </h3>

              {saveUserMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs px-4 py-2.5 mb-4 rounded-xl">
                  {saveUserMessage}
                </div>
              )}
              {saveUserError && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-200 text-xs px-4 py-2.5 mb-4 rounded-xl">
                  {saveUserError}
                </div>
              )}

              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                
                {/* Role selection */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Access Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Conditional Fields based on Role */}
                {editRole === 'admin' ? (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Administrative Display Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="CareSync Admin"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium">First Name</label>
                        <input
                          type="text"
                          required
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="John"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium">Last Name</label>
                        <input
                          type="text"
                          required
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Doe"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Phone Number (XXX-XXX-XXXX)</label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={handleEditPhoneChange}
                        placeholder="813-925-4422"
                        maxLength={12}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </>
                )}

                {/* Password reset */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Reset Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="bg-sky-500 hover:bg-sky-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-lg px-4 py-2 text-xs text-white font-semibold shadow-lg shadow-sky-500/20 transition-all animate-all duration-200"
                  >
                    {savingUser ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

              </form>
            </div>
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">New Password</label>
                      <input 
                        type="password" 
                        value={adminNewPassword} 
                        onChange={(e) => setAdminNewPassword(e.target.value)} 
                        placeholder="Enter new password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={adminConfirmPassword} 
                        onChange={(e) => setAdminConfirmPassword(e.target.value)} 
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
    </div>
  );
}
