import { prisma } from './prisma.js';
import { encodeJson } from './json.js';

export async function logActivity({ userId, adminId, action, entityType, entityId, metadata, ipAddress }) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId ?? null,
        adminId: adminId ?? null,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        metadata: encodeJson(metadata),
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    // Activity logging must never break the main flow.
    console.error('activity log failed:', err.message);
  }
}
