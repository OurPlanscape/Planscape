from ctypes import sizeof
from pyexpat import features
from django.views.generic.base import TemplateView
import json, requests, urllib

class ExploreView(TemplateView):
    template_name = "explore.html"
    url = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2/query?"
    params = {
        'where': '1=1',
        'outFields' : 'PROJECT_NAME,PROJECT_STATUS',
        'f': 'GEOJSON'
    }
    url_final = url + urllib.parse.urlencode(params)
    response = requests.get(url=url_final).text

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['existing_projects'] = self.response
        return context