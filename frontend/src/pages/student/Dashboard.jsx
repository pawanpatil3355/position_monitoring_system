import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { usePolling } from '../../hooks/usePolling';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { MapPin, Clock, RefreshCw, CalendarCheck, TrendingUp, AlertTriangle } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function StudentDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    try {
      const [tRes, rRes, aRes] = await Promise.all([
        api.get('/teachers'), 
        api.get('/rooms'),
        api.get('/attendance/me')
      ]);
      setTeachers(tRes.data);
      setRooms(rRes.data);
      setAttendanceStats(aRes.data);
      setLastRefresh(new Date());
      setLoading(false);
    } catch (err) {
      toast.error('Failed to fetch data');
      setLoading(false);
    }
  };

  usePolling(fetchData, 10000);

  const roomMap = {};
  rooms.forEach(r => { roomMap[r.room_id] = r.room_name; });
  const activeCount = teachers.filter(t => t.is_active).length;

  if (loading) return <LoadingSpinner text="Loading..." />;

  const pct = attendanceStats?.percentage || 0;
  const isWarning = pct < 75;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Student Dashboard</h1>
          <p>Quick stats and live teacher locations — updates every 10s</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <RefreshCw size={14} />
          <span>Updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Quick Stats */}
      {attendanceStats && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe' }}><CalendarCheck size={22} color="#1e40af" /></div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{attendanceStats.total}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Labs So Far</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5' }}><Clock size={22} color="#065f46" /></div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{attendanceStats.present}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Labs Attended</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: isWarning ? '#fee2e2' : '#d1fae5' }}>
              {isWarning ? <AlertTriangle size={22} color="#b91c1c" /> : <TrendingUp size={22} color="#065f46" />}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: isWarning ? '#dc2626' : '#16a34a' }}>{pct}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Percentage</div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Tracking */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Live Teacher Locations</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>🟢 {activeCount} In Class</span>
          <span className="badge badge-inactive" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>🔴 {teachers.length - activeCount} Away</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {teachers.map(teacher => (
          <div key={teacher._id} className={`location-card ${teacher.is_active ? 'active' : 'inactive'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                background: teacher.is_active ? '#10b981' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: '800', fontSize: '1.15rem',
              }}>
                {teacher.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)' }}>{teacher.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{teacher.subject}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                <span className={`pulse-dot ${teacher.is_active ? 'green' : 'red'}`} />
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: teacher.is_active ? '#065f46' : '#991b1b' }}>
                  {teacher.is_active ? 'In Class' : 'Away'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <MapPin size={13} />
                  <span>{teacher.is_active ? (roomMap[teacher.current_room] || teacher.current_room || 'Unknown') : 'Not in class'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Clock size={13} />
                  <span>{timeAgo(teacher.last_seen)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
