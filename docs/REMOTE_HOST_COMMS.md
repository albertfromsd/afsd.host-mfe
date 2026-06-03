# Remote ↔ Host Communication

Four patterns. Use the lightest one that fits.

## 1. Shared store (state, two-way)

The host's Zustand store is federated as `hostTemplate/stores/store`. Both
sides read and write it. Subscribers in both apps observe every change.

**Use for:** durable state — auth, cart, theme, anything that should
persist for the session.

**Don't use for:** ephemeral events (toasts, "user clicked X"). Store
mutations are observable globally; ephemeral events become noise.

```tsx
// Either side:
import { useStore } from 'hostTemplate/stores/store';

function CartButton() {
  const addToCart = useStore((s) => s.addToCart);
  return <button onClick={() => addToCart({ id: 'sku-1', name: 'Hat', price: 20 })}>Add</button>;
}
```

When the remote calls `addToCart`, the host's navbar count re-renders.
Bidirectional, no extra plumbing.

## 2. Cross-MFE event bus (events, one-shot)

The host exposes a typed event bus as `hostTemplate/lib/eventBus`. Either
side can `emit` or `on(...)`. Events are not persisted; subscribers must be
mounted at the moment of emit.

**Use for:** toasts, focus requests, "remote finished loading X", auth-
expired pushes, navigation requests.

**Don't use for:** state that needs to survive a refresh, or anything you'd
need to read on mount. Use the store for that.

```tsx
// Remote emits:
import { eventBus } from 'hostTemplate/lib/eventBus';

eventBus.emit('toast:show', { message: 'Saved', tone: 'success' });

// Host subscribes:
import { useEffect } from 'react';
import { eventBus } from 'hostTemplate/lib/eventBus';

useEffect(
  () =>
    eventBus.on('toast:show', ({ message, tone }) => {
      /* render toast */
    }),
  [],
);
```

The bus signature is in `src/shared/lib/eventBus.ts`. Add a new event by
extending the `EventMap` type there; both sides see the new event after
type-generation.

See `docs/adr/0005-cross-mfe-event-bus.md` for the design rationale.

## 3. TanStack Query cache (server state, two-way)

Both sides share one `QueryClient` (host's, inherited via React context in
embedded mode). Either side can `invalidateQueries`, prefetch, or read
cache directly.

**Use for:** "remote just saved a user setting; host's user-profile query
needs to refetch."

```tsx
import { useQueryClient } from '@tanstack/react-query';

const qc = useQueryClient();
qc.invalidateQueries({ queryKey: ['user', userId] });
```

Cache keys are the contract. Document them in `src/shared/lib/queryKeys.ts`
if you add many.

## 4. Direct props (the boring one)

If the host renders the remote at a known boundary and knows what to pass,
just pass props.

```tsx
import RemoteApp from '@/components/RemoteApp/RemoteApp';
import { lazy } from 'react';

const RemoteHome = lazy(() => import('remoteTemplate/App'));

<RemoteApp Component={() => <RemoteHome userId={currentUserId} />} name="Home" />;
```

Limitation: the federation entry exports a default React component. To take
props, the remote must declare them in its own type — see the remote's
`src/App.tsx`. For deep prop drilling, prefer pattern 1 or 3.

## Choosing

| Need                                     | Pattern      |
| ---------------------------------------- | ------------ |
| Auth, theme, cart, session state         | Shared store |
| "Show a toast"                           | Event bus    |
| "Refetch query X because Y just changed" | Query cache  |
| Single prop crossing a known boundary    | Direct props |

Don't combine. If you find yourself emitting an event whose only purpose is
to call `addToCart`, just call `addToCart` directly through the store.
