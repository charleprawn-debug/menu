import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { configuredGracePeriodDays, graceEndFor } from "@/lib/billing/lifecycle";

export const dynamic = "force-dynamic";

function validCronAuthorization(request: Request, secret: string): boolean {
  const supplied = request.headers.get("authorization") ?? "";
  const token = supplied.startsWith("Bearer ") ? supplied.slice(7) : "";
  const expectedDigest = createHash("sha256").update(secret).digest();
  const suppliedDigest = createHash("sha256").update(token).digest();
  return timingSafeEqual(expectedDigest, suppliedDigest) && token.length > 0;
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  if (!validCronAuthorization(request, secret)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = new Date();
  const graceDays = configuredGracePeriodDays();
  const counts = await db.$transaction(async (tx) => {
    const local = { providerSubscriptionId: null };
    const cancelledTrials = await tx.subscription.updateMany({
      where: {
        ...local,
        status: "TRIALING",
        cancelAtPeriodEnd: true,
        OR: [{ trialEndsAt: { lte: now } }, { trialEndsAt: null, currentPeriodEnd: { lte: now } }],
      },
      data: { status: "CANCELLED", cancelledAt: now, graceEndsAt: null },
    });
    const expiredTrials = await tx.subscription.updateMany({
      where: {
        ...local,
        status: "TRIALING",
        OR: [{ trialEndsAt: { lte: now } }, { trialEndsAt: null, currentPeriodEnd: { lte: now } }],
      },
      data: { status: "EXPIRED", graceEndsAt: null },
    });
    const cancelledAtEnd = await tx.subscription.updateMany({
      where: { ...local, status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: { lte: now } },
      data: { status: "CANCELLED", cancelledAt: now, graceEndsAt: null },
    });

    const overdue = await tx.subscription.findMany({
      where: { ...local, status: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: { lte: now } },
      select: { id: true, currentPeriodEnd: true },
    });
    let pastDue = 0;
    let paused = 0;
    for (const subscription of overdue) {
      const graceEndsAt = graceEndFor(subscription.currentPeriodEnd, graceDays);
      const status = graceEndsAt > now ? "PAST_DUE" : "PAUSED";
      const changed = await tx.subscription.updateMany({
        where: { id: subscription.id, status: "ACTIVE", providerSubscriptionId: null, currentPeriodEnd: { lte: now } },
        data: { status, graceEndsAt },
      });
      if (changed.count) status === "PAST_DUE" ? pastDue++ : paused++;
    }
    const graceExpired = await tx.subscription.updateMany({
      where: {
        ...local,
        status: "PAST_DUE",
        currentPeriodEnd: { lte: now },
        OR: [{ graceEndsAt: { lte: now } }, { graceEndsAt: null }],
      },
      data: { status: "PAUSED", graceEndsAt: now },
    });
    const awaitingProvider = await tx.subscriptionPlanChange.updateMany({
      where: { status: "SCHEDULED", effectiveAt: { lte: now }, subscription: { providerSubscriptionId: null } },
      data: { status: "AWAITING_PROVIDER" },
    });
    const [expiredResetTokens, expiredVerificationTokens, expiredSessions] = await Promise.all([
      tx.passwordResetToken.deleteMany({ where: { expiresAt: { lte: now } } }),
      tx.emailVerificationToken.deleteMany({ where: { expiresAt: { lte: now } } }),
      tx.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    ]);
    return {
      cancelledTrials: cancelledTrials.count,
      expiredTrials: expiredTrials.count,
      cancelledAtEnd: cancelledAtEnd.count,
      pastDue,
      paused: paused + graceExpired.count,
      awaitingProvider: awaitingProvider.count,
      expiredResetTokens: expiredResetTokens.count,
      expiredVerificationTokens: expiredVerificationTokens.count,
      expiredSessions: expiredSessions.count,
    };
  });

  return NextResponse.json({ processedAt: now.toISOString(), graceDays, counts });
}
