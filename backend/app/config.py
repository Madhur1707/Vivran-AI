from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    deepgram_api_key: str
    groq_api_key: str
    resend_api_key: str = ""
    resend_from_email: str = "onboarding@resend.dev"

    model_config = {"env_file": ".env"}


settings = Settings()
