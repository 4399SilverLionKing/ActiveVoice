from .state import State
from langchain_core.messages import AIMessage


def should_continue(state: State):
    """
    路由函数：决定在 agent 思考后，流程的下一步走向。
    """
    last_message = state.messages[-1]

    # 情况一：如果最后一条消息包含工具调用，则路由到工具执行节点
    if isinstance(last_message, AIMessage):
        # 在这个 if 代码块内部，Pylance 和其他类型检查器
        # 现在都智能地知道 last_message 的类型是 AIMessage，
        # 所以可以安全地访问它的 tool_calls 属性。
        if last_message.tool_calls:
            return "call_tool"

    # 情况二：如果没有工具调用，检查计划是否全部完成
    # all() 函数在一个空列表上会返回 True，这是一个需要注意的边缘情况，但在这里是安全的
    if all(step.status == "completed" for step in state.plan.steps):
        # 所有步骤都完成了，路由到报告节点
        return "generate_report"
    else:
        # 没有工具调用，但计划还没完成，说明当前步骤已通过思考完成。
        # 路由到标记节点，将其标记为 'completed'，然后继续循环。
        return "mark_complete"
