import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

// Common
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

// Admin (Teacher)
import TeacherDashboard from './pages/teacher/Dashboard';
import AttendanceMonitor from './pages/teacher/AttendanceMonitor';
import PreviousLabs from './pages/teacher/PreviousLabs';
import MarkAttendance from './pages/teacher/MarkAttendance';
import ScheduleManagement from './pages/teacher/ScheduleManagement';
import TeacherProfile from './pages/teacher/Profile';

// User (Student)
import StudentDashboard from './pages/student/Dashboard';
import MyAttendance from './pages/student/MyAttendance';
import LabSchedule from './pages/student/LabSchedule';
import StudentProfile from './pages/student/Profile';

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex' }}><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function Layout({ children, darkMode, toggleDark }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  if (!user) return children;

  return (
    <div className={`app-layout ${darkMode ? 'dark' : ''}`}>
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <Sidebar 
        darkMode={darkMode} toggleDark={toggleDark} 
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
      />
      <main className="main-content">
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', minHeight: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDark = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem('darkMode', newDark);
    if (newDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  if (loading) return null;

  return (
    <Router>
      <Layout darkMode={darkMode} toggleDark={toggleDark}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

          {/* Shared Common Route - Resolves differently based on role */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              {user?.role === 'admin' ? <TeacherDashboard /> : <StudentDashboard />}
            </PrivateRoute>
          } />

          {/* Admin Routes (Teacher) */}
          <Route path="/attendance" element={<PrivateRoute role="admin"><AttendanceMonitor /></PrivateRoute>} />
          <Route path="/previous-labs" element={<PrivateRoute role="admin"><PreviousLabs /></PrivateRoute>} />
          <Route path="/mark-attendance" element={<PrivateRoute role="admin"><MarkAttendance /></PrivateRoute>} />
          <Route path="/schedule" element={<PrivateRoute role="admin"><ScheduleManagement /></PrivateRoute>} />
          <Route path="/profile" element={
            <PrivateRoute>
              {user?.role === 'admin' ? <TeacherProfile /> : <StudentProfile />}
            </PrivateRoute>
          } />

          {/* User Routes (Student) */}
          <Route path="/my-attendance" element={<PrivateRoute role="user"><MyAttendance /></PrivateRoute>} />
          <Route path="/lab-schedule" element={<PrivateRoute role="user"><LabSchedule /></PrivateRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ 
        style: { borderRadius: '10px', background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)' }
      }} />
    </AuthProvider>
  );
}
