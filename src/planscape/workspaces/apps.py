from django.apps import AppConfig


class WorkspacesConfig(AppConfig):
    name = "workspaces"

    actstream_models = (
        "Workspace",
        "UserAccessWorkspace",
    )

    def register_actstream(self):
        from actstream import registry

        for model_name in self.actstream_models:
            registry.register(self.get_model(model_name))

    def ready(self):
        self.register_actstream()
