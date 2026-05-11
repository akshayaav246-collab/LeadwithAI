import React, { useEffect } from 'react';
import { useLocation, Route, Switch } from 'wouter';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminEmail } from './AdminEmail';
import { publicAsset } from '../../lib/assets';

export function AdminLayout() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token && location !== '/admin/login') {
      setLocation('/admin/login');
    }
  }, [location, setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setLocation('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Users',     path: '/admin/users'     },
    { label: 'Send Email', path: '/admin/email'    },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        {/* Header with logo + role badge */}
        <div className="admin-sidebar-header">
          <img
            src={publicAsset('Logo.png')}
            alt="Global Knowledge Technologies"
            className="admin-sidebar-logo"
          />
          <span className="admin-role-badge">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`admin-nav-item ${location === item.path ? 'active' : ''}`}
              onClick={() => setLocation(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout box */}
        <div className="admin-sidebar-footer">
          <button className="admin-logout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Switch>
          <Route path="/admin/dashboard" component={AdminOverview} />
          <Route path="/admin/users"     component={AdminUsers}    />
          <Route path="/admin/email"     component={AdminEmail}    />
        </Switch>
      </main>
    </div>
  );
}
