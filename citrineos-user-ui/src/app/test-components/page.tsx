'use client';

import VehicleDataCard from '@/components/vehicle-data-card';
import ConnectorStatus from '@/components/connector-status';
import RemoteStartButton from '@/components/remote-start-button';
import { Wifi } from 'lucide-react';

export default function TestComponentsPage() {
    const mockVehicleData = {
        soc: '35.23',
        range: '57.07',
        model: 'Pro',
        maxcurrent: '31',
        socUpdatedAt: new Date().toISOString(),
    };

    const mockConnectors = [
        {
            id: '1',
            connectorId: 1,
            status: 'Available',
            errorCode: 'NoError',
            type: 'type6',
            timestamp: new Date().toISOString(),
        },
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-white/10 bg-white/5 px-6 py-8 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl">
                    <h1 className="mb-2 text-3xl font-bold text-white">Test Components (Mock Data)</h1>
                    <p className="text-indigo-300/60">Verify components render with hardcoded data</p>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="grid gap-6 lg:grid-cols-2">
                    <VehicleDataCard vehicleData={mockVehicleData} />
                    <ConnectorStatus connectors={mockConnectors} />
                </div>

                <RemoteStartButton
                    stationId="250822008C06"
                    disabled={false}
                    vehicleData={mockVehicleData}
                    activeTransactionId={undefined}
                />
            </div>
        </div>
    );
}
