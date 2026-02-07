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
            ? { transactionId: parseInt(activeTransactionId) }
            : { connectorId: 1, idTag: 'TEST123' };

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
                setMessage({ type: 'success', text: `Action ${action} accepted!` });
            } else {
                setMessage({ type: 'error', text: `Failed to ${isCharging ? 'stop' : 'start'} session. Please try again.` });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: `Error: ${error.message}` });
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    if (disabled) {
        return (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={20} />
                    <span>Station unavailable for charging</span>
                </div>
            </div>
        );
    }

    return (
        <>
            {message && (
                <div className={`mt-6 rounded-xl border p-4 ${message.type === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}


            <button
                onClick={() => isCharging ? handleAction() : setShowConfirm(true)}
                disabled={loading}
                className={`mt-6 w-full rounded-xl py-4 font-semibold text-white transition-all active:scale-95 disabled:opacity-50 ${isCharging
                    ? 'bg-slate-100/10 border border-white/20 hover:bg-white/10'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                    }`}
            >
                {isCharging ? (
                    <>
                        <Square className="inline mr-2" size={20} fill="currentColor" />
                        Stop Charging
                    </>
                ) : (
                    <>
                        <Play className="inline mr-2" size={20} />
                        Start Charging
                    </>
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
        </>
    );
}
