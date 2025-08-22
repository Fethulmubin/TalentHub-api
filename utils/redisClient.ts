// import redis from 'redis';
import { createClient } from 'redis';

const client = createClient();

client.connect().catch(console.error); // For Redis v4+

export default client;
