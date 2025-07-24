from langchain_core.tools import tool
import os
import subprocess
from pydantic import BaseModel, Field


class File_Query(BaseModel):
    file_name: str = Field(description="文件名")
    content: str = Field(description="需要写入的文件内容")


@tool(args_schema=File_Query)
def create_file(file_name: str, content: str):
    """
    创建一个新文件并写入内容。

    使用场景：
    - 创建Python脚本、配置文件、数据文件等
    - 保存代码、文本、JSON、CSV等任何内容
    - 生成报告、文档等

    参数：
    - file_name: 文件名（包含扩展名）
    - content: 要写入的文件内容

    注意：如果文件已存在，它将被覆盖。
    """
    with open(file_name, "w", encoding="utf-8") as f:
        f.write(content)
    return f"文件 '{file_name}' 已成功创建并写入内容。"


@tool
def shell_exec(command: str) -> dict:
    """
    在shell中执行命令，用于运行代码、安装包、执行脚本等。

    使用场景：
    - 运行Python脚本：python script.py
    - 安装包：pip install package_name
    - 执行系统命令：dir, ls, cd等
    - 运行数据处理、图表生成等任务

    参数:
        command (str): 要执行的shell命令

    返回:
        dict: 包含执行结果
            - stdout: 命令的标准输出
            - stderr: 命令的标准错误

    重要：代码必须先用create_file保存，再用此工具执行！
    """

    try:
        # 执行命令
        result = subprocess.run(
            command,
            shell=True,
            cwd=os.getcwd(),
            capture_output=True,
            text=True,
            check=False,
        )

        # 返回结果
        return {"message": {"stdout": result.stdout, "stderr": result.stderr}}

    except Exception as e:
        return {"error": {"stderr": str(e)}}

# 将所有工具放入一个列表
all_tools = [
    create_file,
    shell_exec,
]
