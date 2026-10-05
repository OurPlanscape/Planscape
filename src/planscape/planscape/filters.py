from django_filters import filters
from django_filters.rest_framework import DjangoFilterBackend

from planscape.analytics import track_event


class CharArrayFilter(filters.BaseCSVFilter, filters.CharFilter):
    pass


class MultipleValueFilter(filters.CharFilter):
    def __init__(self, given_param, field_name, *args, **kwargs):
        self.given_param = given_param
        super(MultipleValueFilter, self).__init__(
            field_name=field_name, *args, **kwargs
        )

    def filter(self, queryset, value):
        if not value:
            return queryset
        request = self.parent.request
        # getlist grabs all values associated with this param
        all_values = request.query_params.getlist(self.given_param)
        filter_expr = {f"{self.field_name}__in": all_values}
        return queryset.filter(**filter_expr)


class TrackedFilterBackend(DjangoFilterBackend):
    """Drop-in replacement for DjangoFilterBackend that also fires a
    `search.filtered` analytics event whenever a list request actually
    supplies filter query params - so we can see what people search/filter
    for across the API without instrumenting every view by hand.

    Tracks any query param declared on the view's `filterset_class`. A view
    that filters its queryset ad hoc (outside a FilterSet - e.g. a raw
    `?search=` handled in `get_queryset()`) can still get those params
    tracked by listing them on a `tracked_query_params` class attribute.

    This is wired in as the project-wide default filter backend
    (settings.REST_FRAMEWORK["DEFAULT_FILTER_BACKENDS"]); views that
    override `filter_backends` locally need to list this class instead of
    DjangoFilterBackend to keep getting tracked.
    """

    def filter_queryset(self, request, queryset, view):
        queryset = super().filter_queryset(request, queryset, view)

        if getattr(view, "action", None) != "list":
            return queryset

        tracked_params = set(getattr(view, "tracked_query_params", ()))
        filterset_class = self.get_filterset_class(view, queryset)
        if filterset_class is not None:
            tracked_params |= set(filterset_class.base_filters)
        if not tracked_params:
            return queryset

        applied = {
            key: value
            for key, value in request.query_params.items()
            if key in tracked_params and value not in (None, "")
        }
        if not applied:
            return queryset

        user = getattr(request, "user", None)
        is_authenticated = bool(user and user.is_authenticated)
        track_event(
            name="search.filtered",
            properties={
                "resource": queryset.model.__name__,
                "params": applied,
                "email": user.email if is_authenticated else None,
            },
            user_id=user.pk if is_authenticated else None,
        )
        return queryset
