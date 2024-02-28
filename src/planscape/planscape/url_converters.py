class ContentTypeURLConverter:
    # in the future, if we do need to
    # have multiple content types
    # we can map them here.
    regex = "(planningarea)"

    def to_python(self, value):
        return value.lower()

    def to_url(self, value):
        return value
