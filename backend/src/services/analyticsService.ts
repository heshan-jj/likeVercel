/**
 * analyticsService.ts
 *
 * Sends registration data to the central Archive API on the VPS.
 * Stores under project: 'likevercel', collection: 'registrations'.
 * Called once during POST /auth/register — throws on failure so the
 * caller can roll back the local user creation.
 */

const ANALYTICS_API_URL = process.env.ANALYTICS_API_URL;
const ANALYTICS_API_SECRET = process.env.ANALYTICS_API_SECRET;

const isEnabled = !!(ANALYTICS_API_URL && ANALYTICS_API_SECRET);

if (!isEnabled) {
  console.log('[Analytics] Service disabled (missing ANALYTICS_API_URL or ANALYTICS_API_SECRET)');
}

interface RegisterPayload {
  email: string;
  name: string;
  registeredAt: string; // ISO 8601
}

export async function recordRegistration(payload: RegisterPayload): Promise<void> {
  if (!isEnabled) return;
  
  const res = await fetch(
    `${ANALYTICS_API_URL}/projects/likevercel/collections/registrations/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANALYTICS_API_SECRET}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Analytics] Archive API error ${res.status}: ${body}`);
  }
}
