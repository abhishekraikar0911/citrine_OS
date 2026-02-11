import { Zap, ShieldAlert, CheckCircle2, Loader2, ArrowRightCircle } from 'lucide-react';

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
    const getStatusTheme = (status: string) => {
        const themes: Record<string, { color: string; icon: any; glow?: boolean }> = {
            Available: { color: 'emerald', icon: CheckCircle2 },
            Preparing: { color: 'blue', icon: Loader2, glow: true },
            Charging: { color: 'indigo', icon: Zap, glow: true },
            Finishing: { color: 'amber', icon: ArrowRightCircle },
            Unavailable: { color: 'red', icon: ShieldAlert },
            Faulted: { color: 'red', icon: ShieldAlert },
        };
        return themes[status] || { color: 'gray', icon: ShieldAlert };
    };

    return (
        <div className="animate-enter glass-card rounded-3xl p-8" style={{ animationDelay: '100ms' }}>
            <h2 className="mb-8 text-2xl font-bold text-white tracking-tight">Active Connectors</h2>

            <div className="space-y-4">
                {connectors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <ShieldAlert className="mb-3 text-indigo-300/20" size={48} />
                        <p className="text-indigo-300/40 font-medium">No connectors linked to this station</p>
                    </div>
                ) : (
                    connectors.map((connector: any, index: number) => {
                        const theme = getStatusTheme(connector.status);
                        const Icon = theme.icon;

                        const colorStyles: Record<string, string> = {
                            emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 shadow-emerald-500/10',
                            blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20 shadow-blue-500/10',
                            indigo: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20 shadow-indigo-500/10',
                            amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/20 shadow-amber-500/10',
                            red: 'bg-red-500/10 text-red-400 ring-red-500/20 shadow-red-500/10',
                            gray: 'bg-gray-500/10 text-gray-400 ring-gray-500/20 shadow-gray-500/10',
                        };

                        const badgeStyles: Record<string, string> = {
                            emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
                            blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
                            indigo: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
                            amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
                            red: 'bg-red-500/10 text-red-400 ring-red-500/20',
                            gray: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
                        };

                        const dotStyles: Record<string, string> = {
                            emerald: 'bg-emerald-400',
                            blue: 'bg-blue-400',
                            indigo: 'bg-indigo-400',
                            amber: 'bg-amber-400',
                            red: 'bg-red-400',
                            gray: 'bg-gray-400',
                        };

                        return (
                            <div
                                key={connector.id}
                                className="group relative flex items-center justify-between rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5 transition-all hover:bg-white/[0.07] hover:ring-white/10"
                                style={{ animationDelay: `${index * 150}ms` }}
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`rounded-xl p-3 shadow-lg ring-1 ${colorStyles[theme.color]}`}>
                                        <Icon size={24} className={theme.glow ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white tracking-tight">
                                            Connector {connector.connectorId}
                                        </p>
                                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-300/30">
                                            {connector.type || 'Standard AC'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black uppercase tracking-widest ring-1 ${badgeStyles[theme.color]}`}>
                                        {theme.glow && <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${dotStyles[theme.color]}`} />}
                                        {connector.status}
                                    </span>
                                    {connector.errorCode && connector.errorCode !== 'NoError' && (
                                        <p className="mt-2 text-[10px] font-bold uppercase tracking-tighter text-red-500/60">
                                            ERR: {connector.errorCode}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
