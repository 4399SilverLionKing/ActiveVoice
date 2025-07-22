from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # 基本信息
    PROJECT_NAME: str = "Active Voice"
    API_V1_STR: str = "/api/v1"


# 创建全局配置实例
global_settings = Settings()
