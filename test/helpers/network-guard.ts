/**
 * Real-network guard for the test harness.
 *
 * Blocks every outbound TCP/TLS connection (net.Socket#connect with a port)
 * and global fetch. A blocked attempt throws at the call site AND is recorded,
 * so the per-file afterEach hook fails the test even if production code
 * swallowed the error. Local IPC (sockets connected by path) is allowed,
 * because the test runner itself uses it.
 */
import net from "node:net";

export interface BlockedAttempt {
  kind: "socket" | "fetch";
  target: string;
}

const attempts: BlockedAttempt[] = [];
let installed = false;

export class RealNetworkAttemptError extends Error {
  constructor(target: string) {
    super(`[test harness] real network attempt blocked: ${target}`);
    this.name = "RealNetworkAttemptError";
  }
}

function describeTarget(args: unknown[]): { tcp: boolean; target: string } {
  // net.connect() passes normalized args as an array: [options, callback].
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof first === "number") {
    return { tcp: true, target: `${String(args[1] ?? "localhost")}:${first}` };
  }
  if (first && typeof first === "object") {
    const o = first as { port?: unknown; host?: unknown; path?: unknown };
    if (o.port !== undefined) return { tcp: true, target: `${String(o.host ?? "localhost")}:${String(o.port)}` };
    if (o.path !== undefined) return { tcp: false, target: String(o.path) };
  }
  if (typeof first === "string") {
    // A numeric string is a port; anything else is an IPC path.
    return /^\d+$/.test(first) ? { tcp: true, target: `localhost:${first}` } : { tcp: false, target: first };
  }
  return { tcp: true, target: "unknown" };
}

export function installNetworkGuard(): void {
  if (installed) return;
  installed = true;

  const originalConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function guardedConnect(this: net.Socket, ...args: unknown[]) {
    const { tcp, target } = describeTarget(args);
    if (tcp) {
      attempts.push({ kind: "socket", target });
      throw new RealNetworkAttemptError(target);
    }
    return (originalConnect as (...a: unknown[]) => net.Socket).apply(this, args);
  } as typeof net.Socket.prototype.connect;

  globalThis.fetch = (async (input: unknown) => {
    const target =
      typeof input === "string" ? input : input instanceof URL ? input.href : String((input as { url?: string })?.url);
    attempts.push({ kind: "fetch", target });
    throw new RealNetworkAttemptError(target);
  }) as typeof fetch;
}

export function blockedAttempts(): readonly BlockedAttempt[] {
  return attempts;
}

/** Clears the record. Only for harness self-tests that provoke an attempt on purpose. */
export function clearBlockedAttempts(): void {
  attempts.length = 0;
}

export function assertNoRealNetworkAttempts(): void {
  if (attempts.length > 0) {
    const list = attempts.map((a) => `${a.kind} → ${a.target}`).join(", ");
    attempts.length = 0;
    throw new Error(`[test harness] test made real network attempts: ${list}`);
  }
}
