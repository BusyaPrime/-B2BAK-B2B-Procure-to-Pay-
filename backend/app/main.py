from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.exceptions import AppError, app_error_handler
from app.middleware import RequestIDMiddleware
from app.routers import audit, auth, deals, helper, invites, messages, notifications, quotes, requests

settings = get_settings()
app = FastAPI(title="B2BAK API", version="0.1.0")

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.backend_cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_exception_handler(AppError, app_error_handler)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": "Internal Server Error",
            "status": 500,
            "detail": str(exc),
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "B2BAK API",
        "status": "ok",
        "docs": "/docs",
        "frontend": "http://localhost:3000/login",
    }


app.include_router(auth.router)
app.include_router(requests.router)
app.include_router(quotes.router)
app.include_router(deals.router)
app.include_router(messages.router)
app.include_router(audit.router)
app.include_router(notifications.router)
app.include_router(invites.router)
app.include_router(helper.router)
