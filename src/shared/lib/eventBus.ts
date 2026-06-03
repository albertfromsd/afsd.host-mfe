/**
 * Cross-MFE event bus — federation-exposed pubsub for one-shot events
 * that don't belong in the shared Zustand store.
 *
 * Why a separate channel from the store:
 *   - Store mutations are observed by every subscriber across host+remote;
 *     ephemeral "show this toast" events would flood selectors.
 *   - The store persists to sessionStorage; transient events shouldn't.
 *   - Events have payloads with rich shapes (focus targets, navigation
 *     intents) that don't model naturally as state.
 *
 * Use the store for state, this bus for events. See
 * docs/REMOTE_HOST_COMMS.md for the full decision table.
 *
 * Implementation:
 *   Backed by EventTarget so it inherits browser-native semantics (sync
 *   dispatch, listener ordering, error isolation). Singleton — federated
 *   as `hostTemplate/lib/eventBus`, deduplicated via the same
 *   self-federation pattern as the store (see ADR 0003).
 */

/**
 * Registered event types. Extending this is the contract.
 *
 * Add a key here BEFORE emitting or listening — the types flow through to
 * both sides via `@mf-types/`. Removing a key is a breaking change; treat
 * it like a federation rename.
 */
export type EventMap = {
  /** Show a transient notification. Renderer subscribes once at app root. */
  'toast:show': { message: string; tone?: 'info' | 'success' | 'warning' | 'error' };
  /** Request navigation. Host's router subscribes; remote emits. */
  'nav:request': { to: string; replace?: boolean };
  /** Session expired or token invalid. Auth flow subscribes. */
  'auth:expired': { reason?: string };
  /** Remote successfully mounted. Useful for analytics / readiness signals. */
  'remote:ready': { name: string };
  /** Remote failed to load. Mirrors the federation runtime plugin's error. */
  'remote:error': { name: string; error: string };
};

export type EventName = keyof EventMap;

export type Unsubscribe = () => void;

type Listener<K extends EventName> = (payload: EventMap[K]) => void;

class EventBus {
  private readonly target = new EventTarget();

  /**
   * Subscribe to `name`. Returns an unsubscribe function — call it in
   * `useEffect`'s cleanup or React's StrictMode will double-fire.
   */
  on<K extends EventName>(name: K, listener: Listener<K>): Unsubscribe {
    const handler = (event: Event) => {
      // CustomEvent.detail carries the typed payload.
      listener((event as CustomEvent<EventMap[K]>).detail);
    };
    this.target.addEventListener(name, handler);
    return () => this.target.removeEventListener(name, handler);
  }

  /**
   * Subscribe and auto-unsubscribe after the first emit.
   */
  once<K extends EventName>(name: K, listener: Listener<K>): Unsubscribe {
    const off = this.on(name, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  /**
   * Emit synchronously. Listeners run in registration order; an exception
   * in one listener does NOT stop subsequent listeners (EventTarget behavior).
   */
  emit<K extends EventName>(name: K, payload: EventMap[K]): void {
    this.target.dispatchEvent(new CustomEvent(name, { detail: payload }));
  }
}

/**
 * Singleton. Federation's `singleton: true` for shared modules guarantees
 * one instance across host + remote. The runtime plugin in
 * `mfRuntimePlugin.ts` registers this as a shared module implicitly via
 * the federation config in `rsbuild.config.ts`.
 */
export const eventBus = new EventBus();

export type { EventBus };
