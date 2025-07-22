from fastapi import WebSocket, WebSocketDisconnect, APIRouter
import logging

logging.basicConfig(level=logging.INFO)

api_wb = APIRouter()


@api_wb.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logging.info("WebSocket connection established.")
    try:
        while True:
            # 等待并接收来自客户端的消息
            data = await websocket.receive_text()
            logging.info(f"Received message from client: {data}")

            # 向客户端回送一条消息
            response = f"Message received: '{data}'"
            await websocket.send_text(response)
            logging.info(f"Sent message to client: {response}")

    except WebSocketDisconnect:
        logging.info("WebSocket connection closed.")
    except Exception as e:
        logging.error(f"An error occurred: {e}")
