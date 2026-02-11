import { useState } from 'react';
import { Battery, Gauge, Car, Zap } from 'lucide-react';

interface ConfirmationModalProps {
    vehicleData: {
        soc?: string;
        range?: string;
        model?: string;
        maxcurrent?: string;
    };
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

export default function ConfirmationModal({
    vehicleData,
    onConfirm,
    onCancel,
    loading
}: ConfirmationModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
            <div className="animate-enter glass-card w-full max-w-lg overflow-hidden rounded-3xl p-0 shadow-2xl">
                <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-8 py-6 border-b border-white/5">
                    <h3 className="text-2xl font-black text-white tracking-tight">
                        Confirm Charging
                    </h3>
                    <p className="mt-1 text-sm font-medium text-indigo-300/60">
                        Please verify your vehicle link
                    </p>
                </div>

                <div className="p-8">
                    <div className="mb-8 grid gap-4 sm:grid-cols-2">
                        <InfoRow label="SoC" icon={Battery} value={vehicleData.soc ? `${parseFloat(vehicleData.soc).toFixed(1)}%` : 'N/A'} color="emerald" />
                        <InfoRow label="Estimated Range" icon={Gauge} value={vehicleData.range ? `${parseFloat(vehicleData.range).toFixed(1)} km` : 'N/A'} color="blue" />
                        <InfoRow label="Vehicle Model" icon={Car} value={vehicleData.model || 'Unknown'} color="purple" />
                        <InfoRow label="Max Current" icon={Zap} value={vehicleData.maxcurrent ? `${vehicleData.maxcurrent} A` : 'N/A'} color="amber" />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 font-bold text-white transition-all hover:bg-white/10 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-purple-500 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Syncing...</span>
                                </div>
                            ) : 'Initiate Session'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, icon: Icon, color }: any) {
    const colorClasses = {
        emerald: 'bg-emerald-500/10 text-emerald-400',
        blue: 'bg-blue-500/10 text-blue-400',
        purple: 'bg-purple-500/10 text-purple-400',
        amber: 'bg-amber-500/10 text-amber-400',
    };

    return (
        <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5 transition-colors hover:bg-white/[0.06]">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
                <Icon size={18} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/30">{label}</p>
            <p className="mt-1 text-lg font-bold text-white truncate">{value}</p>
        </div>
    );
}
