import django_filters as filters

from workspaces.models import Workspace


class WorkspaceFilterSet(filters.FilterSet):
    name = filters.CharFilter(
        lookup_expr="icontains",
        help_text="Case insensitive search for workspace name.",
    )

    class Meta:
        model = Workspace
        fields = ["name"]


class PlanningWorkspaceFilterSet(filters.FilterSet):
    name = filters.CharFilter(
        lookup_expr="icontains",
        help_text="Case insensitive search for workspace name.",
    )
    search = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text="Case insensitive search for workspace name.",
    )

    class Meta:
        model = Workspace
        fields = ["name", "search"]
