from fastapi import APIRouter
import logging

logging.basicConfig(level=logging.INFO)

api_router = APIRouter()


@api_router.get("/")
def read_root():
    return {"Hello": "World"}
