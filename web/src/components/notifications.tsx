"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export function Notifications() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mock notifications
    const notifications = [
        { id: 1, title: 'Downtime Alert', message: 'Your node was offline for 5 mins.', time: '2h ago', type: 'error' },
        { id: 2, title: 'Claim Available', message: 'You have 50.00 USDT ready to claim.', time: '5h ago', type: 'success' },
        { id: 3, title: 'System Update', message: 'Satelink v0.9.1 is live.', time: '1d ago', type: 'info' }
    ];

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative text-zinc-400 hover:text-zinc-100"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-zinc-950" />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
                    >
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-800">3 New</Badge>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications.map((n) => (
                                <div key={n.id} className="p-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors last:border-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className={`text-sm font-medium ${n.type === 'error' ? 'text-red-400' :
                                                n.type === 'success' ? 'text-green-400' : 'text-blue-400'
                                            }`}>
                                            {n.title}
                                        </p>
                                        <span className="text-[10px] text-zinc-500">{n.time}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        {n.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 text-center">
                            <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full py-1">
                                Mark all as read
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
