export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{text}</span>
    </div>
  );
}
