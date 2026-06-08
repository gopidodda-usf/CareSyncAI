import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Activity, Shield, Mail, Lock, User as UserIcon, Phone, Calendar, Clipboard } from 'lucide-react';

export default function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('patient'); // 'patient', 'doctor', 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bio, setBio] = useState('');
  const [fee, setFee] = useState('80.00');
  
  // Specialties and clinics for doctor registration
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'patient') navigate('/patient');
      else if (user.role === 'doctor') navigate('/doctor');
      else if (user.role === 'admin') navigate('/admin');
    }
  }, [user, navigate]);

  // Load specialties and clinics on signup toggle
  useEffect(() => {
    if (!isLogin && role === 'doctor') {
      const loadConfig = async () => {
        try {
          // Temporarily request without auth to populate registry lists
          const [specRes, clinicRes] = await Promise.all([
            API.get('/api/admin/specialties', { headers: { Authorization: '' } }), // wait, bypass token
            API.get('/api/admin/clinics', { headers: { Authorization: '' } })
          ]);
          setSpecialties(specRes.data || []);
          setClinics(clinicRes.data || []);
          if (specRes.data?.length) setSelectedSpecialty(specRes.data[0].id);
          if (clinicRes.data?.length) setSelectedClinic(clinicRes.data[0].id);
        } catch (err) {
          // If admin list fails, use fallbacks
          setSpecialties([
            { id: 1, name: "General Medicine" },
            { id: 2, name: "Cardiology" },
            { id: 3, name: "Pediatrics" },
            { id: 4, name: "Dermatology" }
          ]);
          setClinics([
            { id: 1, name: "CareSync Central Hospital" },
            { id: 2, name: "CareSync Westside Family Clinic" }
          ]);
          setSelectedSpecialty(1);
          setSelectedClinic(1);
        }
      };
      loadConfig();
    }
  }, [isLogin, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        const profile = await login(email, password);
        if (profile.role === 'patient') navigate('/patient');
        else if (profile.role === 'doctor') navigate('/doctor');
        else if (profile.role === 'admin') navigate('/admin');
      } else {
        const payload = {
          email,
          password,
          role,
          first_name: firstName,
          last_name: lastName,
          phone,
          date_of_birth: role === 'patient' ? dob : null,
          gender: role === 'patient' ? gender : null,
          specialty_id: role === 'doctor' ? parseInt(selectedSpecialty) : null,
          clinic_id: role === 'doctor' ? parseInt(selectedClinic) : null,
          bio: role === 'doctor' ? bio : null,
          consultation_fee: role === 'doctor' ? parseFloat(fee) : 0.0
        };
        const profile = await register(payload);
        if (profile.role === 'patient') navigate('/patient');
        else if (profile.role === 'doctor') navigate('/doctor');
        else if (profile.role === 'admin') navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Please check credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 bg-radial-glow">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 animate-pulse-slow">
        <div className="bg-sky-500/15 p-2 rounded-xl border border-sky-500/25">
          <Activity className="h-8 w-8 text-sky-400" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1">
            CareSync <span className="text-sky-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Healthcare Appointment & Intelligence Platform</p>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-lg glass-card rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Tab Controls (Only shown for Sign Up) */}
        {!isLogin && (
          <div className="flex bg-slate-900/60 p-1 rounded-lg mb-6 border border-slate-800">
            {['patient', 'doctor', 'admin'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRole(t)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                  role === t ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-6 text-center">
          {isLogin ? 'Sign In to CareSync AI' : `Create ${role.toUpperCase()} Account`}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-200 text-xs px-4 py-2.5 rounded-lg mb-6 flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          {/* Registration Details */}
          {!isLogin && (
            <div className="space-y-4 pt-2 border-t border-slate-900">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">First Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="555-0100"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Patient Fields */}
              {role === 'patient' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        onClick={(e) => e.target.showPicker()}
                        onFocus={(e) => e.target.showPicker()}
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-all"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Doctor Fields */}
              {role === 'doctor' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Specialty</label>
                      <select
                        value={selectedSpecialty}
                        onChange={(e) => setSelectedSpecialty(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-all"
                      >
                        {specialties.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Clinic</label>
                      <select
                        value={selectedClinic}
                        onChange={(e) => setSelectedClinic(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-all"
                      >
                        {clinics.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-medium text-slate-300">Consultation Fee ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={fee}
                        onChange={(e) => setFee(e.target.value)}
                        placeholder="80.00"
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Professional Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share a brief overview of your clinical experience..."
                      rows="3"
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all resize-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3 mt-6 text-sm font-semibold rounded-lg hover:shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : isLogin ? 'Sign In' : 'Register Profile'}
          </button>
        </form>

        {/* Form Toggle Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs text-sky-400 hover:text-sky-300 transition-all"
          >
            {isLogin ? "New to CareSync? Sign up here" : "Already have an account? Sign in here"}
          </button>
        </div>
      </div>
    </div>
  );
}
