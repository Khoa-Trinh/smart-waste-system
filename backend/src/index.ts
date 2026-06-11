import { Elysia } from 'elysia';
import mqtt from 'mqtt';
import './MockDataGenerator'; // This automatically starts the simulator loop

const BROKER_URL = 'mqtt://localhost:1883';
const client = mqtt.connect(BROKER_URL);

// 1. Initialize Elysia Server
const app = new Elysia()
    .get('/', () => 'Smart Waste Backend is running!')
    .listen(3001);

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);

// 2. Connect Backend to MQTT Broker
client.on('connect', () => {
    console.log('✅ [Backend] Successfully connected to MQTT Broker.');
    
    // Subscribe to all floor capacity topics using the '+' wildcard
    client.subscribe('building/+/capacity', (err) => {
        if (!err) {
            console.log('🎧 [Backend] Subscribed to topic: building/+/capacity');
        }
    });
});

// 3. Log the Pipeline (The verification step)
client.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        
        console.log(`\n📥 [NEW DATA] Topic: ${topic}`);
        console.log(`   ├─ Floor: ${payload.floor}`);
        console.log(`   ├─ Capacity: ${payload.capacity}%`);
        console.log(`   └─ Time: ${payload.timestamp}`);
    } catch (e) {
        console.error('Error parsing MQTT message:', e);
    }
});
