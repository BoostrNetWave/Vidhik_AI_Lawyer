import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Components/Sidebar";
import { Menu, X, User, LogOut, Bell, Settings } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { Button } from "./Components/ui/button";
import { Card, CardContent } from "./Components/ui/card";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Don't show header on login/signup pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">Vidhik AI</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed on the left */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:shadow-none md:border-r border-slate-200
      `}>
        <div className="h-full flex flex-col">
          {/* Mobile Close Button */}
          <div className="md:hidden absolute top-4 right-4 z-50">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <Sidebar />
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 w-full md:w-auto p-4 md:p-6 pt-20 md:pt-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
