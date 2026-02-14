'use client';

import { useState, useEffect } from 'react';
import { useUserMode } from '../../hooks/useUserMode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Satelink',
        description: 'Your secure, non-custodial decentralized account is ready. No complex keys to manage.',
    },
    {
        id: 'demo',
        title: 'Try a Demo Action',
        description: 'You can check your balance, view nodes, or explore the builder dashboard.',
    },
    {
        id: 'backup',
        title: 'Backup Recommended',
        description: 'Since this account lives on your device, we recommend downloading a backup key just in case.',
    }
];

export function OnboardingTour() {
    const { mode } = useUserMode(); // We trigger this based on API check mostly
    const [open, setOpen] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Ideally, we fetch onboarding state from API to decide if we show this.
    // simpler hack: perform check on mount
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const res = await axios.get('/me/settings');
                if (res.data.ok) {
                    const onboarding = res.data.settings.onboarding;
                    // If not complete, open it
                    if (!onboarding || !onboarding.completed_at) {
                        // Decide which step to show based on `steps` state
                        const stepsDone = onboarding?.steps || {};
                        if (!stepsDone['welcome']) setCurrentStepIndex(0);
                        else if (!stepsDone['demo']) setCurrentStepIndex(1);
                        else if (!stepsDone['backup']) setCurrentStepIndex(2);

                        setOpen(true);
                    }
                }
            } catch (e) {
                console.error('Onboarding check failed', e);
            }
        };
        // Delay slightly to let page load
        const timer = setTimeout(checkOnboarding, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = async () => {
        const stepId = STEPS[currentStepIndex].id;
        try {
            await axios.post('/me/onboarding/step', { step_id: stepId });
        } catch (e) { console.error('Failed to save step', e); }

        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            setOpen(false); // Done
        }
    };

    const currentStep = STEPS[currentStepIndex];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-emerald-400">{currentStep.title}</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Step {currentStepIndex + 1} of {STEPS.length}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-sm text-zinc-300">
                    {currentStep.description}
                </div>
                <DialogFooter>
                    <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                        {currentStepIndex === STEPS.length - 1 ? 'Finish & Start' : 'Next'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
