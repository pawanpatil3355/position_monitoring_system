import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, MapPin, User } from 'lucide-react';

export default function LabSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/schedule'),
      api.get('/teachers')
    ])
    .then(([sRes, tRes]) => {
      const tMap = {};
      tRes.data.forEach(t => tMap[t.teacher_id] = t.name);
      setTeachers(tMap);
      
      // Sort schedule by days of week
      const daysOrder = { 'Monday':1, 'Tuesday':2, 'Wednesday':3, 'Thursday':4, 'Friday':5 };
      const sorted = sRes.data.sort((a, b) => (daysOrder[a.day] || 99) - (daysOrder[b.day] || 99));
      setSchedules(sorted);
      setLoading(false);
    })
    .catch(() => {
      toast.error('Failed to load schedule');
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner text="Loading lab schedule..." />;

  const todayStr = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <h1>Weekly Lab Schedule</h1>
        <p>10:30 AM to 12:30 PM</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {schedules.map(s => {
          const isToday = s.day === todayStr;
          return (
            <div key={s._id} className="card" style={{ 
              border: isToday ? '2px solid var(--primary-light)' : '1px solid var(--border)',
              background: isToday ? '#eff6ff' : 'var(--card-bg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text)' }}>{s.day}</div>
                {isToday && <span className="badge badge-active">Today's Lab</span>}
              </div>
              
              <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                {s.subject}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <User size={16} />
                  <span>{teachers[s.teacher_id] || s.teacher_id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Clock size={16} />
                  <span>{s.start_time} - {s.end_time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <MapPin size={16} />
                  <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{s.room_id}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
