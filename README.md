# Skylog

Diário de observações astronômicas — **Django + DRF** (backend) e **React + TypeScript + Vite** (frontend).

## Pré-requisitos

- Python 3.12+
- Node.js 20+
- Docker (opcional, para MySQL) ou SQLite em dev

## Banco de dados

### MySQL (recomendado)

```bash
docker compose up -d
cp backend/.env.example backend/.env
```

Confira `DB_*` em `backend/.env` (porta **3307** no host).

### SQLite (rápido, sem Docker)

Em `backend/.env`:

```env
DB_ENGINE=django.db.backends.sqlite3
```

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd src
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Testes:

```bash
cd backend
pytest
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. O Vite faz proxy de `/api` e `/media` para `http://localhost:8000`.

## Scripts na raiz

```bash
npm run install:all   # dependências da raiz + frontend (backend é pip)
npm run dev           # backend + frontend (ative o venv Python antes)
```

### Cache de integrações (opcional)

Em `backend/.env`:

```env
HORIZONS_CACHE_TTL=900
WEATHER_FORECAST_CACHE_TTL=600
WEATHER_CURRENT_CACHE_TTL=60
```

Reduz chamadas repetidas à NASA Horizons e Open-Meteo (útil no widget SSE ao vivo).


## Variáveis (frontend)

`frontend/.env.example`:

```env
VITE_API_URL=/api
```

## Funcionalidades

- Registro e login (JWT Bearer)
- CRUD de observações com foto local (`media/`)
- Dashboard e estatísticas
- Sugestões de visibilidade (NASA Horizons) e previsão (Open-Meteo)
- Stream SSE de condições atuais do céu
