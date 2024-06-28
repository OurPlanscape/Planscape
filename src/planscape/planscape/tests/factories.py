from datetime import datetime

import factory
import factory.fuzzy
import pytz
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Faker("user_name")
    password = factory.django.Password("password")
    email = factory.Faker("ascii_email")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_staff = False
    is_superuser = False
    is_active = True
    date_joined = factory.fuzzy.FuzzyDateTime(datetime(2020, 1, 1, tzinfo=pytz.UTC))
