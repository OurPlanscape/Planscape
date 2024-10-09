from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_organization_organization_name_unique"),
        ("datasets", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="organization",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="categories",
                to="organizations.organization",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="category",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="datalayers",
                to="datasets.category",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="deleted_at",
            field=models.DateTimeField(
                help_text="Define if the entity has been deleted or not and when",
                null=True,
                verbose_name="Deleted at",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="organization",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="datalayers",
                to="organizations.organization",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="dataset",
            name="organization",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="datasets",
                to="organizations.organization",
            ),
        ),
    ]
