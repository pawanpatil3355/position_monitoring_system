import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import {
  LayoutDashboard, Users, CalendarCheck, CalendarDays,
  BarChart3, ChevronLeft, ChevronRight
} from 'lucide-react';

const teacherNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance Monitor' },
  { to: '/previous-labs', icon: CalendarDays, label: 'Previous Labs (History)' },
  { to: '/mark-attendance', icon: Users, label: 'Mark Attendance' },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule' }
];

const studentNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-attendance', icon: CalendarCheck, label: 'My Attendance' },
  { to: '/lab-schedule', icon: CalendarDays, label: 'Lab Schedule' },
];

export default function Sidebar({ darkMode, toggleDark, mobileOpen, setMobileOpen }) {
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = isAdmin ? teacherNav : studentNav;

  return (
    <>
      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-[150] md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', minHeight: '60px', alignItems: 'center' }}>
          {/* Desktop Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded hover:bg-white/10"
            style={{ color: 'white', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          
          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 ml-auto"
            style={{ color: 'white', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>✕</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={20} className="icon" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: dark mode */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={toggleDark}
            className="nav-item w-full text-left"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
            {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
