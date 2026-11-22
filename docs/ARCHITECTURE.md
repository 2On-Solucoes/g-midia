# Arquitetura G-Midia

## Visão geral

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js    │────▶│  FastAPI     │────▶│  PostgreSQL │
│  Frontend   │     │  Backend     │     │  + Redis    │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ Meta Graph   │
                    │ OpenAI / IA  │
                    └──────────────┘
```

## Princípios

1. **Backend é o dono dos segredos** — tokens Meta, chaves IA e passwords nunca chegam ao frontend.
2. **JWT** para sessão (access + refresh).
3. **Modelos claros**: User → Pages → Posts → Media → Integrations.
4. **Modo demo** funcional sem credenciais externas.
5. **Fallback inteligente**: SQLite se Postgres não estiver disponível; gerador local de IA se não houver API key.

## Módulos da API

| Prefixo | Responsabilidade |
|---------|------------------|
| `/api/v1/auth` | Registo, login, refresh, me |
| `/api/v1/dashboard` | Resumo e métricas |
| `/api/v1/posts` | CRUD + publish |
| `/api/v1/pages` | Páginas ligadas + demo + status Meta |
| `/api/v1/ai` | Geração de conteúdo |

## Modelos de dados

- **User** — conta local
- **SocialPage** — página Facebook/Instagram ligada
- **Post** — rascunho / agendado / publicado
- **MediaAsset** — ficheiros de mídia
- **Integration** — tokens OAuth cifrados por fornecedor

## Fluxo de publicação

```
Rascunho → (opcional) Agendamento → Aprovação implícita →
Verificação de token/página → Chamada Meta (ou simulação) →
Guardar external_id + auditoria
```

## Segurança

- Bcrypt para passwords
- JWT com expiração curta + refresh
- CORS configurável
- Encriptação de tokens Meta (estrutura pronta)
- Nunca expor `META_APP_SECRET` ou `AI_API_KEY` ao cliente

## Android / PWA

1. Frontend já é responsivo
2. Próximo passo: PWA instalável
3. Depois: Capacitor para empacotar Android
4. Tokens permanecem no backend; deep links OAuth seguros
