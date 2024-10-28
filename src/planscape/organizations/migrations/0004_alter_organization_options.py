from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_organization_organization_name_unique"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="organization",
            options={
                "ordering": ("id",),
                "verbose_name": "Organization",
                "verbose_name_plural": "Organizations",
            },
        ),
    ]
