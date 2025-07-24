from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # Langchain配置
    LANGCHAIN_TRACING_V2: bool = True
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGCHAIN_PROJECT: str = "ChinaTravel"

    # 智谱API配置
    OPENAI_BASE_URL: str = "https://open.bigmodel.cn/api/paas/v4/"
    OPENAI_MODEL: str = "glm-4-plus"

    # 对话配置
    CONVERSATION_TTL: int = 86400
    MAX_CONVERSATION_HISTORY: int = 50


# 创建全局配置实例
ai_settings = Settings()
