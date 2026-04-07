import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Save, AlertCircle, CalendarDays, Clock, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

export default function MarkAttendance() {
  const [step, setStep] = useState(1);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedLab, setSelectedLab] = useState(null);
  const [overrideDate, setOverrideDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Student state
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load available labs on mount
  useEffect(() => {
    Promise.all([api.get('/profile'), api.get('/schedule')])
      .then(([pRes, sRes]) => {
        const teacher_id = pRes.data.teacher_id;
        
        // Get unique labs (by subject and room) taught by this teacher
        const mySchedules = sRes.data.filter(s => s.teacher_id === teacher_id);
        const uniqueMap = {};
        mySchedules.forEach(s => {
          const key = s.room_id + '_' + s.subject;
          if (!uniqueMap[key]) {
             uniqueMap[key] = {
               room_id: s.room_id,
               subject: s.subject,
               default_start: s.start_time,
               default_end: s.end_time
             };
          }
        });
        
        setLabs(Object.values(uniqueMap));
        setLoading(false);
      })
      .catch(err => {
        toast.error('Failed to load assignments');
        setLoading(false);
      });
  }, []);

  const handleLabSelect = (lab) => {
    setSelectedLab(lab);
    setStartTime(lab.default_start);
    setEndTime(lab.default_end);
    setStep(2);
  };

  const fetchRoster = async () => {
    if (!overrideDate || !startTime || !endTime) {
      toast.error('Please fill in Date and Timings');
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Students
      const stRes = await api.get('/students');
      
      // 2. Fetch existing history for this room and date to preload ESP32-saved statuses
      const attRes = await api.get(`/attendance/${selectedLab.room_id}?date=${overrideDate}`);
      const existMap = {};
      attRes.data.forEach(a => existMap[a.student_id] = a.status);

      // Students scanned by ESP32 get their saved status; unscanned students default to 'absent'
      const merged = stRes.data
        .map(s => ({
          student_id: s.student_id,
          name: s.name,
          roll_number: s.roll_number,
          // If ESP32 has a record → use it; otherwise → absent by default
          status: existMap[s.student_id] || 'absent',
          scannedByEsp32: !!existMap[s.student_id]
        }))
        // Sort ascending by roll number (numeric)
        .sort((a, b) => Number(a.roll_number) - Number(b.roll_number));

      setStudents(merged);
      setStep(3);
    } catch (err) {
      toast.error('Failed to fetch roster');
    }
    setLoading(false);
  };

  const handleStatusChange = (student_id, newStatus) => {
    setStudents(prev => prev.map(s => s.student_id === student_id ? { ...s, status: newStatus } : s));
  };

  const submitAttendance = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({ student_id: s.student_id, status: s.status }));
      await api.post('/attendance/mark', { 
         room_id: selectedLab.room_id, 
         records,
         date: overrideDate,
         start_time: startTime,
         end_time: endTime
      });
      toast.success('Historical Attendance successfully injected!');
      setStep(1); // Return to home
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed');
    }
    setSaving(false);
  };

  if (loading && step === 1) return <LoadingSpinner text="Loading Assigned Labs..." />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>Manual Attendance Override</h1>
        <p>Inject or override historical ESP32 attendance data by selecting an assigned lab and setting custom timeframes.</p>
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          {labs.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
               <AlertCircle size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
               <p>No labs are assigned to your profile.</p>
            </div>
          ) : (
            labs.map((lab, i) => (
              <div key={i} className="card hoverable" onClick={() => handleLabSelect(lab)} style={{ cursor: 'pointer', transition: 'transform 0.2s', borderTop: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                   <div style={{ padding: '12px', background: 'var(--primary-light)', borderRadius: '12px', color: 'var(--primary)' }}>
                     <FileText size={24} />
                   </div>
                   <div>
                     <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{lab.subject}</h3>
                     <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Room: {lab.room_id}</p>
                   </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                   <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                     Select Lab <ArrowRight size={14} />
                   </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          <button className="btn" style={{ background: 'transparent', color: 'var(--text-muted)', padding: 0, marginBottom: '1.5rem' }} onClick={() => setStep(1)}>
            <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Labs
          </button>
          
          <h2 style={{ marginBottom: '0.5rem' }}>{selectedLab?.subject}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Define the date and time boundaries you wish to override for Room {selectedLab?.room_id}.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px' }}>
                <CalendarDays size={16} color="var(--primary)" /> Selection Date
              </label>
              <input type="date" className="input w-full" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Clock size={16} color="var(--primary)" /> Start Time
                </label>
                <input type="time" className="input w-full" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Clock size={16} color="var(--primary)" /> End Time
                </label>
                <input type="time" className="input w-full" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary w-full" style={{ marginTop: '1rem', height: '45px', fontSize: '1rem' }} onClick={fetchRoster} disabled={loading}>
              {loading ? 'Loading...' : 'Load Class Roster'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '1.5rem' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <button className="btn" style={{ background: 'transparent', color: 'var(--text-muted)', padding: 0, marginBottom: '0.5rem' }} onClick={() => setStep(2)}>
                <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Edit Parameters
              </button>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Roster: {selectedLab?.subject}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                {overrideDate} | {startTime} to {endTime} | Room {selectedLab?.room_id}
              </p>
            </div>
            <button onClick={submitAttendance} disabled={saving} className="btn btn-primary">
              <Save size={18} style={{ marginRight: '6px' }} /> {saving ? 'Injecting...' : 'Save Overrides'}
            </button>
          </div>

          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Status Override</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.student_id}>
                    <td style={{ fontWeight: '600' }}>{s.roll_number}</td>
                    <td>{s.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.student_id}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#065f46', fontSize: '0.9rem', fontWeight: s.status === 'present' ? '600' : '400' }}>
                          <input type="radio" checked={s.status === 'present'} onChange={() => handleStatusChange(s.student_id, 'present')} /> Present
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#a16207', fontSize: '0.9rem', fontWeight: s.status === 'late' ? '600' : '400' }}>
                          <input type="radio" checked={s.status === 'late'} onChange={() => handleStatusChange(s.student_id, 'late')} /> Late
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#b91c1c', fontSize: '0.9rem', fontWeight: s.status === 'absent' ? '600' : '400' }}>
                          <input type="radio" checked={s.status === 'absent'} onChange={() => handleStatusChange(s.student_id, 'absent')} /> Absent
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
