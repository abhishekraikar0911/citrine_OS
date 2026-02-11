'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/gql-client';

interface Station {
    id: string;
    isOnline: boolean;
    locationId?: string;
    chargePointModel?: string;
    chargePointVendor?: string;
}

export default function DebugHomePage() {
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
                const result: any = await client.request(query);
                console.log('Fetched stations:', result);
                setStations(result.ChargingStations || []);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching stations:', err);
                
                // graphql-request throws error but response might have data
                // Check if error object contains response data (status 200)
                if (err.response && err.response.status === 200 && err.response.ChargingStations) {
                    console.log('Extracted data from error response:', err.response);
                    setStations(err.response.ChargingStations);
                    setError(null);
                } else {
                    setError(err.message || 'Failed to fetch stations');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchStations();
    }, []);

    return (
        <main className="min-h-screen bg-[#020617] text-white p-8">
            <h1 className="text-4xl font-bold mb-8">Debug - Station List</h1>
            
            <div className="mb-8 space-y-4">
                <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                <p><strong>Error:</strong> {error || 'None'}</p>
                <p><strong>Stations Count:</strong> {stations.length}</p>
            </div>

            {error && (
                <div className="mb-8 bg-red-900 p-4 rounded">
                    <p className="text-red-100">Error: {error}</p>
                </div>
            )}

            {isLoading && (
                <div className="mb-8 bg-blue-900 p-4 rounded">
                    <p className="text-blue-100">Loading stations...</p>
                </div>
            )}

            {!isLoading && stations.length === 0 && (
                <div className="mb-8 bg-yellow-900 p-4 rounded">
                    <p className="text-yellow-100">No stations found</p>
                </div>
            )}

            {stations.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold mb-4">Stations ({stations.length}):</h2>
                    {stations.map((station) => (
                        <div key={station.id} className="bg-indigo-900 p-4 rounded">
                            <p><strong>ID:</strong> {station.id}</p>
                            <p><strong>Online:</strong> {station.isOnline ? 'Yes' : 'No'}</p>
                            <p><strong>Vendor:</strong> {station.chargePointVendor || 'N/A'}</p>
                            <p><strong>Model:</strong> {station.chargePointModel || 'N/A'}</p>
                            <p><strong>Location:</strong> {station.locationId || 'N/A'}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-12">
                <pre className="bg-gray-900 p-4 rounded text-sm">
                    {JSON.stringify({ isLoading, error, stationsCount: stations.length, stations }, null, 2)}
                </pre>
            </div>
        </main>
    );
}
