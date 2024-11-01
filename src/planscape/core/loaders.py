import importlib


def get_python_object(path):
    module_reference, function = path.rsplit(".", 1)
    module = importlib.import_module(module_reference)
    return getattr(module, function)
