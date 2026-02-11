"use client";

import { useEffect, useState } from "react";
import { MapPin, Battery, Zap } from "lucide-react";
import Link from "next/link";
import { client } from "@/lib/gql-client";

interface Station {
    id: string;
    isOnline: boolean;
    locationId?: string;
    chargePointModel?: string;
    chargePointVendor?: string;
}

export default function StationList() {
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const query = `
                    query {
                        ChargingStations {
                            id
                            isOnline
                            locationId
                            chargePointModel
                            chargePointVendor
                        }
                    }
                `;

                const response = await fetch('/api/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });

                const result = await response.json();

                if (result.data?.ChargingStations) {
                    setStations(result.data.ChargingStations);
                } else if (result.ChargingStations) {
                    // Fallback for flat structure if any
                    setStations(result.ChargingStations);
                }

                if (result.errors && !result.data) {
                    setError(result.errors[0]?.message || "Failed to fetch stations");
                } else {
                    setError(null);
                }
            } catch (err: any) {
                console.error("Error fetching stations:", err);
                setError(err.message || "Failed to fetch stations");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStations();
    }, []);

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card animate-pulse rounded-2xl p-6">
                        <div className="mb-4 flex justify-between">
                            <div className="h-10 w-10 rounded-full bg-white/5"></div>
                            <div className="h-6 w-20 rounded-full bg-white/5"></div>
                        </div>
                        <div className="mb-4 h-8 w-3/4 rounded-lg bg-white/5"></div>
                        <div className="space-y-3">
                            <div className="h-4 w-1/2 rounded bg-white/5"></div>
                            <div className="h-4 w-1/3 rounded bg-white/5"></div>
                        </div>
                        <div className="mt-6 h-12 w-full rounded-xl bg-white/5"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-12 text-center">
                <div className="mb-4 rounded-full bg-red-500/20 p-4">
                    <Zap className="text-red-400" size={32} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Connection Error</h3>
                <p className="text-indigo-300/60">{error}</p>
            </div>
        );
    }

    if (stations.length === 0) {
        return (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-12 text-center">
                <div className="mb-4 rounded-full bg-indigo-500/20 p-4">
                    <Zap className="text-indigo-400" size={32} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">No Stations</h3>
                <p className="text-indigo-300/60">No charging stations are currently available.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stations.map((station: Station, index) => (
                <div
                    key={station.id}
                    className="group glass-card animate-enter relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)]"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    {/* Background Glow */}
                    <div className="absolute -right-10 -top-10 -z-10 h-32 w-32 bg-indigo-500/10 blur-3xl transition-all group-hover:bg-indigo-500/20" />

                    <div className="mb-4 flex items-start justify-between">
                        <div className="rounded-2xl bg-indigo-500/20 p-3 text-indigo-400 ring-1 ring-indigo-500/30 transition-all group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white">
                            <Zap size={24} fill={station.isOnline ? "currentColor" : "none"} />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 animate-pulse rounded-full ${station.isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-red-400"}`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${station.isOnline ? "text-emerald-400" : "text-red-400"}`}>
                                {station.isOnline ? "Online" : "Offline"}
                            </span>
                        </div>
                    </div>

                    <h3 className="mb-2 text-2xl font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                        {station.id}
                    </h3>

                    <div className="space-y-3 text-sm font-medium text-indigo-200/50">
                        <div className="flex items-center gap-2 transition-colors group-hover:text-indigo-200/80">
                            <MapPin size={16} className="text-indigo-400/50" />
                            <span>{station.locationId || "Citrine Network"}</span>
                        </div>
                        <div className="flex items-center gap-2 transition-colors group-hover:text-indigo-200/80">
                            <Battery size={16} className="text-indigo-400/50" />
                            <span>{station.chargePointModel || "Ultra Fast DC"}</span>
                        </div>
                    </div>

                    <Link href={`/stations/${station.id}`} className="block">
                        <button className="relative mt-8 w-full overflow-hidden rounded-xl bg-indigo-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-[0.98] group-hover:shadow-indigo-500/40">
                            View Details
                        </button>
                    </Link>
                </div>
            ))}
        </div>
    );
}

