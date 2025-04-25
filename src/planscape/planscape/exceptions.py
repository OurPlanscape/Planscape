class InvalidOwnership(Exception):
    pass


class InvalidGeometry(Exception):
    pass


class ForsysException(Exception):
    pass


class ForsysTimeoutException(ForsysException):
    pass
