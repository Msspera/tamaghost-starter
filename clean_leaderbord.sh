#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Lista de chaves baseada em services/leaderboard-worker/src/index.ts
# Inclui o ranking total e os rankings por ação
KEYS="lb:total lb:feed lb:pet lb:bath lb:buy_outfit lb:change_look"

echo -e "${GREEN}🧹 Iniciando limpeza do Ranking Tamaghost...${NC}"
docker compose up -d

# Verifica se o container do Redis está rodando (nome 'redis' conforme docker-compose.yml)
if [ "$(docker ps -q -f name=redis)" ]; then
    
    # Executa o comando DEL dentro do container
    COUNT=$(docker exec redis redis-cli DEL $KEYS)
    
    echo -e "✅ Sucesso! Chaves removidas: ${GREEN}$COUNT${NC}"
    echo "As seguintes tabelas foram zeradas:"
    for key in $KEYS; do
        echo " - $key"
    done
    # Restart Docker Compose services
    docker compose down
    docker compose up -d

else
    echo -e "${RED}❌ Erro: O container 'redis' não foi encontrado ou não está rodando.${NC}"
    echo "Certifique-se de estar rodando 'docker compose up' na raiz do projeto."
    exit 1
fi