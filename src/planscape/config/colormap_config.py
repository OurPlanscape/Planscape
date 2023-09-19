import json
from typing import Tuple


class ColormapConfig:
    """
    Class wrapping the configuration of colormaps.
    """

    def __init__(self, filename: str):
        with open(filename, "r") as stream:
            try:
                self._config = json.load(stream)
            except json.JSONDecodeError as exc:
                raise ValueError("Could not parse JSON file; exception was " + str(exc))

    def get_config(self, colormap: str) -> dict | None:
        config = self._config.get(colormap, None)
        if config is None:
            return None
        return {"name": colormap, "values": config}

    def get_colormap_string(self, colormap: str) -> str:
        match colormap:
            # Handle the standard ST_Colormap colormaps
            case "bluered":
                return "bluered"
            case "greyscale":
                return "greyscale"
            case "fire":
                return "fire"
            case _:
                # Return the Viridis color map if nothing in the config
                if colormap not in self._config:
                    return (
                        "100% 68 1 84\n"
                        "75% 59 82 139\n"
                        "50% 33 145 140\n"
                        "25% 94 201 98\n"
                        "0% 253 231 37\n"
                        "nv 0 0 0 0"
                    )
                # Otherwise, construct the ST_Colormap
                # First, sort the list by percentile, from high to low (the ST_Colormap
                # values seem to require this).
                tuples: list = []
                for value in self._config[colormap]:
                    percentile = value["percentile"]
                    rgb = value["rgb"].lstrip("#")
                    tuples += [
                        (
                            int(percentile),
                            int(rgb[0:2], 16),
                            int(rgb[2:4], 16),
                            int(rgb[4:6], 16),
                        )
                    ]
                tuples.sort(reverse=True)
                out = ""
                for tuple in tuples:
                    out += ("{}% {} {} {}\n").format(
                        tuple[0], tuple[1], tuple[2], tuple[3]
                    )
                return out + "nv 0 0 0 0"
