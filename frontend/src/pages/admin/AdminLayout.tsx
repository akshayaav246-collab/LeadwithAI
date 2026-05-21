import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useLocation, Route, Switch } from 'wouter';
import { publicAsset } from '../../lib/assets';
import { getAdminSettings } from '../../lib/api';

const AdminOverview = lazy(() => import('./AdminOverview').then(m => ({ default: m.AdminOverview })));
const AdminUsers = lazy(() => import('./AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminEmail = lazy(() => import('./AdminEmail').then(m => ({ default: m.AdminEmail })));
const AdminAuditLogs = lazy(() => import('./AdminAuditLogs').then(m => ({ default: m.AdminAuditLogs })));
const AdminSettings = lazy(() => import('./AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminFeedback = lazy(() => import('./AdminFeedback').then(m => ({ default: m.AdminFeedback })));

export function AdminLayout() {
  const [location, setLocation] = useLocation();
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token && location !== '/admin/login') {
      setLocation('/admin/login');
    } else if (token) {
      getAdminSettings(token)
        .then(data => setIsMaintenance(data.isMaintenanceMode || false))
        .catch(console.error);
    }
  }, [location, setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setLocation('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard',   path: '/admin/dashboard'   },
    { label: 'Users',       path: '/admin/users'       },
    { label: 'Feedback',    path: '/admin/feedback'    },
    { label: 'Send Email',  path: '/admin/email'       },
    { label: 'Audit Logs',  path: '/admin/audit-logs'  },
    { label: 'Settings',    path: '/admin/settings'    },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <img
            src={publicAsset('LogoAdmin.png')}
            alt="Global Knowledge Technologies"
            className="admin-sidebar-logo"
          />
          <span className="admin-role-badge">Admin</span>
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

        <div className="admin-sidebar-footer" style={{ marginTop: 'auto' }}>
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
        <Suspense fallback={
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: '#8C7B6B',
            gap: '1rem'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin-slow 2s linear infinite', color: '#C4956A' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>Loading...</span>
          </div>
        }>
          <Switch>
            <Route path="/admin/dashboard"  component={AdminOverview}   />
            <Route path="/admin/users"      component={AdminUsers}      />
            <Route path="/admin/feedback"   component={AdminFeedback}   />
            <Route path="/admin/email"      component={AdminEmail}      />
            <Route path="/admin/audit-logs" component={AdminAuditLogs}  />
            <Route path="/admin/settings"   component={AdminSettings}   />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}
