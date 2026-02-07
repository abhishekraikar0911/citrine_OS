"use client";

import { useList } from "@refinedev/core";
import { MapPin, Battery, Zap } from "lucide-react";
import Link from "next/link";

export default function StationList() {
    const { query } = useList({
        resource: "ChargingStations",
        pagination: {
            pageSize: 5,
        },
    });

    const stations = query.data?.data || [];
    const isLoading = query.isLoading;

    if (isLoading) {
        return <div className="p-8 text-center text-indigo-300">Loading stations...</div>;
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stations.map((station: any) => (
                <div
                    key={station.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10 hover:shadow-2xl hover:shadow-indigo-500/20"
                >
                    <div className="mb-4 flex items-start justify-between">
                        <div className="rounded-full bg-indigo-500/20 p-2 text-indigo-400">
                            <Zap size={24} />
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${station.isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            }`}>
                            {station.isOnline ? "Online" : "Offline"}
                        </span>
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-white">{station.id}</h3>

                    <div className="space-y-3 text-sm text-indigo-200/70">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            <span>{station.locationId || "Unknown Location"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Battery size={16} />
                            <span>{station.chargePointModel || "Standard Charger"}</span>
                        </div>
                    </div>

                    <Link href={`/stations/${station.id}`}>
                        <button className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95">
                            View Details
                        </button>
                    </Link>
                </div>
            ))}
        </div>
    );
}

