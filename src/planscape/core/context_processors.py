from django.conf import settings


def catalog_environment_banner(request):
    return {
        "IS_CATALOG_ENVIRONMENT": getattr(settings, "IS_CATALOG_ENVIRONMENT", False),
    }
