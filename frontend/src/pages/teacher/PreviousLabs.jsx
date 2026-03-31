import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Search, MapPin, Calendar, Clock, Users, ArrowLeft, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function PreviousLabs() {
  const [step, setStep] = useState(1);
  const [historyFeed, setHistoryFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Drill-down state
  const [selectedLab, setSelectedLab] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/attendance/history');
      setHistoryFeed(res.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load history feed');
      setLoading(false);
    }
  };

  const openDetailedRoster = async (lab) => {
    setSelectedLab(lab);
    setStep(2);
    setRosterLoading(true);
    try {
      // Force exact subject extraction to guarantee isolation
      const res = await api.get(`/attendance/${lab.room_id}?date=${lab.date}&subject=${encodeURIComponent(lab.subject)}`);
      setRoster(res.data);
    } catch (err) {
      toast.error('Failed to load detailed roster');
    }
    setRosterLoading(false);
  };

  // Filter feed by search string (subject, room, or date)
  const filteredFeed = historyFeed.filter(lab => 
    !search || 
    lab.subject?.toLowerCase().includes(search.toLowerCase()) || 
    lab.room_id?.toLowerCase().includes(search.toLowerCase()) || 
    lab.date?.includes(search)
  );

  if (loading && step === 1) return <LoadingSpinner text="Aggregating your lab history..." />;

  // Format date nicely (e.g. "Monday, Oct 24, 2026")
  const niceDate = (dStr) => {
    const opts = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dStr).toLocaleDateString('en-US', opts);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {step === 1 && (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1>Previous Labs Feed</h1>
              <p>Your history of completed lab sessions across all assigned rooms and schedules.</p>
            </div>
            <div style={{ position: 'relative', minWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                className="input w-full" 
                placeholder="Search by Date (YYYY-MM-DD), Subject, or Room..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: '36px' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {filteredFeed.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3>No History Detected</h3>
                <p>You haven't conducted any labs that generated attendance records yet, or no matches found for your search.</p>
              </div>
            ) : (
              filteredFeed.map(lab => (
                <div key={lab.id} className="card hoverable" onClick={() => openDetailedRoster(lab)} style={{ cursor: 'pointer', padding: '1.5rem', borderLeft: '4px solid var(--primary)', transition: 'transform 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text)' }}>{lab.subject}</h2>
                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {niceDate(lab.date)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> Room {lab.room_id}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {lab.start_time} - {lab.end_time}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>{lab.present_count} / {lab.total_students}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Students Present</div>
                    </div>
                    <div style={{ background: 'var(--background)', padding: '10px', borderRadius: '50%', color: 'var(--primary)' }}>
                      <TrendingUp size={20} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {step === 2 && selectedLab && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--background), #f3f4f6)', borderBottom: '1px solid var(--border)' }}>
            <button className="btn" style={{ background: 'white', color: 'var(--text)', padding: '6px 12px', marginBottom: '1rem', border: '1px solid var(--border)' }} onClick={() => setStep(1)}>
              <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Return to Feed
            </button>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedLab.subject} — Detailed Roster</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
              {niceDate(selectedLab.date)} | {selectedLab.start_time} to {selectedLab.end_time} | Room {selectedLab.room_id}
            </p>
          </div>

          {rosterLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner text="Decrypting attendance parameters..." /></div>
          ) : roster.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No student records logged for this session.</div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Timestamps</th>
                    <th>Duration metrics</th>
                    <th>Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(st => (
                    <tr key={st._id}>
                      <td style={{ fontWeight: '600' }}>{st.roll_number || '—'}</td>
                      <td>{st.student_name}</td>
                      <td>
                        {st.status === 'present' ? <span className="badge badge-active"><CheckCircle size={12} style={{marginRight:'4px'}}/> Present</span> :
                         st.status === 'late' ? <span className="badge" style={{background:'#fef08a', color:'#a16207'}}><Clock size={12} style={{marginRight:'4px'}}/> Late</span> :
                         <span className="badge badge-inactive"><XCircle size={12} style={{marginRight:'4px'}}/> Absent</span>}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        In: {st.manually_marked ? 'N/A (Override)' : formatDT(st.entry_time)} <br/>
                        Out: {st.manually_marked ? 'N/A' : (formatDT(st.exit_time) !== '—' ? formatDT(st.exit_time) : (st.status === 'present' ? 'Lab Closed' : '—'))}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: '#065f46', fontWeight: '600' }}>{st.duration_minutes}m Present</span> <br/>
                        <span style={{ color: '#991b1b', opacity: 0.8 }}>{st.absent_duration_minutes}m Absent</span>
                      </td>
                      <td>
                         {st.manually_marked ? (
                           <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1d4ed8', background: '#dbeafe', padding: '4px 8px', borderRadius: '12px' }}>
                             Teacher Override
                           </span>
                         ) : (
                           <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>
                             Auto (ESP32)
                           </span>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
