from django.views.generic.base import TemplateView


class ExploreView(TemplateView):
    """Markers map view."""

    template_name = "explore.html"
