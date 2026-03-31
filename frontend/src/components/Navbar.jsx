import { useState, useRef, useEffect } from 'react';
import { GraduationCap, Menu, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ mobileOpen, setMobileOpen }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    navigate('/profile');
  };

  return (
    <nav className="navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="flex items-center gap-3">
        <button
          className="md:hidden flex items-center justify-center mr-2 hover:bg-white/10 p-1 rounded-md cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu size={24} />
        </button>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--primary-light)' }}>
          <GraduationCap size={22} color="white" />
        </div>
        <div>
          <div className="text-white font-bold text-lg leading-tight tracking-wide">Position Monitoring</div>
          <div className="text-xs text-blue-300">{isAdmin ? 'Teacher Portal' : 'Student Portal'}</div>
        </div>
      </div>

      {/* Right side: Profile Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:ring-2 ring-white/30 transition-all shadow-sm"
          style={{ background: 'var(--primary-light)', border: 'none' }}
        >
          {user?.name?.charAt(0).toUpperCase()}
        </button>

        {dropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-header">
              <h4>{user.name}</h4>
              <p>{user.email}</p>
            </div>
            <div className="dropdown-body">
              <button onClick={handleSettings} className="dropdown-item">
                <Settings size={18} />
                Settings & Privacy
              </button>
              <button onClick={handleLogout} className="dropdown-item danger">
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
