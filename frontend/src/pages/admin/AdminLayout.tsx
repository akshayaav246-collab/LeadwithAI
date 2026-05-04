import React, { useEffect } from 'react';
import { useLocation, Route, Switch } from 'wouter';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminEmail } from './AdminEmail';

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
    { label: 'Users', path: '/admin/users' },
    { label: 'Send Email', path: '/admin/email' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h3>Lead with AI</h3>
          <span className="admin-badge">Admin</span>
        </div>
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
        <div className="admin-sidebar-footer">
          <button className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Switch>
          <Route path="/admin/dashboard" component={AdminOverview} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/email" component={AdminEmail} />
        </Switch>
      </main>
    </div>
  );
}
