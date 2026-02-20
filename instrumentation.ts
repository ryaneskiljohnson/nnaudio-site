/**
 * @fileoverview Next.js instrumentation: runs once when the Node server starts.
 * @module instrumentation
 *
 * Sets global React so styled-components (which reads React at module load) does
 * not throw "React is not defined" during SSR or Turbopack module evaluation.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const React = await import('react');
    (globalThis as unknown as { React: typeof React.default }).React = React.default;
  }
}
