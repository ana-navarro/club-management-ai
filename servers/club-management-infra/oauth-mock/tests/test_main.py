import base64
import hashlib
import hmac
import json
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from main import create_app, derive_subject

REDIRECT = "http://localhost:8080/api/auth/google/callback"
FB_REDIRECT = "http://localhost:8080/api/auth/facebook/callback"
VERIFIER = "a-long-random-verifier-for-the-test-1234567890"
DIGEST = hashlib.sha256(VERIFIER.encode()).digest()
CHALLENGE = base64.urlsafe_b64encode(DIGEST).rstrip(b"=").decode()


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(issuer="http://oauth-mock:8090/google"), follow_redirects=False)


def authorize_params(provider: str) -> dict[str, str]:
    client_id = "mock-google-client" if provider == "google" else "mock-facebook-app"
    return {
        "client_id": client_id,
        "redirect_uri": REDIRECT if provider == "google" else FB_REDIRECT,
        "response_type": "code",
        "state": "s1",
        "code_challenge": CHALLENGE,
        "code_challenge_method": "S256",
        "nonce": "n1",
    }


def confirm(client: TestClient, provider: str, **form: str) -> dict[str, list[str]]:
    path = "/google/authorize" if provider == "google" else "/facebook/dialog/oauth"
    # A browser sends the checked box, as the form starts with "email verified" on.
    data = {
        **authorize_params(provider),
        "action": "confirm",
        "email": "ana@example.com",
        "email_verified": "true",
    }
    data.update(form)
    response = client.post(path, data=data)
    assert response.status_code == 302
    return parse_qs(urlparse(response.headers["location"]).query)


def decode_part(token: str, index: int) -> dict[str, object]:
    part = token.split(".")[index]
    result: dict[str, object] = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
    return result


def exchange_google(
    client: TestClient, code: str, **overrides: str
) -> tuple[int, dict[str, object]]:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT,
        "client_id": "mock-google-client",
        "client_secret": "mock-google-secret",
        "code_verifier": VERIFIER,
        **overrides,
    }
    response = client.post("/google/token", data=data)
    return response.status_code, response.json()


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_the_form_keeps_the_request_and_escapes_it(client: TestClient) -> None:
    params = {**authorize_params("google"), "state": '"><script>'}
    response = client.get("/google/authorize", params=params)
    assert response.status_code == 200
    assert "Mock Google" in response.text
    assert "&quot;&gt;&lt;script&gt;" in response.text
    assert "<script>" not in response.text


@pytest.mark.parametrize(
    "change",
    [
        {"client_id": "other"},
        {"code_challenge_method": "plain"},
        {"redirect_uri": ""},
    ],
)
def test_the_form_refuses_a_bad_request(client: TestClient, change: dict[str, str]) -> None:
    response = client.get("/google/authorize", params={**authorize_params("google"), **change})
    assert response.status_code in (400, 401)


def test_cancel_returns_access_denied(client: TestClient) -> None:
    data = {**authorize_params("google"), "action": "cancel"}
    response = client.post("/google/authorize", data=data)
    query = parse_qs(urlparse(response.headers["location"]).query)
    assert query == {"error": ["access_denied"], "state": ["s1"]}


def test_google_issues_a_signed_id_token_once(client: TestClient) -> None:
    code = confirm(client, "google", name="Ana")["code"][0]
    status, body = exchange_google(client, code)

    assert status == 200
    id_token = str(body["id_token"])
    claims = decode_part(id_token, 1)
    assert claims["iss"] == "http://oauth-mock:8090/google"
    assert claims["aud"] == "mock-google-client"
    assert claims["email"] == "ana@example.com"
    assert claims["email_verified"] is True
    assert claims["nonce"] == "n1"
    assert claims["sub"] == derive_subject("google", "ana@example.com")
    assert decode_part(id_token, 0)["kid"] == "oauth-mock"

    jwks = client.get("/google/jwks").json()
    assert jwks["keys"][0]["kid"] == "oauth-mock"

    assert exchange_google(client, code)[0] == 400


