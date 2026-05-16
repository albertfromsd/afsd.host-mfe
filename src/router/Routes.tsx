import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import RemoteApp from '@/components/RemoteApp/RemoteApp';
import Cart from '@/pages/Cart';

const RemoteTemplateApp = lazy(() => import('remoteTemplate/App'));

const Page = ({ title }: { title: string }) => (
  <section style={{ padding: '2rem' }}>
    <h1>{title}</h1>
  </section>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Page title="Home" />} />
      <Route path="/about" element={<Page title="About" />} />
      <Route path="/pricing" element={<Page title="Pricing" />} />
      <Route path="/solutions/enterprise" element={<Page title="Enterprise" />} />
      <Route path="/solutions/startup" element={<Page title="Startup" />} />
      <Route path="/cart" element={<Cart />} />
      <Route
        path="/remote/*"
        element={<RemoteApp Component={RemoteTemplateApp} name="Remote Template" />}
      />
      <Route path="*" element={<Page title="Not found" />} />
    </Routes>
  );
}
