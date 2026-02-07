'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStationData } from '@/hooks/useStationData';
import VehicleDataCard from '@/components/vehicle-data-card';
import ConnectorStatus from '@/components/connector-status';
import RemoteStartButton from '@/components/remote-start-button';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

export default function StationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const stationId = params.id as string;
    const { data, loading, error } = useStationData(stationId);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
                    <p className="text-indigo-300">Loading station data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="mb-4 rounded-full bg-red-500/20 p-4 inline-block">
                        <WifiOff size={48} className="text-red-400" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-white">Error Loading Station</h2>
                    <p className="text-indigo-300/60 mb-6">{error || 'Station not found'}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="rounded-xl bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-500"
                    >
                        Back to Stations
                    </button>
                </div>
            </div>
        );
    }

    const canStart =
        data.station?.isOnline &&
        data.connectors.some(c => c.status === 'Available');

    return (
        <div className="min-h-screen bg-[#020617] text-white">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-white/10 bg-white/5 px-6 py-8 backdrop-blur-xl">
                <div className="absolute top-0 left-1/2 -z-10 h-[300px] w-[800px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent blur-3xl" />

                <div className="mx-auto max-w-7xl">
                    <button
                        onClick={() => router.push('/')}
                        className="mb-4 flex items-center gap-2 text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                        <ArrowLeft size={20} />
                        Back to Stations
                    </button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="mb-2 text-3xl font-bold text-white">{stationId}</h1>
                            <p className="text-indigo-300/60">
                                {data.station?.chargePointVendor} • {data.station?.chargePointModel}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {data.station?.isOnline ? (
                                <>
                                    <Wifi className="text-emerald-400" size={20} />
                                    <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400">
                                        Online
                                    </span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="text-red-400" size={20} />
                                    <span className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400">
                                        Offline
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="grid gap-6 lg:grid-cols-2">
                    <VehicleDataCard vehicleData={data.vehicleData} />
                    <ConnectorStatus connectors={data.connectors} />
                </div>

                <RemoteStartButton
                    stationId={stationId}
                    disabled={!canStart && !data.activeTransaction}
                    vehicleData={data.vehicleData}
                    activeTransactionId={data.activeTransaction?.transactionId}
                />
            </div>
        </div>
    );
}
