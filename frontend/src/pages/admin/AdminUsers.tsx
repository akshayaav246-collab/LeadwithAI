import React, { useEffect, useState } from 'react';
import { getAdminUsers } from '../../lib/api';

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaid, setFilterPaid] = useState('all'); // 'all', 'paid', 'unpaid'

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const data = await getAdminUsers(token);
        // Sort by college name alphabetically by default
        data.sort((a, b) => a.collegeName.localeCompare(b.collegeName));
        setUsers(data);
      } catch (err: any) {
        setError('Failed to load users. ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleExportCSV = () => {
    if (users.length === 0) return;
    
    const headers = ['Name', 'Email', 'Phone', 'Type', 'College/Domain', 'Payment Status', 'Registration Date'];
    const rows = users.map(u => [
      `"${u.fullName}"`,
      `"${u.email}"`,
      `"${u.phone}"`,
      `"${u.userType}"`,
      `"${u.collegeName}"`,
      u.isPaid ? 'Paid' : 'Unpaid',
      `"${new Date(u.createdAt).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'lead_with_ai_users.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(u => {
    // Payment filter
    if (filterPaid === 'paid' && !u.isPaid) return false;
    if (filterPaid === 'unpaid' && u.isPaid) return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.collegeName.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2 className="admin-page-title">User Management</h2>
        <button className="btn-primary" onClick={handleExportCSV}>
          Export to CSV
        </button>
      </div>

      <div className="admin-controls">
        <input 
          type="text" 
          placeholder="Search name, email, or college..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-search-input"
        />
        <select 
          value={filterPaid} 
          onChange={(e) => setFilterPaid(e.target.value)}
          className="admin-select"
        >
          <option value="all">All Users</option>
          <option value="paid">Paid Users Only</option>
          <option value="unpaid">Unpaid Users Only</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading users...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>College / Domain</th>
                <th>Payment</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.collegeName}</td>
                  <td>
                    <span className={`admin-badge ${user.isPaid ? 'success' : 'warning'}`}>
                      {user.isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>No users found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
