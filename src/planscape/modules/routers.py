from rest_framework.routers import SimpleRouter

from modules.views import ModuleViewSet

router = SimpleRouter()
router.register(r"modules", ModuleViewSet, basename="modules")
