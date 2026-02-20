SHELL := /bin/sh

.PHONY: dev down reset test

dev:
	docker compose up --build

down:
	docker compose down

reset:
	docker compose down -v
	docker compose up --build backend -d
	docker compose exec backend python -m app.scripts.seed --reset

test:
	docker compose run --rm backend pytest
	docker compose run --rm frontend pnpm test:e2e
