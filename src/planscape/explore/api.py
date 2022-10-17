"""Markers API URL Configuration."""

from rest_framework import routers

from .viewsets import MarkerViewSet, TCSI_HUC12ViewSet

router = routers.DefaultRouter()
router.register(r"markers", MarkerViewSet)
router.register(r"tcsi_huc12", TCSI_HUC12ViewSet)

urlpatterns = router.urls
