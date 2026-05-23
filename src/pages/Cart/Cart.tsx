import { useStore } from 'hostTemplate/stores/store';

export default function Cart() {
  const cart = useStore((s) => s.cart);
  const incrementCart = useStore((s) => s.incrementCart);
  const decrementCart = useStore((s) => s.decrementCart);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const clearCart = useStore((s) => s.clearCart);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <section style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>Cart</h1>
      <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
        Read/written by the host. Items added from the remote's gallery appear here in real time.
      </p>

      {cart.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Cart is empty. Visit the remote's gallery to add items.</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
            {cart.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>
                    ${item.price.toFixed(2)} each
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => decrementCart(item.id)}
                    aria-label={`Decrease ${item.name}`}
                    style={btnStyle}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => incrementCart(item.id)}
                    aria-label={`Increase ${item.name}`}
                    style={btnStyle}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name}`}
                    style={{ ...btnStyle, marginLeft: '0.5rem' }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Total: ${total.toFixed(2)}</strong>
            <button type="button" onClick={clearCart} style={btnStyle}>
              Clear cart
            </button>
          </div>
        </>
      )}
    </section>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  cursor: 'pointer',
  font: 'inherit',
  fontSize: '0.9rem',
};
