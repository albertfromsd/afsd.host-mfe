import './App.css';
import Navbar from './features/Navbar/Navbar';
import { navItems } from './router/nav-links';
import AppRoutes from './router/Routes';

const App = () => {
  return (
    <div className="app-shell">
      <Navbar items={navItems} />
      <main className="app-main">
        <AppRoutes />
      </main>
    </div>
  );
};

export default App;
