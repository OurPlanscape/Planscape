from rest_framework import routers

from .viewsets import BoundaryViewSet, BoundaryDetailsViewSet

router = routers.DefaultRouter()
router.register(r"boundary", BoundaryViewSet)
router.register(r"boundary_details", BoundaryDetailsViewSet)

urlpatterns = router.urls
