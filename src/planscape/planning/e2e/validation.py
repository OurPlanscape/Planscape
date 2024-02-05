import logging
import json
import os
from jsonschema import Draft202012Validator, ValidationError
from planscape import settings

log = logging.getLogger(__name__)


def load_schema(schema_file):
    fixtures_path = settings.TREATMENTS_TEST_FIXTURES_PATH
    results_path = os.path.join(settings.BASE_DIR, fixtures_path, schema_file)
    try:
        with open(results_path, "r", encoding="UTF-8") as f:
            results_schema = json.load(f)
            return results_schema
    except (FileNotFoundError, IsADirectoryError, PermissionError) as e:
        log.error("Error opening schema %s. %s", schema_file, e)


def validation_results(validation_schema, output_result) -> bool:
    try:
        v = Draft202012Validator(validation_schema)
        if not v.is_valid(output_result):
            for error in sorted(v.iter_errors(output_result)):
                print(error.message)
                log.error("\nRESULT VALIDATION ERROR: %s", error.message)
            return False
        return True
    # here we catch any non-specific validation exceptions
    except ValidationError as ve:
        log.error("RESULT VALIDATION EXCEPTION %s", {ve.message})
        return False
    except Exception as e:
        log.error("ERROR: Failed attempting to run validation script\n%s", e)
        raise Exception from e
