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
                const result: any = await client.request(GET_STATION_DETAILS, { stationId });

                // Parse vehicle data from VariableAttributes
                const vehicleData = parseVehicleData(
                    result.VariableAttributes,
                    result.Variables
                );

                setData({
                    station: result.ChargingStations[0],
                    connectors: result.Connectors,
                    vehicleData,
                    activeTransaction: result.Transactions?.[0] || null,
                });
                setError(null);
            } catch (err: any) {
                setError(err.message);
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
