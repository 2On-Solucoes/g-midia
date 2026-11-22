'use client';

import { clearTokens, getUser } from '../lib/api';

const NAV = [
  { id: 'overview', label: 'Visão geral', icon: '◈' },
  { id: 'posts', label: 'Publicações', icon: '✎' },
  { id: 'pages', label: 'Contas Facebook', icon: '⬡' },
  { id: 'ai', label: 'Assistente IA', icon: '✦' },
  { id: 'calendar', label: 'Calendário', icon: '▦' },
  { id: 'stats', label: 'Estatísticas', icon: '▣' },
  { id: 'settings', label: 'Configurações', icon: '⚙' },
];

export default function Sidebar({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  const user = getUser();

  function logout() {
    clearTokens();
    window.location.href = '/login';
  }

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">G-<span>Midia</span></div>
        <div className="brand-sub">SOCIAL MEDIA COMMAND CENTER</div>
      </div>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 8 }}>
          {user?.full_name || user?.email || 'Utilizador'}
        </div>
        <button
          onClick={logout}
          style={{ color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}
        >
          Terminar sessão
        </button>
        <div style={{ marginTop: 12 }}>v1.0.0 · FACEBOOK FIRST</div>
      </div>
    </aside>
  );
}
