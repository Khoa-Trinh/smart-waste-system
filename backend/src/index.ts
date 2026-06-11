import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Stream } from '@elysiajs/stream';
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

// 3. Initialize Elysia with CORS and SSE Stream
const app = new Elysia()
    .use(cors()) // Allows Next.js (port 3000) to talk to Bun (port 3001)
    .get('/', () => 'Smart Waste Backend is running!')
    .get('/stream', () => new Stream((stream) => {
        // When a new web client connects, listen to the emitter
        const listener = (data: any) => {
            stream.send(data);
        };
        dataEmitter.on('sensor_update', listener);
        
        // Clean up memory if the web page closes
        stream.on('close', () => {
            dataEmitter.off('sensor_update', listener);
        });
    }))
    .listen(3001);

console.log(`🦊 Elysia SSE API is running at ${app.server?.hostname}:${app.server?.port}`);
