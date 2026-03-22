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

if (!ANALYTICS_API_URL) {
  throw new Error('ANALYTICS_API_URL environment variable is required');
}
if (!ANALYTICS_API_SECRET) {
  throw new Error('ANALYTICS_API_SECRET environment variable is required');
}

interface RegisterPayload {
  email: string;
  name: string;
  registeredAt: string; // ISO 8601
}

export async function recordRegistration(payload: RegisterPayload): Promise<void> {
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
    throw new Error(`Archive API error ${res.status}: ${body}`);
  }
}
