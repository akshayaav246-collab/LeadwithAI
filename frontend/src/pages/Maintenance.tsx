import React from 'react';

export function Maintenance() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>🛠️</div>
        <h1 style={styles.title}>Under Maintenance</h1>
        <p style={styles.text}>
          We are currently performing scheduled maintenance to improve your experience. 
          The platform will be back online shortly.
        </p>
        <p style={styles.subtext}>
          If you have urgent questions, please contact us at{' '}
          <a href="mailto:events@gktech.ai" style={styles.link}>
            events@gktech.ai
          </a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#FAF7F2', // App background color
    fontFamily: 'Georgia, serif',
    padding: '2rem',
  },
  content: {
    textAlign: 'center' as const,
    backgroundColor: '#fff',
    padding: '3rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    border: '1px solid #E2D9CC',
    maxWidth: '500px',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  title: {
    color: '#3B2F2F',
    margin: '0 0 1rem 0',
    fontSize: '2rem',
  },
  text: {
    color: '#2A1F14',
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
  },
  subtext: {
    color: '#8C7B6B',
    fontSize: '0.9rem',
    margin: 0,
  },
  link: {
    color: '#C4956A',
    textDecoration: 'none',
    fontWeight: 'bold' as const,
  },
};
