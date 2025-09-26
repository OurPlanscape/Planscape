import django.contrib.postgres.indexes
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0013_alter_stand_grid_key"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="stand",
            index=models.Index(
                django.contrib.postgres.indexes.OpClass("grid_key", "text_pattern_ops"),
                name="stand_gridkey_search_index",
            ),
        ),
    ]
