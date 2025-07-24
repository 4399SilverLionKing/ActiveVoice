from app.core.ai_config import ai_settings
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.prebuilt import ToolNode
from typing import cast
from .prompts import *
from .tools import all_tools
from .state import State, Plan
import logging
import copy

logger = logging.getLogger(__name__)

# 初始化模型
# llm = ChatOpenAI(
#     model=ai_settings.OPENAI_MODEL,
#     base_url=ai_settings.OPENAI_BASE_URL,
#     temperature=0.7,
#     streaming=False,
# )
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite-preview-06-17", temperature=0.7
)

# 工具调用节点
tool_node = ToolNode(tools=all_tools)


def planner_node(state: State):
    logger.info("***正在运行 Planner node***")
    messages = [
        SystemMessage(content=PLAN_SYSTEM_PROMPT),
        HumanMessage(
            content=PLAN_CREATE_PROMPT.format(user_message=state.user_message)
        ),
    ]
    # zhipu
    # plan = cast(
    #     Plan,
    #     llm.with_structured_output(Plan, method="json_mode")
    #     .bind(response_format={"type": "json_object"})
    #     .invoke(messages),
    # )
    # google
    plan = cast(
        Plan,
        llm.with_structured_output(Plan, method="json_mode")
        .bind(response_format={"type": "json_object"})
        .invoke(messages),
    )
    plan_json = plan.model_dump_json(indent=2, exclude_none=True)
    ai_message_content = (
        f"已为您生成了详细的执行计划。\n"
        f"思考过程: {plan.thought}\n"
        f"完整计划如下:\n```json\n{plan_json}\n```"
    )
    return {"plan": plan, "messages": [AIMessage(content=ai_message_content)]}


def marker_node(state: State):
    logger.info("***正在运行 Marker node***")
    plan = copy.deepcopy(state.plan)

    for step in plan.steps:
        if step.status == "pending":
            step.status = "completed"
            logger.info(f"步骤 '{step.title}' 已标记为完成。")
            break

    return {"plan": plan}


def agent_node(state: State):
    logger.info("***正在运行 Agent 思考节点***")

    plan = state.plan
    current_step = next((step for step in plan.steps if step.status == "pending"), None)

    if not current_step:
        # 如果没有待处理的步骤，说明计划已完成
        return {"messages": [AIMessage(content="所有步骤已完成。")]}

    logger.info(f"当前执行STEP:{current_step.description}")

    messages = (
        state.messages
        + state.observations
        + [
            SystemMessage(content=EXECUTE_SYSTEM_PROMPT),
            HumanMessage(
                content=EXECUTION_PROMPT.format(
                    user_message=state.user_message, step=current_step.description
                )
            ),
        ]
    )

    response = llm.bind_tools(all_tools).invoke(messages)

    return {"messages": [response]}


def report_node(state: State):
    logger.info("***正在运行 Report 节点***")
    messages = (
        state.messages
        + [SystemMessage(content=REPORT_SYSTEM_PROMPT)]
        + [HumanMessage(content=REPORT_PROMPT)]
    )
    response = llm.bind_tools(all_tools).invoke(messages)
    return {"final_report": response.content}
