from langgraph.graph import StateGraph, END
from .state import State
from .nodes import *
from .edges import should_continue

# 1. 初始化一个状态图，并告诉它使用我们定义的 State 模型
workflow = StateGraph(State)

# 2. 将所有节点添加到图中，并为它们命名
workflow.add_node("planner", planner_node)
workflow.add_node("agent", agent_node)
workflow.add_node("tool_executor", tool_node)
workflow.add_node("marker", marker_node)
workflow.add_node("reporter", report_node)

# 3. 设置图的入口点
workflow.set_entry_point("planner")

# 4. 添加固定的边（Edges）
workflow.add_edge("planner", "agent")
workflow.add_edge("tool_executor", "agent")
workflow.add_edge("marker", "agent")
workflow.add_edge("reporter", END)

# 5. 添加条件边（Conditional Edges）
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "call_tool": "tool_executor",
        "generate_report": "reporter",
        "mark_complete": "marker",
    },
)

agent = workflow.compile()
