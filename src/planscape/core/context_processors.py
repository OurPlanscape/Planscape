from django.conf import settings


def environment_context(request):
    return {
        "ENV": getattr(settings, "ENV", "").lower(),
    }
