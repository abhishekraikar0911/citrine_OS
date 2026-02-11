"use client";

import { useState } from 'react';
import { Play, AlertCircle, Square } from 'lucide-react';
import ConfirmationModal from './confirmation-modal';
import { CITRINEOS_API_URL } from '@/lib/utils';

interface RemoteStartButtonProps {
    stationId: string;
    disabled: boolean;
    vehicleData: {
        soc?: string;
        range?: string;
        model?: string;
        maxcurrent?: string;
    };
    activeTransactionId?: string | null;
}

export default function RemoteStartButton({
    stationId,
    disabled,
    vehicleData,
    activeTransactionId
}: RemoteStartButtonProps) {
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isCharging = !!activeTransactionId;

    const handleAction = async () => {
        setLoading(true);
        setMessage(null);

        const action = isCharging ? 'remoteStopTransaction' : 'remoteStartTransaction';
        const body = isCharging
            ? { transactionId: parseInt(activeTransactionId!) }
            : { connectorId: 1, idTag: localStorage.getItem('idTag') || 'CITRINE_USER' };

        try {
            const response = await fetch(
                `${CITRINEOS_API_URL}/ocpp/1.6/evdriver/${action}?identifier=${stationId}&tenantId=1`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }
            );

            const result = await response.json();

            if (response.ok && result[0]?.success) {
                setMessage({ type: 'success', text: `${isCharging ? 'Stop' : 'Start'} command accepted by the station.` });
            } else {
                setMessage({ type: 'error', text: `Failed to ${isCharging ? 'stop' : 'start'} session. Please check connection.` });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: `Network Error: ${error.message}` });
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    if (disabled) {
        return (
            <div className="mt-8 animate-enter glass-card rounded-2xl border-red-500/20 bg-red-500/5 p-6">
                <div className="flex items-center gap-3 text-red-400">
                    <div className="rounded-full bg-red-500/20 p-2">
                        <AlertCircle size={20} />
                    </div>
                    <span className="font-semibold">Station currently unavailable for charging</span>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-4">
            {message && (
                <div className={`animate-enter glass-card rounded-2xl p-6 transition-all ${message.type === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                    : 'border-red-500/20 bg-red-500/5 text-red-400'
                    }`}>
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className={message.type === 'success' ? 'text-emerald-400' : 'text-red-400'} />
                        <span className="font-medium">{message.text}</span>
                    </div>
                </div>
            )}

            <button
                onClick={() => isCharging ? handleAction() : setShowConfirm(true)}
                disabled={loading}
                className={`group relative w-full overflow-hidden rounded-2xl py-5 font-bold text-white transition-all active:scale-95 disabled:opacity-50 ${isCharging
                    ? 'animate-pulse-glow bg-white/5 border border-white/20 hover:bg-white/10'
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl shadow-indigo-600/20 hover:from-indigo-500 hover:to-pink-500'
                    }`}
            >
                {/* Loader Overlay */}
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                )}

                <div className="relative flex items-center justify-center gap-3">
                    {isCharging ? (
                        <>
                            <Square size={20} className="fill-white" />
                            <span>Stop Charging Session</span>
                        </>
                    ) : (
                        <>
                            <Play size={20} className="fill-white" />
                            <span>Begin Charging Session</span>
                        </>
                    )}
                </div>

                {/* Shine Effect */}
                {!isCharging && (
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                )}
            </button>

            {showConfirm && (
                <ConfirmationModal
                    vehicleData={vehicleData}
                    onConfirm={handleAction}
                    onCancel={() => setShowConfirm(false)}
                    loading={loading}
                />
            )}
        </div>
    );
}
