"use client";
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BuilderProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/builder-api/projects');
      if (res.data?.ok) setProjects(res.data.projects || []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Enter a project name'); return; }
    setCreating(true);
    try {
      const res = await api.post('/builder-api/projects', { name: newName.trim() });
      if (res.data?.ok) {
        setProjects(prev => [res.data.project, ...prev]);
        setNewName('');
        setShowCreate(false);
        toast.success('Project created');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Projects</h1>
          <p className="text-sm text-zinc-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-zinc-300 mb-3">Create New Project</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Project name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                className="flex-1 text-sm bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-zinc-500 text-sm">Loading...</p>}

      {!loading && projects.length === 0 && !showCreate && (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">No projects yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm text-emerald-500 hover:text-emerald-400 underline underline-offset-2"
          >
            Create your first project
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p: any) => (
          <Card key={p.id} className="bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-700/60 transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-100 truncate">{p.name}</p>
                <Badge className={`text-[10px] shrink-0 ${p.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700/50 text-zinc-500 border-zinc-600/30'}`}>
                  {p.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/50 rounded p-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Requests</p>
                  <p className="text-sm font-bold text-zinc-200 mt-0.5">{(p.requests || 0).toLocaleString()}</p>
                </div>
                <div className="bg-zinc-800/50 rounded p-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Spend</p>
                  <p className="text-sm font-bold text-zinc-200 mt-0.5">${(p.spend_usdt || 0).toFixed(2)}</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600">
                Created {new Date(p.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
