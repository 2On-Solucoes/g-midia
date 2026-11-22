import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import {
  HttpError,
  db,
  ensureSchema,
  hashPassword,
  checkPassword,
  makeToken,
  readToken,
  accessTtlSeconds,
} from '../../../lib/server/core';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERSION = '1.1.0';

function out(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

async function readBody(req: NextRequest): Promise<any> {
  return req.json().catch(() => ({}));
}

function metaConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function aiConfigured() {
  return !!process.env.AI_API_KEY;
}

const userOut = (u: any) => ({
  id: u.id,
  email: u.email,
  full_name: u.full_name,
  is_active: u.is_active,
  created_at: u.created_at,
});

function parseMedia(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const postOut = (p: any) => ({
  id: p.id,
  content: p.content,
  status: p.status,
  page_id: p.page_id,
  scheduled_at: p.scheduled_at,
  published_at: p.published_at,
  external_post_id: p.external_post_id,
  media_urls: parseMedia(p.media_urls),
  ai_generated: p.ai_generated,
  error_message: p.error_message,
  created_at: p.created_at,
  updated_at: p.updated_at,
});

const pageOut = (p: any) => ({
  id: p.id,
  provider: p.provider,
  external_id: p.external_id,
  name: p.name,
  category: p.category,
  picture_url: p.picture_url,
  followers_count: p.followers_count,
  is_connected: p.is_connected,
  last_synced_at: p.last_synced_at,
});

async function currentUser(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  if (h.toLowerCase().indexOf('bearer ') !== 0) throw new HttpError(401, 'Não autenticado');
  const id = await readToken(h.slice(7).trim(), 'access');
  const rows = await db()`SELECT * FROM users WHERE id = ${id}`;
  if (!rows.length || !rows[0].is_active) {
    throw new HttpError(401, 'Utilizador inativo ou inexistente');
  }
  return rows[0];
}

async function tokenResponse(userId: number) {
  return {
    access_token: await makeToken(userId, 'access'),
    refresh_token: await makeToken(userId, 'refresh'),
    token_type: 'bearer',
    expires_in: accessTtlSeconds(),
  };
}

// ---------- Gerador de IA local (fallback sem chave) ----------
function localGenerate(prompt: string, maxLength: number): string {
  const p = prompt.trim();
  const cap = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  const templates = [
    `🚀 ${cap}!\n\nEstamos a trabalhar todos os dias para oferecer o melhor. Junta-te a nós e faz parte desta jornada.\n\n#GMidia #RedesSociais #Crescimento`,
    `✨ Novidade: ${p}\n\nQueremos partilhar contigo esta ideia. O que achas? Deixa o teu comentário!\n\n#MarketingDigital #Conteudo`,
    `💡 Dica do dia: ${p}\n\nPequenas ações consistentes geram grandes resultados. Continua a criar!\n\n#Produtividade #Criatividade`,
  ];
  const hex = createHash('md5').update(prompt).digest('hex');
  let content = templates[parseInt(hex.slice(-8), 16) % templates.length];
  if (content.length > maxLength) content = content.slice(0, maxLength - 3) + '...';
  return content;
}

const TONES: Record<string, string> = {
  profissional: 'de forma clara, confiante e profissional',
  casual: 'de forma descontraída e amigável',
  inspirador: 'de forma motivadora e inspiradora',
  humor: 'com um toque de humor leve',
  urgente: 'com senso de urgência e call-to-action forte',
};

// ---------- Router ----------
async function handle(req: NextRequest, ctx: { params: { path?: string[] } }) {
  try {
    const seg = ctx.params.path || [];
    const id = Number(seg[1]);
    const shape = seg.map((s, i) => (i === 1 && /^\d+$/.test(s) ? ':id' : s)).join('/');
    const route = `${req.method} /${shape}`;

    if (route === 'GET /' || route === 'GET /health') {
      return out({
        status: 'ok',
        service: 'g-midia-api',
        version: VERSION,
        meta_configured: metaConfigured(),
        ai_configured: aiConfigured(),
      });
    }

    await ensureSchema();
    const sql = db();

    switch (route) {
      // ===== AUTH =====
      case 'POST /auth/register': {
        const b = await readBody(req);
        const email = String(b.email || '').trim().toLowerCase();
        const name = String(b.full_name || '').trim();
        const pw = String(b.password || '');
        if (!EMAIL.test(email)) throw new HttpError(422, 'Email inválido');
        if (name.length < 2 || name.length > 200) throw new HttpError(422, 'Nome inválido');
        if (pw.length < 8 || pw.length > 128) {
          throw new HttpError(422, 'A palavra-passe deve ter entre 8 e 128 caracteres');
        }
        const exists = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (exists.length) throw new HttpError(400, 'Este email já está registado');
        const hash = await hashPassword(pw);
        const rows = await sql`INSERT INTO users (email, full_name, hashed_password)
          VALUES (${email}, ${name}, ${hash}) RETURNING *`;
        return out(userOut(rows[0]), 201);
      }

      case 'POST /auth/login': {
        const b = await readBody(req);
        const email = String(b.email || '').trim().toLowerCase();
        const pw = String(b.password || '');
        const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
        const u = rows[0];
        if (!u || !(await checkPassword(pw, u.hashed_password))) {
          throw new HttpError(401, 'Email ou palavra-passe incorretos');
        }
        if (!u.is_active) throw new HttpError(403, 'Conta desativada');
        return out(await tokenResponse(u.id));
      }

      case 'POST /auth/refresh': {
        const b = await readBody(req);
        const uid = await readToken(String(b.refresh_token || ''), 'refresh');
        const rows = await sql`SELECT * FROM users WHERE id = ${uid}`;
        if (!rows.length || !rows[0].is_active) throw new HttpError(401, 'Utilizador inválido');
        return out(await tokenResponse(uid));
      }

      case 'GET /auth/me': {
        return out(userOut(await currentUser(req)));
      }

      // ===== DASHBOARD =====
      case 'GET /dashboard/summary': {
        const user = await currentUser(req);
        const [pages, counts, recent] = await Promise.all([
          sql`SELECT followers_count FROM social_pages WHERE owner_id = ${user.id}`,
          sql`SELECT status, COUNT(*)::int AS n FROM posts WHERE author_id = ${user.id} GROUP BY status`,
          sql`SELECT id, content, status, created_at FROM posts
              WHERE author_id = ${user.id} ORDER BY created_at DESC LIMIT 5`,
        ]);
        const count = (s: string) => {
          const row = counts.find((c: any) => c.status === s);
          return row ? row.n : 0;
        };
        const performance = [
          { day: 'Seg', reach: 1200, engagement: 84 },
          { day: 'Ter', reach: 1450, engagement: 102 },
          { day: 'Qua', reach: 980, engagement: 67 },
          { day: 'Qui', reach: 1680, engagement: 121 },
          { day: 'Sex', reach: 2100, engagement: 156 },
          { day: 'Sáb', reach: 1890, engagement: 134 },
          { day: 'Dom', reach: 1320, engagement: 91 },
        ];
        const totalReach = performance.reduce((a, x) => a + x.reach, 0);
        const totalEng = performance.reduce((a, x) => a + x.engagement, 0);
        const hasPages = pages.length > 0;
        let message = 'Bem-vindo ao G-Midia!';
        if (!hasPages) message = 'Ligue a sua conta Facebook/Meta para carregar métricas reais.';
        else if (!metaConfigured()) message = 'Credenciais Meta ainda não configuradas no servidor.';
        return out({
          demo: !hasPages,
          followers: pages.reduce((a: number, p: any) => a + (p.followers_count || 0), 0),
          reach: hasPages ? totalReach : 0,
          engagement_rate: hasPages ? Math.round((totalEng / totalReach) * 10000) / 100 : 0,
          scheduled_posts: count('scheduled'),
          published_posts: count('published'),
          draft_posts: count('draft'),
          connected_pages: pages.length,
          message,
          recent_posts: recent.map((p: any) => ({
            id: p.id,
            content: p.content.length > 120 ? p.content.slice(0, 120) + '...' : p.content,
            status: p.status,
            created_at: new Date(p.created_at).toISOString(),
          })),
          performance: hasPages ? performance : [],
        });
      }

      // ===== POSTS =====
      case 'GET /posts': {
        const user = await currentUser(req);
        const params = new URL(req.url).searchParams;
        const status = params.get('status');
        const limit = Math.min(Math.max(Number(params.get('limit')) || 50, 1), 200);
        const rows = status
          ? await sql`SELECT * FROM posts WHERE author_id = ${user.id} AND status = ${status}
              ORDER BY created_at DESC LIMIT ${limit}`
          : await sql`SELECT * FROM posts WHERE author_id = ${user.id}
              ORDER BY created_at DESC LIMIT ${limit}`;
        return out(rows.map(postOut));
      }

      case 'POST /posts': {
        const user = await currentUser(req);
        const b = await readBody(req);
        const content = String(b.content || '').trim();
        if (content.length < 1 || content.length > 5000) {
          throw new HttpError(422, 'O conteúdo deve ter entre 1 e 5000 caracteres');
        }
        const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
        if (when && isNaN(when.getTime())) throw new HttpError(422, 'Data de agendamento inválida');
        const status = when && when.getTime() > Date.now() ? 'scheduled' : 'draft';
        const media = Array.isArray(b.media_urls) && b.media_urls.length ? JSON.stringify(b.media_urls) : null;
        const pageId = b.page_id ? Number(b.page_id) : null;
        const rows = await sql`INSERT INTO posts
          (author_id, page_id, content, status, scheduled_at, media_urls, ai_generated)
          VALUES (${user.id}, ${pageId}, ${content}, ${status},
                  ${when ? when.toISOString() : null}, ${media}, ${!!b.ai_generated})
          RETURNING *`;
        return out(postOut(rows[0]), 201);
      }

      case 'GET /posts/:id': {
        const user = await currentUser(req);
        const rows = await sql`SELECT * FROM posts WHERE id = ${id} AND author_id = ${user.id}`;
        if (!rows.length) throw new HttpError(404, 'Publicação não encontrada');
        return out(postOut(rows[0]));
      }

      case 'PATCH /posts/:id': {
        const user = await currentUser(req);
        const rows = await sql`SELECT * FROM posts WHERE id = ${id} AND author_id = ${user.id}`;
        if (!rows.length) throw new HttpError(404, 'Publicação não encontrada');
        const p = rows[0];
        if (p.status === 'published') {
          throw new HttpError(400, 'Não é possível editar uma publicação já publicada');
        }
        const b = await readBody(req);
        let content = p.content;
        let pageId = p.page_id;
        let scheduled = p.scheduled_at;
        let status = p.status;
        let media = p.media_urls;
        if (b.content !== undefined && b.content !== null) {
          content = String(b.content).trim();
          if (content.length < 1 || content.length > 5000) {
            throw new HttpError(422, 'O conteúdo deve ter entre 1 e 5000 caracteres');
          }
        }
        if (b.page_id !== undefined && b.page_id !== null) pageId = Number(b.page_id);
        if (b.scheduled_at) {
          const d = new Date(b.scheduled_at);
          if (isNaN(d.getTime())) throw new HttpError(422, 'Data de agendamento inválida');
          scheduled = d.toISOString();
          if (d.getTime() > Date.now()) status = 'scheduled';
        }
        if (b.status) status = String(b.status);
        if (Array.isArray(b.media_urls)) media = b.media_urls.length ? JSON.stringify(b.media_urls) : null;
        const upd = await sql`UPDATE posts SET content = ${content}, page_id = ${pageId},
          scheduled_at = ${scheduled}, status = ${status}, media_urls = ${media}, updated_at = NOW()
          WHERE id = ${id} RETURNING *`;
        return out(postOut(upd[0]));
      }

      case 'POST /posts/:id/publish': {
        const user = await currentUser(req);
        const rows = await sql`SELECT * FROM posts WHERE id = ${id} AND author_id = ${user.id}`;
        if (!rows.length) throw new HttpError(404, 'Publicação não encontrada');
        if (rows[0].status === 'published') throw new HttpError(400, 'Já publicada');
        // Publicação simulada; a chamada real à Graph API da Meta ainda não existe.
        const ext = `sim_${id}_${Math.floor(Date.now() / 1000)}`;
        const upd = await sql`UPDATE posts SET status = 'published', published_at = NOW(),
          external_post_id = ${ext}, error_message = NULL, updated_at = NOW()
          WHERE id = ${id} RETURNING *`;
        return out(postOut(upd[0]));
      }

      case 'DELETE /posts/:id': {
        const user = await currentUser(req);
        const rows = await sql`DELETE FROM posts WHERE id = ${id} AND author_id = ${user.id} RETURNING id`;
        if (!rows.length) throw new HttpError(404, 'Publicação não encontrada');
        return new NextResponse(null, { status: 204 });
      }

      // ===== PÁGINAS =====
      case 'GET /pages': {
        const user = await currentUser(req);
        const rows = await sql`SELECT * FROM social_pages WHERE owner_id = ${user.id} ORDER BY id`;
        return out(rows.map(pageOut));
      }

      case 'POST /pages/connect-demo': {
        const user = await currentUser(req);
        const b = await readBody(req);
        const name = String(b.name || '').trim();
        if (!name) throw new HttpError(422, 'Nome da página em falta');
        const category = b.category ? String(b.category) : 'Business';
        const followers = Math.max(0, Math.floor(Number(b.followers_count) || 0));
        const ext = `demo_${user.id}_${Math.floor(Date.now() / 1000)}`;
        const rows = await sql`INSERT INTO social_pages
          (owner_id, provider, external_id, name, category, followers_count, is_connected, last_synced_at)
          VALUES (${user.id}, 'facebook', ${ext}, ${name}, ${category}, ${followers}, TRUE, NOW())
          RETURNING *`;
        return out(pageOut(rows[0]));
      }

      case 'DELETE /pages/:id': {
        const user = await currentUser(req);
        const rows = await sql`DELETE FROM social_pages WHERE id = ${id} AND owner_id = ${user.id} RETURNING id`;
        if (!rows.length) throw new HttpError(404, 'Página não encontrada');
        return new NextResponse(null, { status: 204 });
      }

      case 'GET /pages/meta/status': {
        await currentUser(req);
        const configured = metaConfigured();
        return out({
          configured,
          app_id_set: !!process.env.META_APP_ID,
          redirect_uri: process.env.META_REDIRECT_URI || '',
          scopes: (process.env.META_SCOPES || 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,read_insights').split(','),
          message: configured
            ? 'Credenciais Meta configuradas. Pronto para OAuth.'
            : 'Configure META_APP_ID e META_APP_SECRET nas variáveis de ambiente para ativar a integração real.',
        });
      }

      // ===== IA =====
      case 'POST /ai/generate': {
        await currentUser(req);
        const b = await readBody(req);
        const prompt = String(b.prompt || '').trim();
        const tone = String(b.tone || 'profissional').toLowerCase();
        const language = String(b.language || 'pt');
        const maxLength = Number(b.max_length) > 0 ? Number(b.max_length) : 300;
        if (prompt.length < 3) throw new HttpError(400, 'Prompt demasiado curto');

        if (aiConfigured()) {
          try {
            const base = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
            const model = process.env.AI_MODEL || 'gpt-4o-mini';
            const r = await fetch(`${base}/chat/completions`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.AI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [
                  {
                    role: 'system',
                    content: `És um especialista em social media. Escreve publicações ${TONES[tone] || TONES.profissional} em ${language}. Máximo ${maxLength} caracteres. Sem aspas desnecessárias.`,
                  },
                  { role: 'user', content: prompt },
                ],
                max_tokens: Math.min(Math.floor(maxLength / 2), 400),
                temperature: 0.8,
              }),
              signal: AbortSignal.timeout(20000),
            });
            if (r.ok) {
              const j = await r.json();
              const text = String(j?.choices?.[0]?.message?.content || '').trim();
              if (text) {
                return out({
                  content: text,
                  provider: process.env.AI_PROVIDER || 'openai',
                  model,
                  demo: false,
                });
              }
            }
          } catch {
            // cai para o gerador local
          }
        }
        return out({
          content: localGenerate(prompt, maxLength),
          provider: 'g-midia-local',
          model: 'template-v1',
          demo: true,
        });
      }
    }

    throw new HttpError(404, 'Rota não encontrada');
  } catch (e) {
    if (e instanceof HttpError) return out({ detail: e.detail }, e.status);
    console.error(e);
    return out({ detail: 'Erro interno do servidor' }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
