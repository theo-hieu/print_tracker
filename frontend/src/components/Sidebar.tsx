import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../api";
import {
  Home,
  Box,
  FileText,
  Printer,
  List,
  BarChart,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";

const menuItems = [
  { name: "Home", icon: Home, path: "/" },
  { name: "Materials", icon: Box, path: "/materials" },
  { name: "Models", icon: FileText, path: "/models" },
  { name: "Printers", icon: Printer, path: "/printers" },
  { name: "Jobs", icon: List, path: "/jobs" },
  { name: "Billing", icon: DollarSign, path: "/billing" },
  { name: "Clients", icon: Users, path: "/clients" },
  { name: "Planning", icon: TrendingUp, path: "/planning" },
  { name: "Analytics", icon: BarChart, path: "/analytics" },
];

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    UserName: string;
    Email: string;
    ProfileIcon: string | null;
  } | null>(null);
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_API_BASE
    ? import.meta.env.VITE_API_BASE.replace("/api", "")
    : "http://localhost:5000";

  useEffect(() => {
    // Fetch basic user profile to display
    const fetchProfile = async () => {
      try {
        const res = await api.get("/users/profile");
        setUserProfile(res.data);
      } catch (err) {
        console.error("Failed to fetch sidebar profile", err);
      }
    };
    fetchProfile();
  }, []);

  return (
    <aside
      className={`relative bg-red-900 text-white shadow-xl flex flex-col h-full transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-white text-red-900 p-1 rounded-full shadow-md hover:bg-gray-100 transition-colors z-50 border border-gray-200"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Header */}
      <div className="p-4 border-b border-red-800 flex items-center h-20 overflow-hidden">
        {isCollapsed ? (
          <div className="w-full flex justify-center">
            <span className="font-bold text-xl">3D</span>
          </div>
        ) : (
          <h1 className="text-xl font-bold whitespace-nowrap overflow-hidden text-ellipsis">
            3D Print Manager
          </h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto overflow-x-hidden">
        {menuItems.map(({ name, icon: Icon, path }) => (
          <NavLink
            key={name}
            to={path}
            title={isCollapsed ? name : ""}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-red-800 text-white shadow-inner"
                  : "hover:bg-red-800/50 text-red-100 hover:text-white"
              } ${isCollapsed ? "justify-center" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={24}
                  className={`min-w-[24px] ${
                    isActive
                      ? "text-white"
                      : "text-red-200 group-hover:text-white"
                  }`}
                />
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden transition-opacity duration-300">
                    {name}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div
        className="p-4 border-t border-red-800 cursor-pointer hover:bg-red-800/30 transition-colors"
        onClick={() => navigate("/profile")}
        title="View Profile"
      >
        <div
          className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white shrink-0 shadow-md border-2 border-red-700 overflow-hidden">
            {userProfile?.ProfileIcon ? (
              <img
                src={`${backendUrl}${userProfile.ProfileIcon}`}
                alt="Profile Icon"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {userProfile?.UserName || "Loading..."}
              </p>
              <p className="text-xs text-red-300 truncate">
                {userProfile?.Email || "..."}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              className="text-red-300 hover:text-white transition-colors p-1 rounded hover:bg-red-700 ml-auto"
              title="Logout"
              onClick={(e) => {
                e.stopPropagation(); // prevent navigating to profile
                onLogout();
              }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
