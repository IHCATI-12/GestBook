from datetime import datetime, timedelta, timezone
from jose import jwt
from typing import Optional

algoritmo_token = "HS256"
acesso_token_expiracao_minutos = 60

def cria_token_acesso(dados: dict, senha_secreta: str,tempo_expiracao: Optional[timedelta] = None):
    dados_para_codificar = dados.copy()

    expiração = datetime.now(timezone.utc) + (tempo_expiracao or timedelta(minutes=acesso_token_expiracao_minutos))
    
    dados_para_codificar.update({"exp": expiração})
    
    token_jwt = jwt.encode(dados_para_codificar, senha_secreta, algorithm=algoritmo_token)

    return token_jwt

