// // import redis from 'redis';
// import { createClient } from 'redis';

// const client = createClient();

// client.connect().catch(console.error); // For Redis v4+

// export default client;

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default redis;

// await client.set("foo", "bar");
// const value = await redis.get("foo");
