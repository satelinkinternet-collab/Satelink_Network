export default function HealthPage() {
    return (
        <div style={{ padding: '20px', fontFamily: 'monospace', background: '#000', color: '#0f0', height: '100vh' }}>
            <h1>UI OK</h1>
            <p>Time: {new Date().toISOString()}</p>
            <p>API_BASE: {process.env.NEXT_PUBLIC_API_BASE_URL || 'Not Set'}</p>
        </div>
    );
}
