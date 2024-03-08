import logging


class NotInTestingFilter(logging.Filter):
    def filter(self, record):
        from django.conf import settings

        return not settings.TESTING_MODE
