import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const STATION_ID = 'SIM_250822008C06';
const WS_URL = `ws://localhost:8092/${STATION_ID}`;
const MODE = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'listen';

const ws = new WebSocket(WS_URL, 'ocpp1.6');
const pendingCalls = new Map();

let heartbeatInterval;

function connect() {
    console.log(`[Simulator] Connecting to ${WS_URL}...`);
    const ws = new WebSocket(WS_URL, 'ocpp1.6');

    ws.on('open', async () => {
        console.log(`[Simulator] Connected to ${WS_URL}`);

        if (MODE === 'sequence') {
            await runSequence(ws);
        } else {
            console.log('[Simulator] Waiting for server commands...');
        }

        // Clear existing interval if any
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                sendCall(ws, 'Heartbeat', {});
            }
        }, 60000);
    });

    ws.on('message', (data) => {
        const [type, id, actionOrPayload, payload] = JSON.parse(data);

        if (type === 2) { // Call from server
            const action = actionOrPayload;
            console.log(`[Simulator] Received Call ${action}:`, JSON.stringify(payload, null, 2));

            if (action === 'RemoteStartTransaction') {
                sendResult(ws, id, { status: 'Accepted' });
                setTimeout(() => sendCall(ws, 'StartTransaction', {
                    connectorId: payload.connectorId || 1,
                    idTag: payload.idTag,
                    meterStart: 0,
                    timestamp: new Date().toISOString()
                }), 2000);
            } else if (action === 'RemoteStopTransaction') {
                sendResult(ws, id, { status: 'Accepted' });
                setTimeout(() => sendCall(ws, 'StopTransaction', {
                    transactionId: payload.transactionId,
                    meterStop: 100,
                    timestamp: new Date().toISOString()
                }), 2000);
            } else if (action === 'TriggerMessage') {
                sendResult(ws, id, { status: 'Accepted' });
                if (payload.requestedMessage === 'BootNotification') {
                    setTimeout(() => sendCall(ws, 'BootNotification', {
                        chargePointModel: 'Simulator-V1',
                        chargePointVendor: 'CitrineOS'
                    }), 1000);
                }
            } else {
                sendResult(ws, id, { status: 'Accepted' });
            }
        } else if (type === 3) { // Result from server
            console.log(`[Simulator] Received Result for ${id}:`, JSON.stringify(actionOrPayload, null, 2));
            if (pendingCalls.has(id)) {
                pendingCalls.get(id)(actionOrPayload);
                pendingCalls.delete(id);
            }
        }
    });

    ws.on('close', () => {
        console.log('[Simulator] Connection closed. Retrying in 5 seconds...');
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        setTimeout(connect, 5000);
    });

    ws.on('error', (err) => {
        console.error('[Simulator] Error:', err.message);
        ws.close();
    });
}

function sendCall(ws, action, payload) {
    const id = uuidv4();
    const message = JSON.stringify([2, id, action, payload]);
    console.log(`[Simulator] Sending ${action}:`, JSON.stringify(payload, null, 2));
    ws.send(message);
    return new Promise((resolve) => {
        pendingCalls.set(id, resolve);
    });
}

function sendResult(ws, id, payload) {
    const message = JSON.stringify([3, id, payload]);
    console.log(`[Simulator] Sending Result for ${id}:`, JSON.stringify(payload, null, 2));
    ws.send(message);
}

async function runSequence(ws) {
    console.log('[Simulator] Starting Sequence Mode...');

    await sendCall(ws, 'BootNotification', {
        chargePointModel: 'Simulator-V1',
        chargePointVendor: 'CitrineOS'
    });

    await sendCall(ws, 'StatusNotification', {
        connectorId: 1,
        errorCode: 'NoError',
        status: 'Available'
    });

    const auth = await sendCall(ws, 'Authorize', {
        idTag: 'TEST123'
    });

    if (auth.idTagInfo.status === 'Accepted') {
        await sendCall(ws, 'StartTransaction', {
            connectorId: 1,
            idTag: 'TEST123',
            meterStart: 0,
            timestamp: new Date().toISOString()
        });
    }

    console.log('[Simulator] Sequence Complete. Now listening...');
}

connect();
