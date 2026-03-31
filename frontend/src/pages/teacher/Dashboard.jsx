import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { usePolling } from '../../hooks/usePolling';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { MapPin, Clock, Users, CalendarCheck, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function TeacherDashboard() {
  const [profile, setProfile] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    try {
      // 1. Get profile, teachers, and rooms
      const [pRes, tRes, rRes] = await Promise.all([
        api.get('/profile'),
        api.get('/teachers'),
        api.get('/rooms')
      ]);
      const teacher = pRes.data;
      setProfile(teacher);
      setTeachers(tRes.data);
      setRooms(rRes.data);

      // 2. Find today's active schedule for this teacher (filters out labs that have already ended)
      const sRes = await api.get('/schedule');
      const today = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
      const currentLab = sRes.data.find(s => {
        if (s.teacher_id !== teacher.teacher_id || s.day !== today || !s.is_active) return false;
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [eH, eM] = s.end_time.split(':').map(Number);
        return currentMins <= (eH * 60 + eM);
      });
      setTodaySchedule(currentLab);

      // 3. If they have a lab today, fetch attendance for that room today to generate stats
      if (currentLab) {
        const nowLocal = new Date();
        const y = nowLocal.getFullYear();
        const m = String(nowLocal.getMonth() + 1).padStart(2, '0');
        const d = String(nowLocal.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        
        const aRes = await api.get(`/attendance/${currentLab.room_id}?date=${dateStr}&subject=${encodeURIComponent(currentLab.subject)}`);
        const total = aRes.data.length;
        const present = aRes.data.filter(r => r.status === 'present' || r.status === 'late').length;
        setStats({ total, present, absent: total - present });
      }

      setLastRefresh(new Date());
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  usePolling(fetchData, 2000);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Welcome, {profile?.name}</h1>
          <p>Teacher Dashboard — auto-refreshes every 2 seconds</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <RefreshCw size={14} />
          <span>Updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {todaySchedule ? (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', color: 'white', border: 'none' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarCheck size={20} /> Today's Lab Assignment
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Subject</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{todaySchedule.subject}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Room</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> {todaySchedule.room_id}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Time</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {todaySchedule.start_time} - {todaySchedule.end_time}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>You have no scheduled labs for today.</p>
        </div>
      )}

      {/* Stats */}
      {todaySchedule && (
        <>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Today's Live Attendance Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dbeafe' }}><Users size={22} color="#1e40af" /></div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{stats.total}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Students Trailed</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#d1fae5' }}><CheckCircle size={22} color="#065f46" /></div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{stats.present}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Present</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fee2e2' }}><XCircle size={22} color="#991b1b" /></div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{stats.absent}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absent</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Peer Teacher Tracking */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', marginTop: '2.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)' }}>Live Peer Locations</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>🟢 {teachers.filter(t => t.is_active).length} In Class</span>
          <span className="badge badge-inactive" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>🔴 {teachers.length - teachers.filter(t => t.is_active).length} Away</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {teachers.map(t => {
          let rName = t.current_room;
          const matchedR = rooms.find(r => r.room_id === t.current_room);
          if (matchedR) rName = matchedR.room_name;
          
          return (
            <div key={t._id} className={`location-card ${t.is_active ? 'active' : 'inactive'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                  background: t.is_active ? '#10b981' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: '800', fontSize: '1.15rem',
                }}>
                  {t.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.subject}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <span className={`pulse-dot ${t.is_active ? 'green' : 'red'}`} />
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: t.is_active ? '#065f46' : '#991b1b' }}>
                    {t.is_active ? 'In Class' : 'Away'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} />
                    <span>{t.is_active ? rName : 'Not in class'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Clock size={13} />
                    <span>{timeAgo(t.last_seen)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
