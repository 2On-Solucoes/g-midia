# G-Midia

**Gestor inteligente de redes sociais** — Facebook first, IA assistida, preparado para Android.

Versão **1.0.0** — Sistema operacional com autenticação, publicações, páginas, dashboard e assistente IA.

---

## O que está funcional

| Módulo | Estado |
|--------|--------|
| Autenticação (registo / login / JWT) | ✅ Operacional |
| Dashboard com métricas | ✅ Operacional |
| Publicações (criar, publicar, eliminar) | ✅ Operacional |
| Páginas Facebook (demo + estrutura Meta) | ✅ Operacional |
| Assistente IA (local + OpenAI) | ✅ Operacional |
| Base de dados (Postgres / SQLite fallback) | ✅ Operacional |
| Docker Compose | ✅ Pronto |
| Meta OAuth real | ⏳ Requer credenciais |
| Calendário / Stats avançadas | ⏳ Roadmap |

---

## Arranque rápido

### Com Docker (recomendado)

```bash
cp .env.example .env
# Edita .env e define APP_SECRET_KEY e JWT_SECRET_KEY com valores fortes

docker compose up --build
```

- Frontend: http://localhost:3000  
- API docs:  http://localhost:8000/docs  
- Health:    http://localhost:8000/health  

### Sem Docker (desenvolvimento)

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Usa SQLite automaticamente se Postgres não estiver disponível
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Fluxo de utilização

1. Abre http://localhost:3000 → és redirecionado para `/login`
2. Cria uma conta (registo)
3. No dashboard, vai a **Contas Facebook** e liga uma página de demonstração
4. Cria publicações em **Publicações** (ou gera com IA)
5. Publica, elimina, consulta métricas no dashboard

---

## Estrutura

```
g-midia/
├── backend/          # FastAPI
│   └── app/
│       ├── api/      # Routers (auth, posts, pages, ai, dashboard)
│       ├── core/     # Config, DB, Security
│       ├── models/   # SQLAlchemy
│       ├── schemas/  # Pydantic
│       └── services/
├── frontend/         # Next.js 14
│   └── app/
│       ├── components/
│       ├── lib/      # API client
│       └── login/
├── docs/
├── android/
├── docker-compose.yml
└── .env.example
```

---

## Configuração Meta (opcional)

1. Cria uma app em [Meta for Developers](https://developers.facebook.com/)
2. Preenche no `.env`:
   ```
   META_APP_ID=...
   META_APP_SECRET=...
   ```
3. O endpoint `/api/v1/pages/meta/status` confirma se está configurado
4. OAuth completo e publicação real na Graph API estão preparados na arquitetura

## Configuração IA (opcional)

```
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

Sem chave, o sistema usa um gerador local de templates.

---

## Segurança

- Tokens JWT com expiração
- Passwords com bcrypt
- Segredos apenas em variáveis de ambiente
- Tokens Meta nunca no frontend
- CORS restrito

---

## Licença

Projeto privado / uso interno.
