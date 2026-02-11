"use client";

import { useState, useEffect } from "react";

const STATION_ID = "250822008C06"; // Real connected station
const API_URL = process.env.NEXT_PUBLIC_CITRINEOS_API_URL || "http://localhost:8081";

export default function Home() {
  const [soc, setSoc] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleStart = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `${API_URL}/ocpp/1.6/evdriver/remoteStartTransaction?identifier=${STATION_ID}&tenantId=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectorId: 1, idTag: 'TEST_TAG' }),
        }
      );
      const result = await response.json();
      if (response.ok && result[0]?.success) {
        setMessage("Start command sent successfully");
        setIsCharging(true);
      } else {
        // Check if rejected due to connector already charging
        setMessage("Failed to start charging - connector may already be in use");
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `${API_URL}/ocpp/1.6/evdriver/remoteStopTransaction?identifier=${STATION_ID}&tenantId=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: 1 }),
        }
      );
      const result = await response.json();
      if (response.ok && result[0]?.success) {
        setMessage("Stop command sent successfully");
        setIsCharging(false);
      } else {
        setMessage("Failed to stop charging");
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Mock SOC update
  useEffect(() => {
    const interval = setInterval(() => {
      if (isCharging) {
        setSoc(prev => Math.min(100, (prev || 20) + 1));
      } else {
        setSoc(prev => prev || 20);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isCharging]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-8">EV Charging Control</h1>

        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {soc !== null ? `${soc}%` : "--"}
          </div>
          <div className="text-gray-600">State of Charge</div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleStart}
            disabled={loading || isCharging}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded"
          >
            {loading ? "Loading..." : "Start Charging"}
          </button>

          <button
            onClick={handleStop}
            disabled={loading || !isCharging}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded"
          >
            {loading ? "Loading..." : "Stop Charging"}
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm">
            {message}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          Station: {STATION_ID}
        </div>
      </div>
    </div>
  );
}
