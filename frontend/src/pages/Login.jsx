import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [tab, setTab] = useState('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const endpoint = tab === 'teacher' ? '/auth/teacher/login' : '/auth/student/login';
      const res = await api.post(endpoint, { email, password });
      login(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #2563eb 100%)', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <GraduationCap size={32} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.875rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Position Monitoring</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginTop: '4px' }}>Location & Attendance System</p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem' }}>
            {['teacher', 'student'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setEmail(''); setPassword(''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', transition: 'all 0.2s',
                  background: tab === t ? 'white' : 'transparent',
                  color: tab === t ? '#1e40af' : '#64748b',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {t === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Email Address</label>
              <input
                type="email"
                className="input"
                placeholder={tab === 'teacher' ? 'teacher1@college.edu' : 'student1@college.edu'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ color: '#1e293b', background: '#f8fafc' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="password123"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ color: '#1e293b', background: '#f8fafc', paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: 'white',
                fontWeight: '700', fontSize: '0.95rem', transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Signing in...' : `Sign in as ${tab === 'teacher' ? 'Teacher' : 'Student'}`}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
