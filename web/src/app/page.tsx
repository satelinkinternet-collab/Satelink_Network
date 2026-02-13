"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Server, Hammer, Share2, Building2, LogIn } from 'lucide-react';

export default function HomePage() {
  const buildTime = new Date().toISOString();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">Satelink Console</h1>
          <p className="text-zinc-400">Local Development Environment</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/login">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LogIn className="h-5 w-5 text-blue-500" /> Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                Login page for all user roles.
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-purple-500 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-purple-500" /> Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                User management and system monitoring.
              </CardContent>
            </Card>
          </Link>

          <Link href="/node">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-green-500 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5 text-green-500" /> Node Operator
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                Node status, earnings, and pairing.
              </CardContent>
            </Card>
          </Link>

          <Link href="/builder">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-orange-500 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hammer className="h-5 w-5 text-orange-500" /> Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                API keys and request logs.
              </CardContent>
            </Card>
          </Link>

          <Link href="/distributor">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-pink-500 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Share2 className="h-5 w-5 text-pink-500" /> Distributor
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                Referral links and conversion tracking.
              </CardContent>
            </Card>
          </Link>

          <Link href="/enterprise">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-cyan-500 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-cyan-500" /> Enterprise
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                High-volume account management.
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center text-xs text-zinc-600 font-mono">
          <p>Build Time: {buildTime}</p>
          <p className="text-green-500 mt-2">If you see this, routing works ✅</p>
        </div>
      </div>
    </div>
  );
}
