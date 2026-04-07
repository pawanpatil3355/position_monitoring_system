import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { usePolling } from '../../hooks/usePolling';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Search, Filter, Download } from 'lucide-react';

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function displayExitTime(r) {
  if (r.exit_time) return formatDT(r.exit_time);
  if (r.class_end_time && Date.now() > new Date(r.class_end_time).getTime()) {
    return formatDT(r.class_end_time);
  }
  return '—';
}

export default function AttendanceMonitor() {
  const [rooms, setRooms] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [schedules, setSchedules] = useState([]);
  useEffect(() => {
    Promise.all([api.get('/rooms'), api.get('/profile'), api.get('/schedule')])
      .then(([rRes, pRes, sRes]) => {
        const teacher_id = pRes.data.teacher_id;
        // List rooms this teacher is assigned to
        const mySchedules = sRes.data.filter(s => s.teacher_id === teacher_id);
        setSchedules(mySchedules);

        const myRoomIds = [...new Set(mySchedules.map(s => s.room_id))];
        const myRooms = rRes.data.filter(r => myRoomIds.includes(r.room_id));
        setRooms(myRooms);
      })
      .catch(() => { });
  }, []);

  const getActiveSchedule = () => {
    if (!selectedRoom) return null;
    const today = new Date();

    const selD = new Date(selectedDate);
    if (selD.toDateString() !== today.toDateString()) return null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];

    const activeForRoom = schedules.filter(s => s.room_id === selectedRoom && s.day === todayName);
    const currentMins = today.getHours() * 60 + today.getMinutes();

    let matched = null;
    for (let s of activeForRoom) {
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      if (currentMins >= (sh * 60 + sm) - 1 && currentMins <= (eh * 60 + em)) {
        matched = s;
        break;
      }
    }
    return matched;
  };

  const isLabActive = () => !!getActiveSchedule();



  const loadData = async (showLoading = true) => {
    if (!selectedRoom) return;
    if (showLoading) setLoading(true);
    try {
      const activeSched = getActiveSchedule();
      const params = { date: selectedDate };
      if (activeSched) params.subject = activeSched.subject;

      const r = await api.get(`/attendance/${selectedRoom}`, { params });
      setRecords(r.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [selectedRoom, selectedDate]);


  // Silent background polling every 2 seconds to fetch DB truth
  // and trigger react re-render for live timer updates
  usePolling(() => {
    if (isLabActive()) {
      loadData(false);
    }
  }, 2000, !!selectedRoom);

  const filtered = records.filter(r =>
    !search || r.student_name?.toLowerCase().includes(search.toLowerCase()) || r.roll_number?.includes(search)
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <h1>Attendance Monitor</h1>
        <p>View and filter student attendance records by room and date</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room</label>
            <select className="input" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
              <option value="">Select Room...</option>
              {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.room_name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Date</label>
            <input type="date" className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
          <div style={{ flex: '2 1 200px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" placeholder="Search by name or roll no..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary badges */}
      {records.length > 0 && isLabActive() && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {['present', 'late', 'absent'].map(s => (
            <span key={s} className={`badge badge-${s}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}: {records.filter(r => r.status === s).length}
            </span>
          ))}
          <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.85rem', padding: '6px 14px' }}>
            Total: {records.length}
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? <LoadingSpinner text="Loading attendance..." /> : (
        !selectedRoom ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Filter size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <p>Select a room to view attendance records</p>
          </div>
        ) : !isLabActive() ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Filter size={40} style={{ marginBottom: '1rem', opacity: 0.5, color: '#ef4444' }} />
            <p style={{ fontWeight: '500', fontSize: '1.1rem', color: '#ef4444' }}>Live monitoring disabled.</p>
            <p style={{ marginTop: '6px' }}>This class session is currently inactive or has already concluded.</p>
            <p style={{ marginTop: '2px', fontSize: '0.85rem' }}>Please open the <b>Previous Labs (History)</b> tab to review finalized attendance.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Entry Time</th>
                  <th>Exit Time</th>
                  <th>Disconnects</th>
                  <th>Status</th>
                  <th>Marked By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found</td></tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r._id} style={{ background: r.status === 'absent' ? '#fef2f2' : r.status === 'late' ? '#fffbeb' : '#f0fdf4' }}>
                      <td style={{ fontWeight: '600' }}>{r.student_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.roll_number}</td>
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
        )
      )}
    </div>
  );
}
