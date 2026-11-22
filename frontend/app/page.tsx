'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import {
  getToken,
  dashboardApi,
  postsApi,
  pagesApi,
  aiApi,
  setUser,
  authApi,
} from './lib/api';

type Summary = {
  demo: boolean;
  followers: number;
  reach: number;
  engagement_rate: number;
  scheduled_posts: number;
  published_posts: number;
  draft_posts: number;
  connected_pages: number;
  message: string;
  recent_posts: any[];
  performance: { day: string; reach: number; engagement: number }[];
};

type Post = {
  id: number;
  content: string;
  status: string;
  created_at: string;
  scheduled_at?: string;
  published_at?: string;
  ai_generated: boolean;
};

export default function Home() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Composer
  const [content, setContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('profissional');
  const [aiLoading, setAiLoading] = useState(false);

  // Demo page
  const [demoName, setDemoName] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    authApi.me().then(setUser).catch(() => {
      window.location.href = '/login';
    });
    setReady(true);
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const data = await dashboardApi.summary();
      setSummary(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const data = await postsApi.list();
      setPosts(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const loadPages = useCallback(async () => {
    try {
      const data = await pagesApi.list();
      setPages(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadSummary();
    if (active === 'posts') loadPosts();
    if (active === 'pages') loadPages();
  }, [ready, active, loadSummary, loadPosts, loadPages]);

  async function createPost(publish = false) {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const post = await postsApi.create({ content: content.trim() });
      if (publish) {
        await postsApi.publish(post.id);
      }
      setContent('');
      setSuccess(publish ? 'Publicação publicada com sucesso!' : 'Rascunho guardado!');
      loadPosts();
      loadSummary();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function publishPost(id: number) {
    setLoading(true);
    try {
      await postsApi.publish(id);
      setSuccess('Publicado!');
      loadPosts();
      loadSummary();
      setTimeout(() => setSuccess(''), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(id: number) {
    if (!confirm('Eliminar esta publicação?')) return;
    try {
      await postsApi.remove(id);
      loadPosts();
      loadSummary();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function generateAI() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setError('');
    try {
      const res = await aiApi.generate({ prompt: aiPrompt, tone: aiTone });
      setContent(res.content);
      setActive('posts');
      setSuccess(res.demo ? 'Conteúdo gerado (modo local)' : 'Conteúdo gerado pela IA');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function connectDemoPage() {
    if (!demoName.trim()) return;
    setLoading(true);
    try {
      await pagesApi.connectDemo({
        name: demoName.trim(),
        category: 'Business',
        followers_count: Math.floor(Math.random() * 5000) + 200,
      });
      setDemoName('');
      setSuccess('Página de demonstração ligada!');
      loadPages();
      loadSummary();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function disconnectPage(id: number) {
    if (!confirm('Desligar esta página?')) return;
    try {
      await pagesApi.disconnect(id);
      loadPages();
      loadSummary();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!ready) {
    return (
      <div className="auth-page">
        <div style={{ color: 'var(--text-muted)' }}>A carregar G-Midia...</div>
      </div>
    );
  }

  const maxReach = summary?.performance?.length
    ? Math.max(...summary.performance.map((p) => p.reach), 1)
    : 1;

  return (
    <div className="shell">
      <Sidebar active={active} onNavigate={setActive} />

      <main className="main">
        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error} <button onClick={() => setError('')} style={{ float: 'right' }}>✕</button></div>}
        {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

        {/* ========== OVERVIEW ========== */}
        {active === 'overview' && (
          <>
            <div className="top-bar">
              <div>
                <h1>Visão geral</h1>
                <div className="muted">O centro de comando da tua presença digital.</div>
              </div>
              <div className="pill"><span className="dot" /> Ambiente ativo · G-Midia</div>
            </div>

            <div className="grid-4">
              {[
                ['Seguidores', summary?.followers ?? '—', ''],
                ['Alcance', summary?.reach ?? '—', ''],
                ['Engajamento', summary ? `${summary.engagement_rate}%` : '—', ''],
                ['Publicações agendadas', summary?.scheduled_posts ?? '—', ''],
              ].map(([label, value]) => (
                <div className="stat-card" key={label as string}>
                  <div className="label">{label}</div>
                  <div className="value">{value}</div>
                  <div className="hint">
                    {summary?.connected_pages
                      ? `${summary.connected_pages} página(s) ligada(s)`
                      : 'Aguardando ligação'}
                  </div>
                </div>
              ))}
            </div>

            <div className="section-grid">
              <div className="panel">
                <h2>Desempenho da página</h2>
                {summary?.performance?.length ? (
                  <>
                    <div className="chart">
                      {summary.performance.map((p, i) => (
                        <div
                          key={i}
                          className="bar"
                          style={{ height: `${(p.reach / maxReach) * 100}%` }}
                          title={`${p.day}: ${p.reach} alcance`}
                        />
                      ))}
                    </div>
                    <div className="muted" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                      {summary.performance.map((p) => (
                        <span key={p.day} style={{ fontSize: 11 }}>{p.day}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="muted">As métricas aparecerão depois de conectar uma Página.</div>
                )}
              </div>

              <div className="panel">
                <h2>Atalhos de trabalho</h2>
                <div className="action-list">
                  <button className="action-btn" onClick={() => setActive('posts')}>＋ Criar publicação</button>
                  <button className="action-btn" onClick={() => setActive('ai')}>✦ Pedir ideias à IA</button>
                  <button className="action-btn" onClick={() => setActive('pages')}>↗ Ligar conta Facebook</button>
                  <button className="action-btn" onClick={() => setActive('posts')}>▦ Ver publicações</button>
                </div>
              </div>
            </div>

            {summary?.recent_posts?.length > 0 && (
              <div className="panel" style={{ marginBottom: 20 }}>
                <h2>Publicações recentes</h2>
                <div className="posts-list">
                  {summary.recent_posts.map((p: any) => (
                    <div key={p.id} className="post-card">
                      <div>
                        <div className="content">{p.content}</div>
                        <div className="meta">
                          <span className={`badge badge-${p.status}`}>{p.status}</span>
                          <span>{new Date(p.created_at).toLocaleDateString('pt-PT')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="notice">
              <b>{summary?.message || 'Bem-vindo ao G-Midia!'}</b>
              <br />
              {summary?.demo
                ? 'Os dados apresentados são placeholders até ligares uma página Facebook. Usa a secção "Contas Facebook" para ligar uma página de demonstração e explorar o sistema.'
                : 'Sistema operacional. Podes criar, agendar e publicar conteúdo.'}
            </div>
          </>
        )}

        {/* ========== POSTS ========== */}
        {active === 'posts' && (
          <>
            <div className="top-bar">
              <div>
                <h1>Publicações</h1>
                <div className="muted">Cria, agenda e gere o teu conteúdo.</div>
              </div>
            </div>

            <div className="composer">
              <h2>Nova publicação</h2>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreve o conteúdo da publicação..."
                rows={4}
              />
              <div className="composer-actions">
                <button className="btn btn-primary btn-sm" disabled={loading || !content.trim()} onClick={() => createPost(false)}>
                  Guardar rascunho
                </button>
                <button className="btn btn-secondary btn-sm" disabled={loading || !content.trim()} onClick={() => createPost(true)}>
                  Publicar agora
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setActive('ai')}>
                  ✦ Gerar com IA
                </button>
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="empty">
                <h3>Sem publicações ainda</h3>
                <p>Cria a tua primeira publicação acima.</p>
              </div>
            ) : (
              <div className="posts-list">
                {posts.map((p) => (
                  <div key={p.id} className="post-card">
                    <div>
                      <div className="content">{p.content}</div>
                      <div className="meta">
                        <span className={`badge badge-${p.status}`}>{p.status}</span>
                        {p.ai_generated && <span className="badge badge-draft">IA</span>}
                        <span>{new Date(p.created_at).toLocaleString('pt-PT')}</span>
                      </div>
                    </div>
                    <div className="post-actions">
                      {p.status !== 'published' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => publishPost(p.id)}>
                          Publicar
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => deletePost(p.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== PAGES ========== */}
        {active === 'pages' && (
          <>
            <div className="top-bar">
              <div>
                <h1>Contas Facebook</h1>
                <div className="muted">Gere as páginas ligadas ao G-Midia.</div>
              </div>
            </div>

            <div className="composer">
              <h2>Ligar página de demonstração</h2>
              <p className="muted" style={{ marginBottom: 12 }}>
                Sem credenciais Meta reais podes ligar uma página simulada para testar o sistema completo.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  placeholder="Nome da página (ex: Minha Marca)"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" disabled={loading || !demoName.trim()} onClick={connectDemoPage}>
                  Ligar
                </button>
              </div>
            </div>

            {pages.length === 0 ? (
              <div className="empty">
                <h3>Nenhuma página ligada</h3>
                <p>Liga uma página de demonstração ou configura as credenciais Meta no backend.</p>
              </div>
            ) : (
              <div className="posts-list">
                {pages.map((p) => (
                  <div key={p.id} className="post-card">
                    <div>
                      <div className="content" style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="meta">
                        <span className="badge badge-published">{p.provider}</span>
                        <span>{p.followers_count?.toLocaleString('pt-PT')} seguidores</span>
                        <span>{p.category}</span>
                      </div>
                    </div>
                    <div className="post-actions">
                      <button className="btn btn-danger btn-sm" onClick={() => disconnectPage(p.id)}>
                        Desligar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== AI ========== */}
        {active === 'ai' && (
          <>
            <div className="top-bar">
              <div>
                <h1>Assistente IA</h1>
                <div className="muted">Gera ideias e conteúdo para as tuas publicações.</div>
              </div>
            </div>

            <div className="composer">
              <h2>Gerar conteúdo</h2>
              <div className="form-group">
                <label>Sobre o que queres escrever?</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Lançamento de novo produto de skincare natural..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Tom</label>
                <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                  <option value="profissional">Profissional</option>
                  <option value="casual">Casual</option>
                  <option value="inspirador">Inspirador</option>
                  <option value="humor">Humor</option>
                  <option value="urgente">Urgente / CTA</option>
                </select>
              </div>
              <button className="btn btn-primary" disabled={aiLoading || !aiPrompt.trim()} onClick={generateAI}>
                {aiLoading ? 'A gerar...' : '✦ Gerar publicação'}
              </button>
            </div>

            {content && (
              <div className="panel">
                <h2>Resultado</h2>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{content}</p>
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setActive('posts'); }}>
                    Usar nas publicações
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setContent('')}>
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== PLACEHOLDERS ========== */}
        {['calendar', 'stats', 'settings'].includes(active) && (
          <>
            <div className="top-bar">
              <div>
                <h1>
                  {active === 'calendar' && 'Calendário editorial'}
                  {active === 'stats' && 'Estatísticas'}
                  {active === 'settings' && 'Configurações'}
                </h1>
                <div className="muted">Funcionalidade em desenvolvimento no roadmap.</div>
              </div>
            </div>
            <div className="empty">
              <h3>Em breve</h3>
              <p>Esta secção será implementada nas próximas sprints.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
