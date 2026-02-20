docker compose down -v
docker compose up --build -d backend postgres redis
docker compose exec backend python -m app.scripts.seed --reset
