"""Google and Facebook stand-in for development and CI.

Contract: specs/003-client-login/contracts/oauth-mock.md. It accepts only the mock credentials,
checks redirect_uri and PKCE like the real providers, and shows a form where a person or a Cypress
test chooses the identity that comes back.
"""

import base64
import hashlib
import hmac
import html
import json
import os
import secrets
import time
from dataclasses import dataclass, field
from pathlib import Path
from string import Template
from typing import Annotated, Literal
from urllib.parse import urlencode

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from fastapi import FastAPI, Form, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

Provider = Literal["google", "facebook"]

CLIENTS: dict[Provider, tuple[str, str]] = {
    "google": ("mock-google-client", "mock-google-secret"),
    "facebook": ("mock-facebook-app", "mock-facebook-secret"),
}
CODE_SECONDS = 60
TOKEN_SECONDS = 3600
KEY_ID = "oauth-mock"
TEMPLATE = Template((Path(__file__).parent / "templates" / "authorize.html").read_text("utf-8"))


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def derive_subject(provider: Provider, email: str) -> str:
    """The same email gives the same identity in every attempt, like a real account."""
    return hashlib.sha256(f"{provider}:{email.strip().lower()}".encode()).hexdigest()[:24]


@dataclass
class Grant:
    provider: Provider
    client_id: str
    redirect_uri: str
    code_challenge: str
    nonce: str | None
    subject: str
    email: str | None
    name: str
    email_verified: bool
    expires_at: float


@dataclass
class State:
    key: rsa.RSAPrivateKey = field(
        default_factory=lambda: rsa.generate_private_key(public_exponent=65537, key_size=2048)
    )
    grants: dict[str, Grant] = field(default_factory=dict)
    facebook_tokens: dict[str, Grant] = field(default_factory=dict)
    fail_next: bool = False


def sign_id_token(state: State, claims: dict[str, object]) -> str:
    header = {"alg": "RS256", "typ": "JWT", "kid": KEY_ID}
    signing_input = f"{b64url(json.dumps(header).encode())}.{b64url(json.dumps(claims).encode())}"
    signature = state.key.sign(signing_input.encode(), padding.PKCS1v15(), hashes.SHA256())
    return f"{signing_input}.{b64url(signature)}"


