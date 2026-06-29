import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Activity, Shield, Mail, Lock, User as UserIcon, Phone, Calendar, Clipboard } from 'lucide-react';

export default function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true);
  const role = 'patient';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [streetAddress1, setStreetAddress1] = useState('');
  const [streetAddress2, setStreetAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [county, setCounty] = useState('');
  
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
          date_of_birth: dob,
          gender: gender,
          street_address_1: streetAddress1,
          street_address_2: streetAddress2 || null,
          city,
          state,
          zip_code: zipCode,
          county
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

        <h2 className="text-xl font-bold text-white mb-6 text-center">
          {isLogin ? 'Sign In to CareSync AI' : 'Create Patient Account'}
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
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="123-456-7890"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

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

              {/* Address Fields */}
              <div className="pt-2 border-t border-slate-900 space-y-4">
                <h3 className="text-xs font-semibold text-sky-400 tracking-wider uppercase">Residential Address</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Street Address 1</label>
                  <input
                    type="text"
                    required
                    value={streetAddress1}
                    onChange={(e) => setStreetAddress1(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Street Address 2 (Optional)</label>
                  <input
                    type="text"
                    value={streetAddress2}
                    onChange={(e) => setStreetAddress2(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">County</label>
                    <input
                      type="text"
                      required
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className={`w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-all cursor-pointer ${!state ? 'text-white/40' : 'text-slate-100'}`}
                    >
                      <option value="" disabled className="text-slate-500">Choose State</option>
                      {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'].map((st) => (
                        <option key={st} value={st} className="text-white bg-slate-900">{st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Zip Code</label>
                    <input
                      type="text"
                      required
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>
                </div>
              </div>
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
