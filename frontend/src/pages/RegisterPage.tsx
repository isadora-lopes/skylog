import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../utils/errors';
import '../styles/auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar a conta. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-side">
        <span className="auth-brand">Skylog · Diário de observação</span>
        <div className="auth-headline">
          <h1>Comece seu catálogo pessoal do céu.</h1>
          <p>Registre observações, acompanhe estatísticas e descubra o que observar a seguir.</p>
        </div>
        <div className="auth-coords">
          <span>LAT —27.5954</span>
          <span>LON —48.5480</span>
        </div>
      </aside>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Criar conta</h2>
          <p className="auth-sub">Leva menos de um minuto.</p>

          {error && <div className="auth-alert">{error}</div>}

          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirmar senha</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Criando…' : 'Criar conta'}
          </button>

          <p className="auth-footer">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
