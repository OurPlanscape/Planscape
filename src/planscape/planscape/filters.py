from django_filters import filters


class CharArrayFilter(filters.BaseCSVFilter, filters.CharFilter):
    pass
