import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  clearStoredUser,
  getCurrentUser,
  getStoredUser,
  logout,
  saveStoredUser
} from "../services/api";

const navIcons = {
  dashboard: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  nutrition: "M12 21c0-8 3-13 9-16-1 7-4 11-9 12m0 4C12 13 9 8 3 6c0 7 3 11 9 11",
  training: "M4 9v6m3-8v10m10-10v10m3-8v6M7 12h10",
  progress: "M4 19V9m5 10V5m6 14v-7m5 7V3",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5 2-1-2-3-2 .5-1.5-1.5.5-2-3-2-1 2h-2l-1-2-3 2 .5 2L4 8.5 2 8l-2 3 2 1v2l-2 1 2 3 2-.5L5.5 19l-.5 2 3 2 1-2h2l1 2 3-2-.5-2 1.5-1.5 2 .5 2-3-2-1v-2Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4",
  chevron: "m8 10 4 4 4-4"
};

function NavIcon({ name, size = 18 }) {
  return (
    <svg className="navbar-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={navIcons[name]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const currentUser = await getCurrentUser();
        saveStoredUser(currentUser);
        setUser(currentUser);
      } catch (error) {
        setUser(getStoredUser());
      }
    }

    loadCurrentUser();
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearStoredUser();
      navigate("/login", { replace: true });
    }
  }

  function toggleUserMenu() {
    setIsUserMenuOpen((current) => !current);
  }

  const displayName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Guest";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "VS";

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="brand-mark">VS</span>
        <span>VitalitySync</span>
      </div>

      <nav className="navbar__links" aria-label="Primary navigation">
        {user?.userRole === "admin" ? (
          <NavLink to="/admin"><NavIcon name="dashboard" />Admin Dashboard</NavLink>
        ) : (
          <>
            <NavLink to="/dashboard"><NavIcon name="dashboard" />Dashboard</NavLink>
            {user?.userRole === "trainee" ? <NavLink to="/nutrition"><NavIcon name="nutrition" />Nutrition</NavLink> : null}
            {user?.userRole === "trainee" ? <NavLink to="/training"><NavIcon name="training" />Training</NavLink> : null}
            {user?.userRole === "trainee" ? <NavLink to="/progress"><NavIcon name="progress" />Progress</NavLink> : null}
          </>
        )}
        <NavLink to="/settings"><NavIcon name="settings" />Settings</NavLink>
      </nav>

      <div className="navbar__user">
        {user?.userRole !== "admin" ? (
          <button className="navbar__notification" type="button" aria-label="Notifications">
            <NavIcon name="bell" size={20} />
          </button>
        ) : null}
        <span className="navbar__avatar" aria-hidden="true">{initials}</span>
        <span className="navbar__name">{displayName}</span>
        <div className="navbar__user-menu">
          <button
            type="button"
            className="navbar__user-toggle"
            onClick={toggleUserMenu}
            aria-label="Open user menu"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
          >
            <NavIcon name="chevron" size={16} />
          </button>
          {isUserMenuOpen ? (
            <div className="navbar__user-dropdown" role="menu">
              <button type="button" className="navbar__logout" onClick={handleLogout} role="menuitem">
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
