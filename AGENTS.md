# AGENTS.md — Skylog

## Visão geral

Monorepo do **Skylog**: diário de observações astronômicas. Backend Django 5 + DRF + JWT; frontend React 19 + TypeScript + Vite + React Query.

## Stack

- Python 3.12, Django, DRF, SimpleJWT, pytest
- MySQL 8 (Docker) ou SQLite em dev
- React, TypeScript, Vite, Axios, TanStack Query

## Estrutura do projeto

```text
skylog/
  backend/src/          # manage.py, config/, apps/users, apps/observations
  backend/tests/        # pytest (auth, observations, health)
  frontend/src/         # pages, components, services, styles (CSS legado)
  docker-compose.yml    # MySQL na porta host 3307
```

## Como instalar

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env

cd ..\frontend
npm install

cd ..
npm install
```

## Como executar localmente

Backend (com venv ativo, a partir de `backend/src`):

```powershell
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Frontend:

```powershell
cd frontend
npm run dev
```

Ou na raiz: `npm run dev` (concurrently backend + frontend — exige `python` no PATH com venv ativo).

## Como rodar testes

```powershell
cd backend
pytest
```

## Como rodar lint

- Backend: `npm run lint --prefix backend` (compileall)
- Frontend: `npm run lint --prefix frontend` (ESLint)

## Como buildar

```powershell
npm run build
```

## Variáveis de ambiente

Ver `backend/.env.example` e `frontend/.env.example`. Não commitar `.env`.

## Integrações externas

- NASA JPL Horizons (visibilidade de astros)
- Open-Meteo (previsão / cobertura de nuvens)
- Cache TTL configurável em settings (`HORIZONS_*`, `WEATHER_*`)

## Padrões de arquitetura

- Apps Django por domínio (`users`, `observations`)
- Integrações em `apps/observations/integrations/`
- JWT Bearer; SSE em `/api/observations/sky-stream`
- `APPEND_SLASH = False` nas rotas API

## Segurança

- Sem secrets no repositório
- Validar entrada em views; autorização `IsAuthenticated` em rotas de dados
- Em produção (`DEBUG=False`), settings aplicam flags de cookie/HTTPS

## Restrições para agentes de IA

- Não alterar `adviceplace` nem `api-backend-django` salvo pedido explícito
- Não inventar tabelas/endpoints; seguir código existente
- Migrations pequenas e reversíveis; não expor dados sensíveis em logs
