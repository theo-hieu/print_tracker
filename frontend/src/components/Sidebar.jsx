import React from "react";
import { Home, Box, FileText, Printer, List, BarChart } from "lucide-react";

const menuItems = [
  { name: "Home", icon: Home },
  { name: "Materials", icon: Box },
  { name: "Models", icon: FileText },
  { name: "Printers", icon: Printer },
  { name: "Jobs", icon: List },
  { name: "Analytics", icon: BarChart },
];

export default function Sidebar({ active, setActive }) {
  return (
    <aside className="w-64 bg-white shadow-lg p-4 flex flex-col">
      <h1 className="text-2xl font-bold mb-6">3D Print Manager</h1>
      <nav className="flex flex-col space-y-2">
        {menuItems.map(({ name, icon: Icon }) => (
          <button
            key={name}
            onClick={() => setActive(name)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-left ${
              active === name
                ? "bg-red-800 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}
      </nav>
    </aside>
  );
}