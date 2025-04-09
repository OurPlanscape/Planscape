def identify_user_in_op(op, user):
    op.identify(
        {
            "profile_id": user.pk,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "properties": {"organization": None},
        }
    )