def test_google_can_send_an_unverified_or_missing_email(client: TestClient) -> None:
    unverified = confirm(client, "google", email_verified="")["code"][0]
    claims = decode_part(str(exchange_google(client, unverified)[1]["id_token"]), 1)
    assert claims["email_verified"] is False

    missing = confirm(client, "google", no_email="true", email_verified="true")["code"][0]
    assert "email" not in decode_part(str(exchange_google(client, missing)[1]["id_token"]), 1)


@pytest.mark.parametrize(
    "overrides",
    [
        {"code_verifier": "wrong"},
        {"redirect_uri": "http://evil.test/callback"},
    ],
)
def test_google_checks_pkce_and_redirect(client: TestClient, overrides: dict[str, str]) -> None:
    code = confirm(client, "google")["code"][0]
    assert exchange_google(client, code, **overrides)[0] == 400


def test_google_refuses_a_wrong_secret(client: TestClient) -> None:
    code = confirm(client, "google")["code"][0]
    assert exchange_google(client, code, client_secret="wrong")[0] == 401


def test_a_chosen_subject_overrides_the_derived_one(client: TestClient) -> None:
    code = confirm(client, "google", subject="custom-subject")["code"][0]
    id_token = str(exchange_google(client, code)[1]["id_token"])
    assert decode_part(id_token, 1)["sub"] == "custom-subject"


def facebook_token(client: TestClient, code: str, **overrides: str) -> str:
    params = {
        "client_id": "mock-facebook-app",
        "client_secret": "mock-facebook-secret",
        "redirect_uri": FB_REDIRECT,
        "code": code,
        "code_verifier": VERIFIER,
        **overrides,
    }
    response = client.get("/facebook/v23.0/oauth/access_token", params=params)
    assert response.status_code == 200
    return str(response.json()["access_token"])


def proof(token: str) -> str:
    return hmac.new(b"mock-facebook-secret", token.encode(), hashlib.sha256).hexdigest()


def test_facebook_returns_the_profile_with_a_valid_proof(client: TestClient) -> None:
    code = confirm(client, "facebook", name="Ana")["code"][0]
    token = facebook_token(client, code)
    params = {"access_token": token, "appsecret_proof": proof(token), "fields": "id,name,email"}
    profile = client.get("/facebook/v23.0/me", params=params).json()

    assert profile == {
        "id": derive_subject("facebook", "ana@example.com"),
        "name": "Ana",
        "email": "ana@example.com",
    }


def test_facebook_refuses_a_wrong_proof_or_token(client: TestClient) -> None:
    code = confirm(client, "facebook")["code"][0]
    token = facebook_token(client, code)
    wrong = {"access_token": token, "appsecret_proof": "0" * 64}
    assert client.get("/facebook/v23.0/me", params=wrong).status_code == 400
    unknown = {"access_token": "nope", "appsecret_proof": proof("nope")}
    assert client.get("/facebook/v23.0/me", params=unknown).status_code == 401


def test_facebook_can_leave_out_the_email(client: TestClient) -> None:
    code = confirm(client, "facebook", no_email="true")["code"][0]
    token = facebook_token(client, code)
    params = {"access_token": token, "appsecret_proof": proof(token), "fields": "id,name,email"}
    assert "email" not in client.get("/facebook/v23.0/me", params=params).json()


def test_a_facebook_code_does_not_work_at_google(client: TestClient) -> None:
    code = confirm(client, "facebook")["code"][0]
    assert exchange_google(client, code)[0] == 400


def test_fail_next_makes_one_exchange_fail(client: TestClient) -> None:
    client.post("/control/fail-next")
    first = confirm(client, "google")["code"][0]
    assert exchange_google(client, first)[0] == 500
    second = confirm(client, "google")["code"][0]
    assert exchange_google(client, second)[0] == 200
