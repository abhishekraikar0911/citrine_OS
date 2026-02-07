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
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="mb-6 text-xl font-bold text-white">Vehicle Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
                {metrics.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                ))}
            </div>

            {vehicleData.socUpdatedAt && (
                <p className="mt-4 text-xs text-indigo-300/60">
                    Last updated: {new Date(vehicleData.socUpdatedAt).toLocaleString()}
                </p>
            )}
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color }: any) {
    const colorClasses = {
        emerald: 'bg-emerald-500/20 text-emerald-400',
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
        amber: 'bg-amber-500/20 text-amber-400',
    };

    return (
        <div className="rounded-xl bg-white/5 p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
                <Icon size={20} />
            </div>
            <p className="text-sm text-indigo-300/60">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
    );
}
