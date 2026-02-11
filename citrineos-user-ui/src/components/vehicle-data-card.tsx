"use client";

import { Battery, Gauge, Car, Zap } from 'lucide-react';

interface VehicleDataCardProps {
    vehicleData: {
        soc?: string;
        range?: string;
        model?: string;
        maxcurrent?: string;
        socUpdatedAt?: string;
    };
}

export default function VehicleDataCard({ vehicleData }: VehicleDataCardProps) {
    const metrics = [
        {
            label: 'State of Charge',
            value: vehicleData.soc ? `${parseFloat(vehicleData.soc).toFixed(1)}%` : 'N/A',
            icon: Battery,
            color: 'emerald',
            glow: true,
        },
        {
            label: 'Range',
            value: vehicleData.range ? `${parseFloat(vehicleData.range).toFixed(1)} km` : 'N/A',
            icon: Gauge,
            color: 'blue',
        },
        {
            label: 'Vehicle Model',
            value: vehicleData.model || 'Unknown',
            icon: Car,
            color: 'purple',
        },
        {
            label: 'Max Current',
            value: vehicleData.maxcurrent ? `${vehicleData.maxcurrent} A` : 'N/A',
            icon: Zap,
            color: 'amber',
        },
    ];

    return (
        <div className="animate-enter glass-card rounded-3xl p-8">
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">Vehicle Telemetry</h2>
                <div className="rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-400 ring-1 ring-indigo-500/20">
                    Live Data
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                {metrics.map((metric, index) => (
                    <MetricCard key={metric.label} {...metric} index={index} />
                ))}
            </div>

            {vehicleData.socUpdatedAt && (
                <div className="mt-8 flex items-center gap-2 text-xs font-medium text-indigo-300/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/40" />
                    Last sync: {new Date(vehicleData.socUpdatedAt).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, index, glow }: any) {
    const colorClasses = {
        emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
        amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    };

    return (
        <div
            className="group glass rounded-2xl p-5 transition-all hover:bg-white/[0.07] hover:shadow-lg"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div className={`mb-4 inline-flex rounded-xl p-2.5 ring-1 ${colorClasses[color as keyof typeof colorClasses]}`}>
                <Icon size={22} className={glow ? 'animate-pulse' : ''} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-300/40">{label}</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white tracking-tight">{value}</p>
        </div>
    );
}
