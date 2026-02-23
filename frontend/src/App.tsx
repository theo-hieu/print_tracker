import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./components/Home";
import Materials from "./components/Materials";
import Models from "./components/Models";
import Printers from "./components/Printers";
import Jobs from "./components/Jobs";
import Billing from "./components/Billing";
import Analytics from "./components/Analytics";
import Clients from "./components/Clients";
import Planning from "./components/Planning";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Profile from "./components/Profile";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    navigate("/");
  };

  if (!isAuthenticated) {
    if (isSigningUp) {
      return (
        <SignUp
          onLogin={handleLogin}
          onSwitchToLogin={() => setIsSigningUp(false)}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToSignUp={() => setIsSigningUp(true)}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 h-full overflow-y-auto p-8 relative transition-all duration-300 ease-in-out">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/models" element={<Models />} />
          <Route path="/printers" element={<Printers />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/profile" element={<Profile />} />
          {/* Added this route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
