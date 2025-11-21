from rest_framework.views import exception_handler

def planscape_api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None and isinstance(response.data, dict):
        payload = {
            "detail": response.data.get("detail", "An error occurred."),
            "errors": response.data if response.data != {} else [],
        }
        response.data = payload

    return response