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
        <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10 bg-[#020617]">
                <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px]" />
            </div>

            {/* Header */}
            <div className="relative border-b border-white/5 bg-white/[0.02] px-6 py-12 backdrop-blur-md">
                <div className="mx-auto max-w-7xl">
                    <button
                        onClick={() => router.push('/')}
                        className="group mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-indigo-400/60 transition-colors hover:text-indigo-400"
                    >
                        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                        Back to Stations
                    </button>

                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-3 flex items-center gap-3">
                                <span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 ring-1 ring-indigo-500/20">
                                    <Wifi size={20} />
                                </span>
                                <h1 className="text-4xl font-black text-white tracking-tighter md:text-5xl">
                                    {stationId}
                                </h1>
                            </div>
                            <p className="text-lg font-medium text-indigo-300/40">
                                {data.station?.chargePointVendor} <span className="mx-2 opacity-20">|</span> {data.station?.chargePointModel}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {data.station?.isOnline ? (
                                <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-6 py-3 ring-1 ring-emerald-500/20">
                                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                                    <span className="text-sm font-black uppercase tracking-widest text-emerald-400">
                                        Station Online
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 px-6 py-3 ring-1 ring-red-500/20">
                                    <WifiOff className="text-red-400" size={20} />
                                    <span className="text-sm font-black uppercase tracking-widest text-red-400">
                                        Offline
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-6 py-12">
                <div className="grid gap-8 lg:grid-cols-12">
                    <div className="space-y-8 lg:col-span-12">
                        {/* Optional Energy Flow Visualization if Charging */}
                        {data.activeTransaction && (
                            <div className="animate-enter relative h-1 w-full overflow-hidden rounded-full bg-white/5">
                                <div className="energy-line absolute h-full w-full" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-8 lg:col-span-7">
                        <VehicleDataCard vehicleData={data.vehicleData} />
                        <RemoteStartButton
                            stationId={stationId}
                            disabled={!data.station?.isOnline}
                            vehicleData={data.vehicleData}
                            activeTransactionId={data.activeTransaction?.transactionId}
                        />
                    </div>

                    <div className="lg:col-span-5">
                        <ConnectorStatus connectors={data.connectors} />
                    </div>
                </div>
            </div>
        </div>
    );
}
