'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/gql-client';
import { GET_STATION_DETAILS } from '@/lib/queries';

export default function DebugPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result: any = await client.request(GET_STATION_DETAILS, { stationId: '250822008C06' });
                setData(result);
                setError(null);
            } catch (err: any) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Debug: Station Data</h1>
            
            {loading && <p>Loading...</p>}
            {error && <pre className="bg-red-900 p-4 rounded text-red-100">{JSON.stringify(error, null, 2)}</pre>}
            {data && (
                <div className="space-y-6">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">ChargingStations</h2>
                        <pre className="bg-gray-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.ChargingStations, null, 2)}</pre>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold mb-4">Connectors</h2>
                        <pre className="bg-gray-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.Connectors, null, 2)}</pre>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold mb-4">VariableAttributes</h2>
                        <pre className="bg-gray-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.VariableAttributes, null, 2)}</pre>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold mb-4">Variables</h2>
                        <pre className="bg-gray-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.Variables, null, 2)}</pre>
                    </section>
                </div>
            )}
        </div>
    );
}
