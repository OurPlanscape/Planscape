import logging
import json

log = logging.getLogger(__name__)


def read_file(path):
    with open(path, "r") as f:
        return f.read()


def load_json_file(json_path):
    try:
        with open(json_path, "r", encoding="UTF-8") as f:
            json_data = json.load(f)
            return json_data
    except (FileNotFoundError, IsADirectoryError, PermissionError) as e:
        log.error("Error opening json file %s. %s", json_path, e)
        raise e
    except Exception as e:
        log.error("Error opening json file %s. %s", json_path, e)
        raise e
