import requests
import urllib
from rest_framework.response import Response
from rest_framework.views import APIView


class CalMAPPER(APIView):
    def get(self, request):
        params = {
            'where': 'PROJECT_STATUS=\'Active\'',
            'outFields': 'PROJECT_NAME,PROJECT_STATUS,REGION,UNIT,TREATMENT_NAME,TREATMENT_OBJECTIVE,PROJECT_TYPE,ACTIVITY_STATUS,PROJECT_START_DATE,PROJECT_END_DATE,LAST_UPDATED',
            'f': 'GEOJSON'
        }
        # URL for treatment polygons
        url_final = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CMDash_v3_view/FeatureServer/2/query?" + \
            urllib.parse.urlencode(params)
        response = requests.get(url=url_final)
        return Response(response.text)


class MillionAcres_ITS(APIView):
    def get(self, request):
        # TODO: Request requires authentication token. Asking SIG.
        params = {
            'where': 'project_status=\'Active\'',
            'outFields': 'project_name,project_status,region,unit,treatment_name,treatment_objective,project_type,activity_status,project_start_date,project_end_date,last_updated',
            'returnGeometry': 'False',
            'f': 'GEOJSON'
        }
        # URL for treatment polygons
        # TODO: include line and points
        # TODO: get a stable URL without a version number
        url_final = "https://gsal.sig-gis.com/server/rest/services/Hosted/Million_Acres_Flat_File_2020_2021/FeatureServer/736/query?" + \
            urllib.parse.urlencode(params)
        response = requests.get(url=url_final)
        return Response(response.text)
