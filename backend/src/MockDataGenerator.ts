import mqtt from 'mqtt';

const BROKER_URL = 'mqtt://localhost:1883';
const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
    console.log('🤖 [Simulator] Connected to MQTT Broker.');

    // Generate fake data every 5 seconds
    setInterval(() => {
        // Loop through Floors 2 to 10
        for (let floor = 2; floor <= 10; floor++) {
            const payload = {
                floor: floor,
                capacity: Math.floor(Math.random() * 101), // Random % from 0 to 100
                timestamp: new Date().toISOString()
            };

            const topic = `building/floor${floor}/capacity`;
            
            // Publish the JSON payload to the broker
            client.publish(topic, JSON.stringify(payload));
        }
        console.log(`[Simulator] 📡 Broadcasted mock data for 9 floors...`);
    }, 5000);
});

client.on('error', (err) => {
    console.error('Simulator MQTT Error:', err);
});
