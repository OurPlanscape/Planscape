import os
import zipfile
from pathlib import Path
from django.conf import settings

# output_dir = Path(settings.OUTPUT_DIR)
# source_dir = output_dir / Path(scenario.name)

def zip_directory(file_obj, source_dir):
    with zipfile.ZipFile(file_obj, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(source_dir):
                for file in files:
                    zipf.write(
                        os.path.join(root, file),
                        os.path.relpath(
                            os.path.join(root, file), os.path.join(source_dir, "..")
                        ),
                    )
                    