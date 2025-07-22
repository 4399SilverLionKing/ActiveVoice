from pydantic import BaseModel


# 统一响应模型
class Response(BaseModel):
    code: str
    message: str
    data: dict
