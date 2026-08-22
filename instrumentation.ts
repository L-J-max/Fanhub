/**
 * Next.js instrumentation hook — runs once when the server boots. We use it to
 * seed the built-in administrator account (888 / 88888888) so it always exists.
 */
export async function register() {
  // Only run on the Node.js server runtime (not the edge/browser).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { ensureAdmin } = await import('./lib/auth');
      await ensureAdmin();
    } catch {
      /* best-effort; admin seeding must not crash boot */
    }
  }
}
