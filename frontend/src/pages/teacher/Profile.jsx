import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { UserCircle, Save } from 'lucide-react';

export default function TeacherProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', subject: '', bluetooth_name: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/profile').then(r => {
      setProfile(r.data);
      setForm(f => ({ ...f, name: r.data.name, subject: r.data.subject || '', bluetooth_name: r.data.bluetooth_name || '' }));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put('/profile', form);
      setProfile(updated.data);
      toast.success('Profile updated!');
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px' }}>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account details</p>
      </div>

      {/* Avatar */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #1e40af, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: '800', flexShrink: 0 }}>
          {profile?.name?.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{profile?.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile?.email}</div>
          <span className="badge badge-active" style={{ marginTop: '6px' }}>Admin / Teacher</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="card">
          <h3 style={{ fontWeight: '700', marginBottom: '1.25rem', fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Details</h3>
          {[
            { label: 'Full Name', key: 'name' },
            { label: 'Subject', key: 'subject', placeholder: 'e.g. Computer Science' },
            { label: 'Bluetooth Beacon Name', key: 'bluetooth_name', placeholder: 'e.g. TEACHER_001' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
              <input className="input" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder || ''} />
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change Password</h3>
            {[
              { label: 'Current Password', key: 'currentPassword' },
              { label: 'New Password', key: 'newPassword' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <input type="password" className="input" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="••••••••" />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Account Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Teacher ID:</span> <strong>{profile?.teacher_id}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Role:</span> <strong>Admin</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Current Room:</span> <strong>{profile?.current_room || '—'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong>{profile?.is_active ? '🟢 Active' : '🔴 Away'}</strong></div>
          </div>
        </div>
      </form>
    </div>
  );
}
