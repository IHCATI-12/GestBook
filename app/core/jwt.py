from datetime import datetime, timedelta, timezone
import os
from jose import jwt
from typing import Optional
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

# Configurações do token JWT
senha_token = os.getenv("SENHA_TOKEN", "minha_senha_secreta")
algoritmo_token = "HS256"
acesso_token_expiracao_minutos = 60

# Função para criar um token de acesso JWT
def cria_token_acesso(dados: dict, senha_secreta: str = senha_token, tempo_expiracao: Optional[timedelta] = None):
    dados_para_codificar = dados.copy()
    # Define o tempo de expiração do token
    expiração = datetime.now(timezone.utc) + (tempo_expiracao or timedelta(minutes=acesso_token_expiracao_minutos))
    # Adiciona a expiração aos dados do token
    dados_para_codificar.update({"exp": expiração})
    # Gera o token JWT
    token_jwt = jwt.encode(dados_para_codificar, senha_secreta, algorithm=algoritmo_token)
    # Retorna o token JWT gerado
    return token_jwt

