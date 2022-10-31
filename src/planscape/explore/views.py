from ctypes import sizeof
from pyexpat import features
from django.views.generic.base import TemplateView
import json, requests, urllib

class ExploreView(TemplateView):
    template_name = "explore.html"