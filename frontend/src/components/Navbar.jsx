import React from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";

export default function Navbar({ user, page, setPage }) {
  const { logout, storeName } = useAuth();
  const isAdmin = user?.role === "admin";

  const NavButton = ({ label, target }) => (
    <button
      onClick={() => setPage(target)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        page === target
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
      <div className="font-bold text-lg dark:text-white">🧾 {storeName}</div>

      <div className="flex gap-2">
        {isAdmin && (
          <>
            <NavButton label="Dashboard" target="dashboard" />
            <NavButton label="Users" target="users" />
          </>
        )}
        <NavButton label="POS" target="pos" />
        <NavButton label="Products" target="products" />
        <NavButton label="Categories" target="categories" />
        {isAdmin && <NavButton label="Reports" target="reports" />}
        <NavButton label="Pay Later" target="paylater" />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {user?.username} <span className="text-xs capitalize text-blue-500">({user?.role})</span>
        </span>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600
            px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
}