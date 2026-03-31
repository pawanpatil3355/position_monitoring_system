import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ bluetooth_name: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/profile/me').then(r => {
      setProfile(r.data);
      setForm(f => ({ ...f, bluetooth_name: r.data.bluetooth_name || '' }));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile/me', form);
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
        <p>View your details and update your password</p>
      </div>

      {/* Avatar Card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #1e40af, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: '800', flexShrink: 0 }}>
          {profile?.name?.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{profile?.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile?.email}</div>
          <span className="badge badge-present" style={{ marginTop: '6px' }}>Student</span>
        </div>
      </div>

      {/* Info */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.875rem' }}>
          {[
            { label: 'Student ID', value: profile?.student_id },
            { label: 'Roll Number', value: profile?.roll_number },
            { label: 'Class', value: profile?.class },
            { label: 'Current Status', value: profile?.is_present ? '🟢 Present' : '🔴 Away' },
            { label: 'Current Room', value: profile?.current_room || '—' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontWeight: '600' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update Settings</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Bluetooth Name</label>
            <input className="input" value={form.bluetooth_name} onChange={e => setForm(p => ({ ...p, bluetooth_name: e.target.value }))} placeholder="e.g. PHONE_STU001" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change Password</h3>
            {[{ label: 'Current Password', key: 'currentPassword' }, { label: 'New Password', key: 'newPassword' }].map(f => (
              <div key={f.key} style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <input type="password" className="input" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="••••••••" />
              </div>
            ))}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
