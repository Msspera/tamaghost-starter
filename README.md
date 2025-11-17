
# Tamaghost — plataforma social de bichinho virtual (distribuída, bonita e pronta para OCI)

Este repositório contém um **starter completamente funcional** para você lançar o *Tamaghost* com:
- Front-end Next.js 14 + Tailwind (UI linda e responsiva).
- Microsserviços Node.js/TypeScript para interações, comentários/avaliações, chat em tempo real, estado do pet e ranking.
- **Event-driven** com Kafka (local usa Redpanda) + **Redis** (para ranking e pub/sub do chat).
- Docker Compose para rodar **local**.
- Manifests Kubernetes para **OCI OKE**.
- Terraform mínimo para **OCI Streaming**, **Object Storage** (assets) e variáveis-base.
- Integração com **OCI** (Streaming Kafka API, Object Storage e opcionalmente Autonomous JSON Database via SODA REST).

> ⚠️ Este é um *starter* opinado que já funciona localmente. Em produção, você irá preencher variáveis de ambiente e apontar para serviços gerenciados da Oracle (Streaming, Cache/Redis, Object Storage, OKE etc.).

## Demonstração local (rápida)

### Pré‑requisitos
- Docker e Docker Compose v2
- Node.js 18+ (apenas se quiser `npm run dev` localmente fora do Docker)

### Passos
1. Copie o arquivo de exemplo de variáveis:
   ```bash
   cp .env.example .env
   ```
2. Suba toda a stack:
   ```bash
   docker compose up --build
   ```
3. Acesse o app: http://localhost:3000/p/ghostzinho

> O ambiente local usa **Redpanda** (Kafka compatível) e **Redis** como serviços de infraestrutura. O banco de dados é SQLite (modo DEV). Em produção você trocará para **OCI Streaming** e **Autonomous JSON Database** (SODA REST).

## Visão geral de arquitetura (conceitos de computação distribuída)

- **Front-end** (Next.js) se comunica com os BFFs/microsserviços.
- **Interações** publicam eventos (Kafka/Streaming) — *feed, carinho, banho, compra de roupa, mudança de visual*.
- **Aggregators** consomem eventos e atualizam o **estado do pet** (event sourcing + *CQRS*). Estado persistido (DEV: SQLite; PROD: Autonomous JSON Database via SODA REST).
- **Leaderboard Worker** consome eventos e atualiza **Redis Sorted Sets** (ranking por ação e ranking total).
- **Chat** usa **WebSocket (Socket.IO)** com *adapter* Redis para escalar horizontalmente.
- **Comentários/Avaliações** gravados no DB (DEV: SQLite; PROD: AJD/SODA).
- **Assets** (camadas do visual) servidos do **OCI Object Storage** (via **Pre‑Authenticated Request** ou bucket público).

Padrões aplicados: **event‑driven**, **idempotência**, **CQRS**, **sagas** simples para compras, **escala horizontal** via containers/orquestração (Kubernetes/OKE), **cache quente** (Redis), **observabilidade** (métricas/logs) e **segurança** (WAF, rate limit, CORS, chaves rotativas).

## Serviços

- `apps/web`: Next.js + Tailwind. UI do tamaghost.
- `services/interactions`: API (Fastify) para ações (feed, carinho, banho, roupas, visual). Produz eventos Kafka.
- `services/pet-state`: *Consumer* Kafka que mantém estado do pet e expõe leitura REST.
- `services/comments`: Comentários e avaliações.
- `services/chat`: Socket.IO + Redis adapter.
- `services/leaderboard-worker`: *Consumer* Kafka que mantém ranking no Redis.
- `services/leaderboard-api`: API REST para ler rankings do Redis.

## Rodando com Docker Compose

```bash
docker compose up --build
```

Endereços padrão (local):
- Web: http://localhost:3000
- Interactions API: http://localhost:4001
- Pet State API: http://localhost:4002
- Comments API: http://localhost:4003
- Chat WS: ws://localhost:7001
- Leaderboard API: http://localhost:4005
- Redpanda Console: http://localhost:8081 (tópico `interactions`)
- Redis: localhost:6379

