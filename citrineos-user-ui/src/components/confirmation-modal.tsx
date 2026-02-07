"use client";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#020617] p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-bold text-white">
                    Confirm Charging Session
                </h3>

                <p className="mb-4 text-sm text-indigo-300/80">
                    Please review the vehicle information before starting the charging session:
                </p>

                <div className="mb-6 space-y-2 rounded-xl bg-white/5 p-4">
                    <InfoRow label="Current SoC" value={vehicleData.soc ? `${parseFloat(vehicleData.soc).toFixed(1)}%` : 'N/A'} />
                    <InfoRow label="Range" value={vehicleData.range ? `${parseFloat(vehicleData.range).toFixed(1)} km` : 'N/A'} />
                    <InfoRow label="Model" value={vehicleData.model || 'Unknown'} />
                    <InfoRow label="Max Current" value={vehicleData.maxcurrent ? `${vehicleData.maxcurrent} A` : 'N/A'} />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-white/10 py-3 text-white transition-all hover:bg-white/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-white transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
                    >
                        {loading ? 'Starting...' : 'Confirm Start'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-indigo-300/60">{label}:</span>
            <span className="font-semibold text-white">{value}</span>
        </div>
    );
}
