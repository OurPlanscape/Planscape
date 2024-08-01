from django_filters import filters


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
