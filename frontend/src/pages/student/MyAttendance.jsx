import { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { CalendarCheck, Clock, TrendingUp } from 'lucide-react';

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function displayExitTime(r) {
  if (r.exit_time) return formatDT(r.exit_time);
  if (r.class_end_time && Date.now() > new Date(r.class_end_time).getTime()) {
    return formatDT(r.class_end_time);
  }
  return '—';
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MyAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/me')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load attendance'); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner text="Loading your attendance..." />;

  const { records = [], percentage = 0, total = 0, present = 0 } = data || {};
  const absent = total - present;

  const percentColor = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>Your complete attendance history and statistics</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}><CalendarCheck size={22} color="#1e40af" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Classes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}><Clock size={22} color="#065f46" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{present}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Classes Attended</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}><CalendarCheck size={22} color="#b91c1c" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{absent}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Classes Missed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: percentage >= 75 ? '#d1fae5' : percentage >= 50 ? '#fef9c3' : '#fee2e2' }}>
            <TrendingUp size={22} color={percentColor} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: percentColor }}>{percentage}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Percentage</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Overall Attendance</span>
          <span style={{ fontWeight: '800', color: percentColor }}>{percentage}%</span>
        </div>
        <div style={{ height: '12px', borderRadius: '6px', background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percentage}%`, background: percentColor, borderRadius: '6px', transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {percentage >= 75 ? '✅ Good standing — keep it up!' : percentage >= 50 ? '⚠️ Below recommended 75% — please attend more classes' : '❌ Critical — very low attendance!'}
        </div>
      </div>

      {/* Records table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Room</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Disconnects</th>
              <th>Status</th>
              <th>Marked By</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No attendance records found</td></tr>
            ) : (
              records.map(r => (
                <tr key={r._id} style={{ background: r.status === 'absent' ? '#fef2f2' : r.status === 'late' ? '#fffbeb' : '#f0fdf4' }}>
                  <td style={{ fontWeight: '500' }}>{formatDate(r.date)}</td>
                  <td style={{ fontWeight: '600' }}>{r.subject || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.teacher_id || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.room_id}</td>
                  <td>{r.entry_time ? formatDT(r.entry_time) : '—'}</td>
                  <td>{displayExitTime(r)}</td>
                  <td style={{ color: r.disconnect_count > 3 ? 'var(--danger)' : 'inherit', fontWeight: r.disconnect_count ? '600' : 'normal' }}>
                    {r.disconnect_count || 0}
                  </td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {r.manually_marked ? (r.marked_by || 'Teacher') : 'Auto (ESP32)'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
