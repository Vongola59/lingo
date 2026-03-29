import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./db/schema.js";

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function checkTables() {
  console.log("Checking stripe_webhook_events table:");
  const webhookEvents = await db.select().from(schema.stripeWebhookEvents).limit(10);
  console.log("Found", webhookEvents.length, "webhook events");
  webhookEvents.forEach(event => {
    console.log(`- Event ID: ${event.stripeEventId}, Type: ${event.eventType}, Processed: ${event.processed}, Created: ${event.createdAt}`);
  });

  console.log("\nChecking user_subscription table:");
  const subscriptions = await db.select().from(schema.userSubscription).limit(10);
  console.log("Found", subscriptions.length, "subscriptions");
  subscriptions.forEach(sub => {
    console.log(`- User: ${sub.userId}, Status: ${sub.stripeStatus}, Period End: ${sub.stripeCurrentPeriodEnd}`);
  });
}

checkTables().catch(console.error);