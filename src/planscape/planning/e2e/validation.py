import logging
import json
import os
from jsonschema import Draft202012Validator, ValidationError
from planscape import settings
from utils.file_utils import load_json_file

log = logging.getLogger(__name__)


def do_schema_validation(sid, validation_schema, output_result) -> object:
    try:
        v = Draft202012Validator(validation_schema)
        if not v.is_valid(output_result):
            for error in v.iter_errors(output_result):
                log.error("\nRESULT VALIDATION ERROR: %s", error.message)
            return json.dumps(
                {"result": "FAILED", "scenario_id": sid, "details": error.message}
            )
        return json.dumps({"result": "OK", "scenario_id": sid})
    # here we catch any non-specific validation exceptions
    except ValidationError as ve:
        log.error("\nRESULT VALIDATION EXCEPTION %s", {ve.message})
        return json.dumps(
            {"result": "FAILED", "scenario_id": sid, "details": error.message}
        )
    except Exception as e:
        log.error("ERROR: Failed attempting to run validation script\n%s", e)
        raise Exception from e
