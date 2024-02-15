class CheckPermissionMixin:
    def can_view():
        raise NotImplementedError("Subclasses must implement can_add.")

    def can_add():
        raise NotImplementedError("Subclasses must implement can_add.")

    def can_change():
        raise NotImplementedError("Subclasses must implement can_add.")

    def can_remove():
        raise NotImplementedError("Subclasses must implement can_remove.")
