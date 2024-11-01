from pprint import pformat
from typing import Any
from pygments import highlight
from pygments.formatters import Terminal256Formatter
from pygments.lexers import PythonLexer


def pprint(obj: Any, style="monokai") -> None:
    print(
        highlight(
            pformat(obj),
            PythonLexer(),
            Terminal256Formatter(style=style),
        ),
        end="",
    )
