import './App.css';
import Navbar from './features/Navbar/Navbar';
import { navItems } from './router/nav-links';

const App = () => {
  return (
    <div className="content">
      <Navbar items={navItems} />
      <h1>Rsbuild with React</h1>
      <p>Start building amazing things with Rsbuild.</p>
    </div>
  );
};

export default App;
