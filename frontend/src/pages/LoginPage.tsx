import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../utils/errors';
import '../styles/auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-side">
        <span className="auth-brand">Skylog · Diário de observação</span>
        <div className="auth-headline">
          <h1>Cada noite de céu limpo merece um registro.</h1>
          <p>
            Catalogue o que você observou, com que equipamento e sob quais condições — e acompanhe sua
            jornada ao longo do tempo.
          </p>
        </div>
        <div className="auth-coords">
          <span>LAT —27.5954</span>
          <span>LON —48.5480</span>
          <span>ALT 3M</span>
        </div>
      </aside>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Entrar na conta</h2>
          <p className="auth-sub">Acesse seu diário de observações.</p>

          {error && <div className="auth-alert">{error}</div>}

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="auth-footer">
            Não tem conta? <Link to="/registrar-conta">Criar conta gratuita</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
