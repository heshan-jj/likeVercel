import React from 'react';

const Settings: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Settings</h1>
      <p className="text-secondary" style={{ marginBottom: 'var(--space-8)' }}>Manage your application preferences and security settings.</p>
      
      <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
        <p className="text-muted">Settings configuration options will be implemented in Phase 2.</p>
      </div>
    </div>
  );
};

export default Settings;
