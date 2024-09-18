from collaboration.models import Permissions, Role


def reset_permissions():
    viewer = ["view_planningarea", "view_scenario"]
    collaborator = viewer + ["add_scenario"]
    owner = collaborator + [
        "change_scenario",
        "view_collaborator",
        "add_collaborator",
        "delete_collaborator",
        "change_collaborator",
    ]
    for x in viewer:
        entry = Permissions.objects.create(role=Role.VIEWER, permission=x)
        entry.save()

    for x in collaborator:
        entry = Permissions.objects.create(role=Role.COLLABORATOR, permission=x)
        entry.save()

    for x in owner:
        entry = Permissions.objects.create(role=Role.OWNER, permission=x)
        entry.save()
