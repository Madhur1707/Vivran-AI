from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    deepgram_api_key: str
    groq_api_key: str
    cerebras_api_key: str = ""
    resend_api_key: str = ""
    resend_from_email: str = "onboarding@resend.dev"

    # Only needed on projects still signing tokens with the legacy shared
    # secret (alg HS256). Projects using signing keys are verified against the
    # published JWKS instead and can leave this empty. See app/auth.py.
    supabase_jwt_secret: str = ""

    # Comma-separated. The browser app's origins — the Chrome extension is not
    # listed because extension requests are allowed by its host_permissions,
    # not by CORS.
    cors_origins: str = "https://vivran-ai.vercel.app,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    model_config = {"env_file": ".env"}


settings = Settings()
