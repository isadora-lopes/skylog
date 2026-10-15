import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="brand">
        <strong>Skylog</strong>
        <span>Diário de observação</span>
      </div>

      <nav className="app-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Observações
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        <NavLink to="/sugestoes" className={({ isActive }) => (isActive ? 'active' : '')}>
          Sugestões
        </NavLink>
      </nav>

      <div className="user-area">
        <span>{user?.name}</span>
        <button type="button" className="btn-ghost" onClick={logout}>
          Sair
        </button>
      </div>
    </header>
  );
}
