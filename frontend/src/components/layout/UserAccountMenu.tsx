import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRound, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ADMIN: { label: 'Admin', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  ANALYST: { label: 'Analyst', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  OFFICER: { label: 'Officer', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  INVESTIGATOR: { label: 'Investigator', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SUPERVISOR: { label: 'Supervisor', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

interface UserAccountMenuProps {
  className?: string;
  triggerClassName?: string;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({ className = '', triggerClassName = '' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  const userInitial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
  const roleBadge = ROLE_BADGES[user.role] || {
    label: user.role,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-lg border border-[#D9E1EA] bg-white py-1.5 pl-2 pr-2.5 shadow-2xs hover:bg-[#F4F7FA] hover:border-[#BAC7D5] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 ${triggerClassName}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Account Menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B1F3A] text-[11.5px] font-bold text-white shrink-0 shadow-xs">
          {userInitial}
        </div>
        <div className="hidden sm:block text-left pr-0.5">
          <p className="text-[12.5px] font-semibold text-[#0B1F3A] leading-tight truncate max-w-[130px]">
            {user.full_name}
          </p>
          <p className="text-[10px] text-[#5D6878] leading-tight uppercase font-medium tracking-wide">
            {user.role}
          </p>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#5D6878] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0B1F3A]' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 sm:w-72 origin-top-right rounded-lg border border-[#D9E1EA] bg-white shadow-xl ring-1 ring-black/5 z-50 py-1.5 focus:outline-none transition-all"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Identity Header */}
          <div className="px-4 py-3 border-b border-[#E5EAF0]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold text-[#0B1F3A] truncate leading-tight">
                  {user.full_name}
                </p>
                <p className="text-[11.5px] text-[#5D6878] truncate mt-0.5 leading-tight font-mono">
                  {user.email}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border uppercase shrink-0 ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
              >
                {roleBadge.label}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-[#172033] hover:bg-[#F4F7FA] hover:text-[#1769AA] transition-colors"
              role="menuitem"
            >
              <UserRound className="h-4 w-4 text-[#1769AA]" />
              <span>My Profile</span>
            </Link>

            {user.role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-[#172033] hover:bg-[#F4F7FA] hover:text-purple-700 transition-colors"
                role="menuitem"
              >
                <Shield className="h-4 w-4 text-purple-600" />
                <span>Administration</span>
              </Link>
            )}
          </div>

          {/* Logout Section */}
          <div className="border-t border-[#E5EAF0] pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-[#C53B3B] hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left"
              role="menuitem"
            >
              <LogOut className="h-4 w-4 text-[#C53B3B]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccountMenu;
