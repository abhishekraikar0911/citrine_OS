"use client";

interface ConnectorStatusProps {
    connectors: Array<{
        id: string;
        connectorId: number;
        status: string;
        errorCode: string;
        type: string;
        timestamp: string;
    }>;
}

export default function ConnectorStatus({ connectors }: ConnectorStatusProps) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Available: 'emerald',
            Preparing: 'blue',
            Charging: 'purple',
            Finishing: 'amber',
            Unavailable: 'red',
            Faulted: 'red',
        };
        return colors[status] || 'gray';
    };

    const getStatusBgClass = (status: string) => {
        const color = getStatusColor(status);
        return `bg-${color}-500/20 text-${color}-400`;
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="mb-6 text-xl font-bold text-white">Connector Status</h2>

            <div className="space-y-4">
                {connectors.length === 0 ? (
                    <p className="text-center text-indigo-300/60">No connectors found</p>
                ) : (
                    connectors.map((connector) => (
                        <div
                            key={connector.id}
                            className="flex items-center justify-between rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10"
                        >
                            <div>
                                <p className="font-semibold text-white">
                                    Connector {connector.connectorId}
                                </p>
                                <p className="text-sm text-indigo-300/60">{connector.type || 'Unknown Type'}</p>
                                {connector.errorCode && connector.errorCode !== 'NoError' && (
                                    <p className="mt-1 text-xs text-red-400">Error: {connector.errorCode}</p>
                                )}
                            </div>

                            <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusBgClass(connector.status)}`}>
                                {connector.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
