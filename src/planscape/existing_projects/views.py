import requests, urllib
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.generic.base import TemplateView
import requests, urllib

class CalMAPPER(APIView):
    def get(self, request):
        params = {
            'where': 'PROJECT_STATUS=\'Active\'',
            'outFields' : 'PROJECT_NAME,PROJECT_STATUS',
            'f': 'GEOJSON'
        }
        url_final = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2/query?" + urllib.parse.urlencode(params)
        response = requests.get(url=url_final)
        return Response(response.text)