'use client';

import { useState } from 'react';
import { authApi, setTokens, setUser } from '../lib/api';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await authApi.register({ email, full_name: fullName, password });
      }
      const tokens = await authApi.login({ email, password });
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.me();
      setUser(user);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 4 }}>
          G-<span>Midia</span>
        </div>
        <h1>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="subtitle">
          {mode === 'login'
            ? 'Acede ao teu centro de comando digital.'
            : 'Cria a tua conta e começa a gerir as redes sociais.'}
        </p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                placeholder="O teu nome"
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="form-group">
            <label>Palavra-passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          {mode === 'login' ? (
            <>
              Não tens conta?{' '}
              <button
                style={{ color: 'var(--primary)', fontWeight: 600 }}
                onClick={() => { setMode('register'); setError(''); }}
              >
                Regista-te
              </button>
            </>
          ) : (
            <>
              Já tens conta?{' '}
              <button
                style={{ color: 'var(--primary)', fontWeight: 600 }}
                onClick={() => { setMode('login'); setError(''); }}
              >
                Entra
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
