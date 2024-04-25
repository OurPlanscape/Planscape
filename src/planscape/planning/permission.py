from rest_framework.permissions import BasePermission


class UserPermission(BasePermission):
    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def is_authenticated(self, request):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        ## Note: this isn't actually called in a list view, nor in our existing list views
        # https://www.django-rest-framework.org/api-guide/permissions/#limitations-of-object-level-permissions
        pass
