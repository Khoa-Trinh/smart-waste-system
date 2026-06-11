import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import mqtt from 'mqtt';
import EventEmitter from 'events';
import './MockDataGenerator';

const brokerUrl = 'mqtt://localhost:1883';
const client = mqtt.connect(brokerUrl);
const dataEmitter = new EventEmitter();

// 1. Connect and Subscribe
client.on('connect', () => {
    console.log('✅ [Backend] Connected to MQTT Broker.');
    client.subscribe('building/+/capacity');
});

// 2. Listen for MQTT messages and emit them locally
client.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        dataEmitter.emit('sensor_update', payload);
    } catch (e) {
        console.error('Error parsing MQTT message in backend:', e);
    }
});

// 3. Initialize Elysia with CORS and SSE Stream using async generator
const app = new Elysia()
    .use(cors()) // Allows Next.js (port 3000) to talk to Bun (port 3001)
    .get('/', () => 'Smart Waste Backend is running!')
    .get('/stream', async function* ({ set }) {
        set.headers['content-type'] = 'text/event-stream';
        set.headers['cache-control'] = 'no-cache';
        set.headers['connection'] = 'keep-alive';

        const queue: any[] = [];
        let resolveNext: (() => void) | null = null;

        const listener = (data: any) => {
            queue.push(data);
            if (resolveNext) {
                resolveNext();
                resolveNext = null;
            }
        };

        dataEmitter.on('sensor_update', listener);

        try {
            while (true) {
                if (queue.length === 0) {
                    await new Promise<void>((resolve) => {
                        resolveNext = resolve;
                    });
                }
                while (queue.length > 0) {
                    const data = queue.shift();
                    yield JSON.stringify(data);
                }
            }
        } finally {
            console.log('🔌 Client disconnected, cleaning up data emitter listener.');
            dataEmitter.off('sensor_update', listener);
        }
    })
    .listen(3001);

console.log(`🦊 Elysia SSE API is running at ${app.server?.hostname}:${app.server?.port}`);
