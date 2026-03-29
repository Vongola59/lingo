import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/drizzle";
import { stripe } from "@/lib/stripe";
import { userSubscription, stripeWebhookEvents } from "@/db/schema";

const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.deleted",
  "customer.subscription.updated",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch(error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return new NextResponse(`Webhook error: ${error.message}`, { status: 400 });
  }

  const isRelevant = RELEVANT_EVENTS.has(event.type);
  if (isRelevant) {
    try {
      await db.insert(stripeWebhookEvents).values({
        stripeEventId: event.id,
        eventType: event.type,
        data: JSON.stringify(event.data),
      }).onConflictDoNothing();
    } catch (error: any) {
      console.error("Failed to record webhook event:", error.message);
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session?.metadata?.userId) {
        return new NextResponse("User ID is required", { status: 400 });
      }

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        await db.insert(userSubscription).values({
          userId: session.metadata.userId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          stripeStatus: subscription.status,
          stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
        }).onConflictDoUpdate({
          target: userSubscription.stripeSubscriptionId,
          set: {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            stripeStatus: subscription.status,
            stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
      }
    } else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

        await db.update(userSubscription).set({
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          stripeStatus: subscription.status,
          stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
        }).where(eq(userSubscription.stripeSubscriptionId, subscription.id));
      }
    }

    // 统一更新核心事件处理状态
    if (isRelevant) {
      await db.update(stripeWebhookEvents)
        .set({ processed: true })
        .where(eq(stripeWebhookEvents.stripeEventId, event.id));
    }

  } catch (error: any) {
    console.error("Webhook logic failed:", error.message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
