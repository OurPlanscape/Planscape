from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

def planscape_api_exception_handler(exc, context):
    if isinstance(exc, ValidationError):
        if isinstance(exc.detail, dict):
            customized_detail = {
                "detail": exc.detail.get("detail", "Validation error."),
                "errors": exc.detail,
            }
        else:
            customized_detail = {
                "detail": "Validation error.",
                "errors": exc.detail,
            }
        exc.detail = customized_detail
        response = Response(exc.detail, status=exc.status_code)
        return response

    response = exception_handler(exc, context)
    return response