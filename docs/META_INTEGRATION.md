# Integração Meta — G-Midia

## Estado atual

- Estrutura de configuração pronta (`META_APP_ID`, `META_APP_SECRET`, scopes, redirect URI)
- Endpoint `/api/v1/pages/meta/status` para verificar configuração
- Páginas de demonstração funcionais para testes sem credenciais
- Publicação simulada (marca como published + external_id)

## Para ativar OAuth real

1. Criar app em https://developers.facebook.com/
2. Adicionar produto **Facebook Login**
3. Configurar Valid OAuth Redirect URIs:
   ```
   http://localhost:8000/api/v1/integrations/meta/callback
   ```
4. Pedir permissões: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `read_insights`
5. Preencher `.env` e reiniciar o backend

## Recursos oficiais

- Graph API: https://developers.facebook.com/docs/graph-api/
- Page Feed: https://developers.facebook.com/docs/graph-api/reference/page/feed/
- Insights: https://developers.facebook.com/docs/graph-api/reference/insights/
- Marketing API: https://developers.facebook.com/docs/marketing-apis/
- Facebook Login: https://developers.facebook.com/docs/facebook-login/
