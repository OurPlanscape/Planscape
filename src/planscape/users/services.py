from planscape.openpanel import SingleOpenPanel


def identify_user_in_op(user):
    SingleOpenPanel().identify(
        profile_id=user.pk,
        traits={
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "properties": {"organization": None},
        },
    )