def public_jwk(state: State) -> dict[str, str]:
    numbers = state.key.public_key().public_numbers()
    return {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": KEY_ID,
        "n": b64url(numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, "big")),
        "e": b64url(numbers.e.to_bytes((numbers.e.bit_length() + 7) // 8, "big")),
    }


def pkce_matches(challenge: str, verifier: str) -> bool:
    return hmac.compare_digest(b64url(hashlib.sha256(verifier.encode()).digest()), challenge)


def redirect_to(redirect_uri: str, **params: str) -> RedirectResponse:
    separator = "&" if "?" in redirect_uri else "?"
    return RedirectResponse(f"{redirect_uri}{separator}{urlencode(params)}", status_code=302)


def create_app(issuer: str | None = None) -> FastAPI:
    app = FastAPI(title="oauth-mock", docs_url=None, redoc_url=None, openapi_url=None)
    state = State()
    google_issuer = issuer or os.environ.get("MOCK_GOOGLE_ISSUER", "http://oauth-mock:8090/google")

    def check_client(provider: Provider, client_id: str, client_secret: str | None = None) -> None:
        expected_id, expected_secret = CLIENTS[provider]
        wrong_secret = client_secret is not None and client_secret != expected_secret
        if client_id != expected_id or wrong_secret:
            raise HTTPException(401, "invalid_client")

    def show_form(provider: Provider, params: dict[str, str]) -> HTMLResponse:
        check_client(provider, params.get("client_id", ""))
        if not params.get("redirect_uri") or not params.get("state"):
            raise HTTPException(400, "invalid_request")
        if params.get("code_challenge_method") != "S256" or not params.get("code_challenge"):
            raise HTTPException(400, "PKCE with S256 is required")
        hidden = "\n".join(
            f'<input type="hidden" name="{html.escape(name)}" value="{html.escape(value)}">'
            for name, value in params.items()
        )
        page = TEMPLATE.substitute(provider=provider.capitalize(), hidden=hidden)
        return HTMLResponse(page)

    def finish_form(provider: Provider, form: dict[str, str]) -> RedirectResponse:
        check_client(provider, form.get("client_id", ""))
        redirect_uri, oauth_state = form.get("redirect_uri", ""), form.get("state", "")
        if form.get("action") != "confirm":
            return redirect_to(redirect_uri, error="access_denied", state=oauth_state)
        email = form.get("email", "").strip()
        code = secrets.token_urlsafe(24)
        state.grants[code] = Grant(
            provider=provider,
            client_id=form["client_id"],
            redirect_uri=redirect_uri,
            code_challenge=form.get("code_challenge", ""),
            nonce=form.get("nonce") or None,
            subject=form.get("subject", "").strip() or derive_subject(provider, email),
            email=None if form.get("no_email") else email,
            name=form.get("name", "").strip() or "Mock Person",
            email_verified=bool(form.get("email_verified")),
            expires_at=time.time() + CODE_SECONDS,
        )
        return redirect_to(redirect_uri, code=code, state=oauth_state)

    def take_grant(provider: Provider, code: str, redirect_uri: str, verifier: str) -> Grant:
        if state.fail_next:
            state.fail_next = False
            raise HTTPException(500, "simulated failure")
        grant = state.grants.pop(code, None)
        if (
            not grant
            or grant.provider != provider
            or grant.expires_at < time.time()
            or grant.redirect_uri != redirect_uri
            or not pkce_matches(grant.code_challenge, verifier)
        ):
            raise HTTPException(400, "invalid_grant")
        return grant

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/google/authorize", response_class=HTMLResponse)
    def google_authorize(request: Request) -> HTMLResponse:
        return show_form("google", dict(request.query_params))

    @app.post("/google/authorize")
    async def google_confirm(request: Request) -> RedirectResponse:
        form = await request.form()
        return finish_form("google", {key: str(value) for key, value in form.items()})

    @app.post("/google/token")
    def google_token(
        code: Annotated[str, Form()],
        redirect_uri: Annotated[str, Form()],
        client_id: Annotated[str, Form()],
        client_secret: Annotated[str, Form()],
        code_verifier: Annotated[str, Form()],
        grant_type: Annotated[str, Form()] = "authorization_code",
    ) -> dict[str, object]:
        check_client("google", client_id, client_secret)
        if grant_type != "authorization_code":
            raise HTTPException(400, "unsupported_grant_type")
        grant = take_grant("google", code, redirect_uri, code_verifier)
        now = int(time.time())
        claims: dict[str, object] = {
            "iss": google_issuer,
            "aud": client_id,
            "sub": grant.subject,
            "name": grant.name,
            "iat": now,
            "exp": now + TOKEN_SECONDS,
            "email_verified": grant.email_verified,
        }
        if grant.email is not None:
            claims["email"] = grant.email
        if grant.nonce:
            claims["nonce"] = grant.nonce
        return {
            "access_token": secrets.token_urlsafe(24),
            "id_token": sign_id_token(state, claims),
            "token_type": "Bearer",
            "expires_in": TOKEN_SECONDS,
        }

    @app.get("/google/jwks")
    def google_jwks() -> dict[str, list[dict[str, str]]]:
        return {"keys": [public_jwk(state)]}

    @app.get("/facebook/dialog/oauth", response_class=HTMLResponse)
    def facebook_dialog(request: Request) -> HTMLResponse:
        return show_form("facebook", dict(request.query_params))

    @app.post("/facebook/dialog/oauth")
    async def facebook_confirm(request: Request) -> RedirectResponse:
        form = await request.form()
        return finish_form("facebook", {key: str(value) for key, value in form.items()})

    # The Graph API paths carry a version, as in https://graph.facebook.com/v23.0/me.
    @app.get("/facebook/{version}/oauth/access_token")
    def facebook_access_token(
        version: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code: str,
        code_verifier: str,
    ) -> dict[str, object]:
        check_client("facebook", client_id, client_secret)
        grant = take_grant("facebook", code, redirect_uri, code_verifier)
        token = secrets.token_urlsafe(24)
        state.facebook_tokens[token] = grant
        return {"access_token": token, "token_type": "bearer", "expires_in": TOKEN_SECONDS}

    @app.get("/facebook/{version}/me")
    def facebook_me(
        version: str,
        access_token: str,
        appsecret_proof: str,
        fields: Annotated[str, Query()] = "id,name",
    ) -> dict[str, str]:
        grant = state.facebook_tokens.get(access_token)
        if not grant:
            raise HTTPException(401, "invalid access token")
        secret = CLIENTS["facebook"][1].encode()
        expected = hmac.new(secret, access_token.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, appsecret_proof):
            raise HTTPException(400, "invalid appsecret_proof")
        profile = {"id": grant.subject, "name": grant.name}
        if "email" in fields.split(",") and grant.email is not None:
            profile["email"] = grant.email
        return profile

    @app.post("/control/fail-next")
    def fail_next() -> JSONResponse:
        state.fail_next = True
        return JSONResponse({"failNext": True})

    return app


app = create_app()
