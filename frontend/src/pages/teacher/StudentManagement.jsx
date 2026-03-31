import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Search, X, UserPlus } from 'lucide-react';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', name: '', email: '', password: '', roll_number: '', class: '', bluetooth_name: '' });
  const [modalLoading, setModalLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([api.get('/students'), api.get('/rooms')]);
      setStudents(sRes.data);
      setRooms(rRes.data);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.name || !form.email || !form.password) {
      toast.error('ID, Name, Email and Password are required');
      return;
    }
    setModalLoading(true);
    try {
      await api.post('/students', form);
      toast.success('Student added successfully!');
      setModal(false);
      setForm({ student_id: '', name: '', email: '', password: '', roll_number: '', class: '', bluetooth_name: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally { setModalLoading(false); }
  };

  const handleDelete = async (student_id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await api.delete(`/students/${student_id}`);
      toast.success('Student removed');
      setStudents(prev => prev.filter(s => s.student_id !== student_id));
    } catch { toast.error('Failed to delete student'); }
  };

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.includes(search) || s.class?.includes(search)
  );

  if (loading) return <LoadingSpinner text="Loading students..." />;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Student Management</h1>
          <p>{students.length} students registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <UserPlus size={16} /> Add Student
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search by name, roll number, or class..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px' }} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Roll No.</th>
              <th>Class</th>
              <th>BT Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s._id}>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.student_id}</td>
                <td style={{ fontWeight: '600' }}>
                  <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--primary-light)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.78rem', marginRight: '8px' }}>
                    {s.name.charAt(0)}
                  </span>
                  {s.name}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                <td>{s.roll_number}</td>
                <td><span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>{s.class}</span></td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.bluetooth_name || '—'}</td>
                <td>
                  <span className={`badge ${s.is_present ? 'badge-present' : 'badge-inactive'}`}>
                    {s.is_present ? 'Present' : 'Absent'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={() => handleDelete(s.student_id)}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Add New Student</h2>
              <button onClick={() => setModal(false)} className="btn btn-ghost" style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd}>
              {[
                { label: 'Student ID', key: 'student_id', placeholder: 'STU011' },
                { label: 'Full Name', key: 'name', placeholder: 'John Doe' },
                { label: 'Email', key: 'email', placeholder: 'student@college.edu', type: 'email' },
                { label: 'Password', key: 'password', placeholder: 'password123', type: 'password' },
                { label: 'Roll Number', key: 'roll_number', placeholder: 'CS2021011' },
                { label: 'Class', key: 'class', placeholder: 'CS-A' },
                { label: 'Bluetooth Name', key: 'bluetooth_name', placeholder: 'PHONE_STU011' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '0.875rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                  <input
                    type={f.type || 'text'} className="input"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }} disabled={modalLoading}>
                {modalLoading ? 'Adding...' : 'Add Student'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
