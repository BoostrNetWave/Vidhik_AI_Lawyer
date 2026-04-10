import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Calendar, CreditCard, FileText, LifeBuoy, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import logo from '../assets/logo.jpeg';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <Home size={20} />, to: "/" },
  { label: "Profile", icon: <User size={20} />, to: "/profile" },
  { label: "Bookings", icon: <Calendar size={20} />, to: "/bookings" },
  { label: "Payments", icon: <CreditCard size={20} />, to: "/payments" },
  { label: "Blog Posts", icon: <FileText size={20} />, to: "/blog-posts" },
  { label: "Support", icon: <LifeBuoy size={20} />, to: "/support" },
];

function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="bg-white text-slate-600 w-full h-full flex flex-col border-r border-slate-100 shadow-sm">
      <div className="px-6 py-10">
        <img src={logo} alt="VidhikAI Logo" className="w-40 h-auto object-contain" />
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-4 mt-4">
        <p className="px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em] mb-3">Main Menu</p>
        {navItems.map((item) => (
          <SidebarLink
            key={item.label}
            icon={item.icon}
            label={item.label}
            to={item.to}
          />
        ))}
      </nav>

      <div className="p-4 border-t border-slate-50 mt-auto">
        <SidebarLink icon={<Settings size={20} />} label="Settings" to="/settings" />

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-red-500 hover:bg-red-50 transition-all duration-300 mt-1"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>

        <div className="mt-6 px-4 py-4 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-[10px] text-primary/60 font-bold uppercase tracking-wider">Subscription</p>
          <p className="text-xs text-slate-900 font-black mt-1">Premium Plan</p>
        </div>
      </div>
    </aside>
  );
}

interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  to: string;
}

function SidebarLink({ icon, label, to }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300
        ${isActive
          ? 'bg-secondary text-primary shadow-sm shadow-primary/10'
          : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`
      }
      end={to === "/"}
    >
      <div className={`transition-colors duration-300`}>
        {icon}
      </div>
      <span>{label}</span>
    </NavLink>
  );
}

export default Sidebar;
