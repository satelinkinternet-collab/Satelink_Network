
'use client';

import React, { useState, useEffect } from 'react';

export default function LaunchChecklistPage() {
    const [checks, setChecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // We can reuse the Preflight API -> /admin/preflight/status?
    // Or create specific Launch Checklist endpoint if needed.
    // Let's assume Preflight covers most, and we add fleet health here.

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        fetch('http://localhost:8080/admin/preflight/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(json => {
                if (json.ok) setChecks(json.data.checks);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, []);

    const allPass = checks.every(c => c.status === 'PASS');
    const hasBlockers = checks.some(c => c.status === 'FAIL');

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Launch Readiness Checklist</h1>

                <div className={`p-6 rounded-xl border mb-8 ${hasBlockers ? 'bg-red-900/20 border-red-500/50' :
                        allPass ? 'bg-green-900/20 border-green-500/50' : 'bg-yellow-900/20 border-yellow-500/50'
                    }`}>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {hasBlockers ? "🔴 BLOCKED" : allPass ? "🟢 READY FOR LAUNCH" : "🟡 WARNINGS"}
                    </h2>
                    <p className="mt-2 opacity-80">
                        {hasBlockers ? "Resolve blocking issues before going live." :
                            allPass ? "All systems nominal." : "Proceed with caution."}
                    </p>
                </div>

                <div className="space-y-4">
                    {checks.map((check, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-[#111] border border-gray-800 rounded-lg">
                            <div>
                                <h3 className="font-semibold">{check.name}</h3>
                                <p className="text-sm text-gray-500">{check.details}</p>
                            </div>
                            <div className={`px-3 py-1 rounded text-sm font-bold ${check.status === 'PASS' ? 'bg-green-900/30 text-green-400' :
                                    check.status === 'FAIL' ? 'bg-red-900/30 text-red-400' :
                                        'bg-yellow-900/30 text-yellow-400'
                                }`}>
                                {check.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
