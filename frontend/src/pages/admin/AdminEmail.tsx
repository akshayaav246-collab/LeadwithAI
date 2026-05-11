import React, { useState } from 'react';
import { sendAdminEmail } from '../../lib/api';

export function AdminEmail() {
  const [recipientType, setRecipientType] = useState('all'); // 'all', 'paid', 'custom'
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken') || '';
      
      // Basic newline to <br> conversion for simple formatting
      const htmlContent = content.replace(/\n/g, '<br />');

      let emailsArray: string[] = [];
      if (recipientType === 'custom') {
        emailsArray = customEmails.split(',').map(e => e.trim()).filter(e => e);
        if (emailsArray.length === 0) throw new Error('Please enter at least one valid email address.');
      }

      const res = await sendAdminEmail(token, {
        recipientType,
        customEmails: emailsArray,
        subject,
        htmlContent
      });

      setStatus({ type: 'success', message: res.message });
      setSubject('');
      setContent('');
      if (recipientType === 'custom') setCustomEmails('');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to send emails' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <h2 className="admin-page-title">Send Email</h2>
      
      <div className="admin-card">
        {status.message && (
          <div className={`admin-alert ${status.type}`}>
            {status.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Recipients</label>
            <select 
              value={recipientType} 
              onChange={e => setRecipientType(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Registered Users</option>
              <option value="paid">Paid Users Only</option>
              <option value="custom">Custom Email List</option>
            </select>
          </div>

          {recipientType === 'custom' && (
            <div className="form-group">
              <label>Custom Emails (comma separated)</label>
              <input 
                type="text" 
                value={customEmails}
                onChange={e => setCustomEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Important Update regarding your workshop!"
              required
            />
          </div>

          <div className="form-group">
            <label>Message Content</label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={10}
              placeholder="Hello,\n\nWe wanted to let you know..."
              required
              className="admin-textarea"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
