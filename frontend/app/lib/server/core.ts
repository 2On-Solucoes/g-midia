import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

export class HttpError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// ---------- Base de dados (Neon Postgres) ----------
let _sql: any = null;

export function db(): any {
  if (!_sql) {
    const raw = process.env.DATABASE_URL || '';
    if (!raw) throw new HttpError(500, 'DATABASE_URL não configurada no servidor');
    // aceita também o formato do backend Python (postgresql+psycopg://)
    _sql = neon(raw.replace('postgresql+psycopg://', 'postgresql://'));
  }
  return _sql;
}

let _ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!_ready) {
    _ready = (async () => {
      const sql = db();
      await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        hashed_password TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS social_pages (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL DEFAULT 'facebook',
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        picture_url TEXT,
        followers_count INTEGER NOT NULL DEFAULT 0,
        is_connected BOOLEAN NOT NULL DEFAULT TRUE,
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        page_id INTEGER REFERENCES social_pages(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        scheduled_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        external_post_id TEXT,
        media_urls TEXT,
        error_message TEXT,
        ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    })().catch((e) => {
      _ready = null;
      throw e;
    });
  }
  return _ready;
}

// ---------- Autenticação ----------
function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return n > 0 ? n : fallback;
}

function secretKey(): Uint8Array {
  const s =
    process.env.JWT_SECRET_KEY ||
    createHash('sha256').update('gmidia:' + (process.env.DATABASE_URL || '')).digest('hex');
  return new TextEncoder().encode(s);
}

export const accessTtlSeconds = () => num(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES, 60) * 60;

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export function checkPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash).catch(() => false);
}

export async function makeToken(userId: number, type: 'access' | 'refresh'): Promise<string> {
  const exp =
    type === 'access'
      ? `${num(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES, 60)}m`
      : `${num(process.env.JWT_REFRESH_TOKEN_EXPIRE_DAYS, 7)}d`;
  return new SignJWT({ type })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secretKey());
}

export async function readToken(token: string, type: 'access' | 'refresh'): Promise<number> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (payload.type !== type || !id) throw new Error('tipo inválido');
    return id;
  } catch {
    throw new HttpError(401, 'Token inválido ou expirado');
  }
}
