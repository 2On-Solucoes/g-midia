from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.dashboard import AIGenerateRequest, AIGenerateResponse

router = APIRouter(prefix="/ai", tags=["Assistente IA"])


# Local fallback content generator (works without external API key)
TONE_MAP = {
    "profissional": "de forma clara, confiante e profissional",
    "casual": "de forma descontraída e amigável",
    "inspirador": "de forma motivadora e inspiradora",
    "humor": "com um toque de humor leve",
    "urgente": "com senso de urgência e call-to-action forte",
}


def _local_generate(prompt: str, tone: str, language: str, max_length: int) -> str:
    tone_desc = TONE_MAP.get(tone.lower(), TONE_MAP["profissional"])
    templates = [
        f"🚀 {prompt.strip().capitalize()}!\n\nEstamos a trabalhar todos os dias para oferecer o melhor. Junta-te a nós e faz parte desta jornada.\n\n#GMidia #RedesSociais #Crescimento",
        f"✨ Novidade: {prompt.strip()}\n\nQueremos partilhar contigo esta ideia. O que achas? Deixa o teu comentário!\n\n#MarketingDigital #Conteudo",
        f"💡 Dica do dia: {prompt.strip()}\n\nPequenas ações consistentes geram grandes resultados. Continua a criar!\n\n#Produtividade #Criatividade",
    ]
    import hashlib
    idx = int(hashlib.md5(prompt.encode()).hexdigest(), 16) % len(templates)
    content = templates[idx]
    if len(content) > max_length:
        content = content[: max_length - 3] + "..."
    return content


@router.post("/generate", response_model=AIGenerateResponse)
async def generate_content(
    data: AIGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    if not data.prompt or len(data.prompt.strip()) < 3:
        raise HTTPException(status_code=400, detail="Prompt demasiado curto")

    # If real AI key is configured, try to call the provider
    if settings.ai_configured:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {settings.ai_api_key}",
                "Content-Type": "application/json",
            }
            system_msg = (
                f"És um especialista em social media. Escreve publicações {TONE_MAP.get(data.tone, 'profissional')} "
                f"em {data.language}. Máximo {data.max_length} caracteres. Sem aspas desnecessárias."
            )
            payload = {
                "model": settings.ai_model,
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": data.prompt},
                ],
                "max_tokens": min(data.max_length // 2, 400),
                "temperature": 0.8,
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.ai_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if resp.status_code == 200:
                    result = resp.json()
                    content = result["choices"][0]["message"]["content"].strip()
                    return AIGenerateResponse(
                        content=content,
                        provider=settings.ai_provider,
                        model=settings.ai_model,
                        demo=False,
                    )
        except Exception:
            pass  # fall through to local generator

    # Fallback local generator
    content = _local_generate(data.prompt, data.tone, data.language, data.max_length)
    return AIGenerateResponse(
        content=content,
        provider="g-midia-local",
        model="template-v1",
        demo=True,
    )
