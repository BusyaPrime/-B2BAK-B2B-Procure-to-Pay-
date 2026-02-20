FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade pip

COPY pyproject.toml /app/pyproject.toml
RUN pip install -e .

COPY . /app

EXPOSE 8000