## Deploy em produção na Oracle Cloud (resumo)

1) **Imagens** → publique no **Oracle Container Registry (OCIR)**.  
2) **Compute** → use **OKE (Kubernetes)** *ou* **Container Instances**.  
3) **Eventos** → troque Redpanda por **OCI Streaming (Kafka API)**.  
4) **Estado/Comentários** → troque SQLite por **Autonomous JSON Database (SODA REST)**.  
5) **Ranking e Chat** → use **OCI Cache (Redis)** gerenciado.  
6) **Assets** → hospede camadas/skins no **OCI Object Storage** (PAR/público).  
7) **Entrada** → **OCI Flexible Load Balancer** para HTTP/WS. Opcional: **API Gateway** (HTTP) para REST.  
8) **Segurança** → **OCI WAF** + rate limiting no API Gateway.  
9) **Observabilidade** → **OCI Logging & Monitoring** (métricas, logs, alarmes).

> Detalhes completos de implantação e comandos estão ao final deste README.

---

## Variáveis (.env)

Veja `.env.example` para todas as variáveis. Principais:

```
# Web
NEXT_PUBLIC_API_INTERACTIONS_URL=http://localhost:4001
NEXT_PUBLIC_API_PET_URL=http://localhost:4002
NEXT_PUBLIC_API_COMMENTS_URL=http://localhost:4003
NEXT_PUBLIC_API_LEADERBOARD_URL=http://localhost:4005
NEXT_PUBLIC_WS_URL=ws://localhost:7001
NEXT_PUBLIC_ASSET_BASE_URL=/assets

# Kafka (DEV usa Redpanda; PROD configure OCI Streaming)
KAFKA_BROKERS=redpanda:9092
KAFKA_SASL_ENABLED=false

# Redis
REDIS_URL=redis://redis:6379

# DB (DEV sqlite; PROD ajd)
DB_MODE=sqlite
SQLITE_FILE=/data/app.db
AJD_SODA_BASE_URL=
AJD_SODA_AUTH_TOKEN=

# Segurança básica
CORS_ALLOW_ORIGIN=*
```

---

## Guia de Implantação (OCI) resumido

1. **Provisionar Streaming (Kafka API)**, **OCI Cache (Redis)**, **Object Storage** e **Autonomous JSON Database**.  
2. **Criar OKE** (ou Container Instances) e um **Load Balancer** público.  
3. **Criar segredos** (tokens SODA, credenciais Kafka SASL/SSL) no Kubernetes (`kubectl create secret`).  
4. **Editar `infra/k8s/values.example.env`** e aplicar manifests:
   ```bash
   kubectl apply -f infra/k8s/namespace.yaml
   kubectl apply -f infra/k8s/redis-external-secret.yaml   # se usar Redis gerenciado, configure endpoints
   kubectl apply -f infra/k8s/
   ```
5. **Configurar WAF** no LB e **API Gateway** (HTTP) para as rotas REST; **WebSocket** aponta direto para o serviço `chat` via **Load Balancer**.

> Confira as referências no final deste arquivo para cada serviço da Oracle utilizado.

---

## Referências rápidas (OCI)

- **Streaming (Kafka compatível)**: docs *Kafka compatibility*, tutoriais e Kafka Connect.  
- **OKE** (Kubernetes gerenciado) e **Load Balancer** (HTTP/TCP).  
- **Container Instances** (serverless de contêiner).  
- **Object Storage** (buckets + Pre‑Authenticated Requests).  
- **WAF** (proteção camada 7) e **API Gateway** (políticas, rate limit, IAM).  
- **Monitoring & Logging** (métricas/alertas/logs).  
- **OCI Cache (Redis)** (ranking, chat scale-out).

---

## Créditos e licença

MIT. Use, modifique e brilhe ✨.
