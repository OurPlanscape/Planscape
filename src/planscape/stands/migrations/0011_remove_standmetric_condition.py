from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0010_alter_stand_size"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="standmetric",
            name="condition",
        ),
    ]
