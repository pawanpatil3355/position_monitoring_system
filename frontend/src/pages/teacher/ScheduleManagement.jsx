import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Plus, Trash2, X } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ room_id: '', day: 'Monday', start_time: '09:00', end_time: '11:00' });

  const fetch = useCallback(async () => {
    try {
      const [sRes, rRes, pRes] = await Promise.all([api.get('/schedule'), api.get('/rooms'), api.get('/profile')]);
      setSchedules(sRes.data);
      setRooms(rRes.data);
      setProfile(pRes.data);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = {
         ...form,
         teacher_id: profile.teacher_id,
         subject: profile.subject || form.subject
      };
      await api.post('/schedule', payload);
      toast.success('Schedule added!');
      setModal(false);
      setForm({ room_id: '', day: 'Monday', start_time: '09:00', end_time: '11:00' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add schedule'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await api.delete(`/schedule/${id}`);
      toast.success('Schedule deleted');
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const roomMap = {}; rooms.forEach(r => { roomMap[r.room_id] = r.room_name; });

  if (loading) return <LoadingSpinner text="Loading schedules..." />;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Schedule Management</h1>
          <p>Set class times for each room and teacher</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      {/* Weekly View */}
      {DAYS.map(day => {
        // Only show schedules strictly assigned to the logged-in teacher
        const daySchedules = schedules.filter(s => s.day === day && s.teacher_id === profile?.teacher_id);
        if (daySchedules.length === 0) return null;
        return (
          <div key={day} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-light)', display: 'inline-block' }} />
              {day}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {daySchedules.map(s => (
                <div key={s._id} className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{s.subject}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                        👤 {profile?.name}<br />
                        🏫 {roomMap[s.room_id] || s.room_id}<br />
                        🕒 {s.start_time} — {s.end_time}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                      <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDelete(s._id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {schedules.filter(s => s.teacher_id === profile?.teacher_id).length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p>No schedules assigned to your profile. Add one to get started.</p>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700', fontSize: '1.1rem' }}>Add Schedule</h2>
              <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd}>
              {[
                { label: 'Room', key: 'room_id', type: 'select', options: rooms.map(r => ({ value: r.room_id, label: r.room_name })) },
                { label: 'Day', key: 'day', type: 'select', options: DAYS.map(d => ({ value: d, label: d })) },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '0.875rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                  <select className="input" required value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                    <option value="">Select {f.label}...</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Subject</label>
                <input className="input" value={profile?.subject || form.subject} readOnly={!!profile?.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Computer Science" style={{ background: profile?.subject ? 'var(--background)' : 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {['start_time', 'end_time'].map(k => (
                  <div key={k} style={{ flex: 1, marginBottom: '0.875rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                      {k === 'start_time' ? 'Start Time' : 'End Time'}
                    </label>
                    <input type="time" className="input" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Add Schedule</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
