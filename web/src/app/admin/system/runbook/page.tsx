'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, AlertTriangle } from 'lucide-react';

export default function RunbookPage() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app we might fetch this via API, but for MVP we can require it 
        // or fetch from a static public path if configured. 
        // Since Next.js Client Comps can't fs.readFileSync, we'll fetch a simple API endpoint 
        // that serves the runbook, OR we can hardcode the content here if the requirement allows.
        // Let's assume we need an API endpoint to serve it.
        // I will add a quick endpoint for this or just display a placeholder if I can't read files.
        // Wait, I can read it in the Admin API!

        fetch('/admin/system/runbook-content', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.ok) setContent(data.content);
                else setContent("# Error loading runbook");
            })
            .catch(() => setContent("# Error loading runbook"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Standard Operating Procedures</h1>
                    <p className="text-slate-400 text-sm">Emergency Response & Maintenance Guide</p>
                </div>
            </div>

            <div className="prose prose-invert prose-headings:text-indigo-300 prose-a:text-indigo-400 max-w-none bg-slate-900/50 p-8 rounded-xl border border-slate-800">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    </div>
                ) : (
                    <ReactMarkdown>{content}</ReactMarkdown>
                )}
            </div>

            <div className="p-4 bg-amber-950/30 border border-amber-500/20 rounded-lg flex gap-3 text-amber-200 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>
                    Always verify the digital signature of this document before executing Level 1 procedures in a production environment.
                </p>
            </div>
        </div>
    );
}
