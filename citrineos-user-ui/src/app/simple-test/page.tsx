'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Battery, Gauge, Zap, Info, Loader2 } from 'lucide-react';
import { HASURA_URL, CITRINEOS_API_URL as CITRINE_API_URL } from '@/lib/utils';

const STATION_ID = '250822008C06';

export default function SimpleTestPage() {
    const [status, setStatus] = useState('Unknown');
    const [telemetry, setTelemetry] = useState({ soc: '0', range: '0', model: 'N/A' });
    const [transactionId, setTransactionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchData = async () => {
        const query = {
            query: `
                query FetchStatus($stationId: String!) {
                    Connectors(where: { stationId: { _eq: $stationId } }) {
                        status
                    }
                    VariableAttributes(where: { stationId: { _eq: $stationId } }) {
                        value
                        variableId
                    }
                    Variables {
                        id
                        name
                    }
                    Transactions(where: { stationId: { _eq: $stationId }, isActive: { _eq: true } }, limit: 1, order_by: { id: desc }) {
                        transactionId
                    }
                }
            `,
            variables: { stationId: STATION_ID }
        };

        try {
            const res = await fetch(HASURA_URL, {
                method: 'POST',
                headers: { 'x-hasura-admin-secret': 'CitrineOS!' },
                body: JSON.stringify(query)
            });
            const { data } = await res.json();

            if (data.Connectors && data.Connectors.length > 0) {
                setStatus(data.Connectors[0].status);
            }

            if (data.Transactions && data.Transactions.length > 0) {
                // Ensure we parse the string transactionId to number if required by API
                const tId = parseInt(data.Transactions[0].transactionId);
                setTransactionId(tId);
            } else {
                setTransactionId(null);
            }

            const varMap = Object.fromEntries(data.Variables.map((v: any) => [v.id, v.name]));
            const newTelemetry = { ...telemetry };
            data.VariableAttributes.forEach((attr: any) => {
                const name = varMap[attr.variableId];
                if (name === 'Soc') newTelemetry.soc = attr.value;
                if (name === 'Range') newTelemetry.range = attr.value;
                if (name === 'Model') newTelemetry.model = attr.value;
            });
            setTelemetry(newTelemetry);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const performAction = async (action: 'remoteStartTransaction' | 'remoteStopTransaction') => {
        setActionLoading(true);
        setMessage({ type: 'info', text: `Sending ${action}...` });

        try {
            const body = action === 'remoteStartTransaction'
                ? { connectorId: 1, idTag: 'TEST123' } // Use authorized tag
                : { transactionId: transactionId };

            if (action === 'remoteStopTransaction' && !transactionId) {
                setMessage({ type: 'error', text: 'No active transaction found to stop.' });
                setActionLoading(false);
                return;
            }

            const res = await fetch(`${CITRINE_API_URL}/ocpp/1.6/evdriver/${action}?identifier=${STATION_ID}&tenantId=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const results = await res.json();
                if (results[0]?.success) {
                    setMessage({ type: 'success', text: `${action} accepted!` });
                } else {
                    setMessage({ type: 'error', text: `${action} failed or rejected.` });
                }
            } else {
                setMessage({ type: 'error', text: `HTTP Error: ${res.status}` });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusColor = (s: string) => {
        if (s === 'Available') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
        if (s === 'Preparing' || s === 'Charging') return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 flex flex-col items-center justify-start pt-12">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
                        Simple <span className="text-indigo-500">Tester</span>
                    </h1>
                    <p className="text-sm text-slate-500">Testing station: {STATION_ID}</p>
                </div>

                {/* Status Card */}
                <div className={`rounded-3xl border p-8 flex flex-col items-center justify-center transition-all duration-500 shadow-2xl ${getStatusColor(status)}`}>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Station Status</p>
                    <h2 className="text-4xl font-extrabold tracking-tight">{loading ? '...' : status}</h2>
                </div>

                {/* Telemetry Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-indigo-400">
                            <Battery size={18} />
                            <span className="text-xs font-bold uppercase">Soc</span>
                        </div>
                        <p className="text-2xl font-black text-white">{parseFloat(telemetry.soc).toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-indigo-400">
                            <Gauge size={18} />
                            <span className="text-xs font-bold uppercase">Range</span>
                        </div>
                        <p className="text-2xl font-black text-white">{parseFloat(telemetry.range).toFixed(0)} km</p>
                    </div>
                    <div className="col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <Zap size={18} />
                            <span className="text-xs font-bold uppercase">Model</span>
                        </div>
                        <p className="text-lg font-bold text-white uppercase">{telemetry.model}</p>
                    </div>
                </div>

                {/* Action Controls */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => performAction('remoteStartTransaction')}
                        disabled={actionLoading || status === 'Charging'}
                        className="flex flex-col items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl py-6 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                    >
                        {actionLoading ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" size={24} />}
                        <span className="text-xs font-black uppercase tracking-tighter">Start Charge</span>
                    </button>
                    <button
                        onClick={() => performAction('remoteStopTransaction')}
                        disabled={actionLoading || status !== 'Charging'}
                        className="flex flex-col items-center justify-center gap-2 bg-slate-100 hover:bg-white disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-900 rounded-2xl py-6 transition-all active:scale-95 shadow-lg"
                    >
                        <Square fill="currentColor" size={24} />
                        <span className="text-xs font-black uppercase tracking-tighter">Stop Charge</span>
                    </button>
                </div>

                {/* Feedback Message */}
                {message.text && (
                    <div className={`mt-4 p-4 rounded-xl border flex items-center gap-3 text-sm font-medium animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                            'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                        <Info size={18} className="shrink-0" />
                        <p className="leading-tight">{message.text}</p>
                    </div>
                )}
            </div>

            <footer className="mt-auto py-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                CitrineOS Tester • Alpha v0.1
            </footer>
        </div>
    );
}
