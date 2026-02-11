import { useEffect, useState } from 'react';
import { client } from '@/lib/gql-client';
import { GET_STATION_DETAILS } from '@/lib/queries';

interface VehicleData {
    soc?: string;
    range?: string;
    model?: string;
    maxcurrent?: string;
    socUpdatedAt?: string;
}

interface StationData {
    station: any;
    connectors: any[];
    vehicleData: VehicleData;
    activeTransaction: { transactionId: string } | null;
}

export function useStationData(stationId: string) {
    const [data, setData] = useState<StationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: GET_STATION_DETAILS, variables: { stationId } })
                });

                const result = await response.json();

                if (result.data) {
                    const data = result.data;
                    // Parse vehicle data from VariableAttributes
                    const vehicleData = parseVehicleData(
                        data.VariableAttributes,
                        data.Variables
                    );

                    setData({
                        station: data.ChargingStations[0],
                        connectors: data.Connectors,
                        vehicleData,
                        activeTransaction: data.Transactions?.[0] || null,
                    });
                }

                if (result.errors && !result.data) {
                    setError(result.errors[0]?.message || "Failed to fetch station data");
                } else {
                    setError(null);
                }
            } catch (err: any) {
                console.error("Error fetching station data:", err);
                setError(err.message || "Failed to fetch station data");
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchData();

        // Poll every 5 seconds for real-time updates
        const interval = setInterval(fetchData, 5000);

        return () => clearInterval(interval);
    }, [stationId]);

    return { data, loading, error };
}

function parseVehicleData(attributes: any[], variables: any[]): VehicleData {
    const variableMap = Object.fromEntries(
        variables.map(v => [v.id, v.name])
    );

    return attributes.reduce((acc: VehicleData, attr) => {
        const name = variableMap[attr.variableId];
        if (['Soc', 'Range', 'Model', 'MaxCurrent'].includes(name)) {
            const key = name.toLowerCase() as keyof VehicleData;
            acc[key] = attr.value;
            if (name === 'Soc' && attr.generatedAt) {
                acc.socUpdatedAt = attr.generatedAt;
            }
        }
        return acc;
    }, {});
}
