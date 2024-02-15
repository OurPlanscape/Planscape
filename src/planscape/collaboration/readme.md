# Collaboration

Users will be able to share planning areas to other users, and depending on the role assigned to the invitee, they will get different level of access to features.
The access is defined to a particular planning area, so a invitee can have different roles on each planning area.

## How this works

The `Collaborator` model holds the relationship between invitee, role and planning area.
Taking inspiration from [django-guardian](https://django-guardian.readthedocs.io/en/stable/), we are not doing a direct relationship with `planning_areas`, but instead using [ContentTypes](https://docs.djangoproject.com/en/5.0/ref/contrib/contenttypes/) and object_pk to store the relationship. This allows to create collaboration on other areas in the future, not specifically for planning areas.

The `Permissions` model holds the list of available actions for each role. The naming of the actions follows the [default permissions](https://docs.djangoproject.com/en/5.0/topics/auth/default/#default-permissions) structure.
