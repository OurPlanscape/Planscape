import json


class ColormapConfig:
    """
    Class wrapping the configuration of colormaps.
    """

    def __init__(self, filename: str):
        with open(filename, "r") as stream:
            try:
                self._config = json.load(stream)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    "Could not parse JSON file; exception was " + str(exc))

    def get_config(self, colormap: str) -> dict | None:
        config = self._config.get(colormap, None)
        if config is None:
            return None
        return {colormap: config}

    def get_colormap_string(self, colormap: str) -> str:
        match colormap:
            # Handle the standard ST_Colormap colormaps
            case 'bluered':
                return 'bluered'
            case 'greyscale':
                return 'greyscale'
            case 'fire':
                return 'fire'
            case _:
                # Return the Viridis color map if nothing in the config
                if colormap not in self._config:             
                    return (
                        '0% 253 231 37\n'
                        '25% 94 201 98\n'
                        '50% 33 145 140\n'
                        '75% 59 82 139\n'
                        '100% 68 1 84\n'
                        'nv 0 0 0 0')
                # Otherwise, construct the ST_Colormap
                out = ''
                for value in self._config[colormap]:
                    percentile = value['percentile']
                    rgb = value['rgb'].lstrip('#')
                    rgb_tuple = tuple(int(rgb[i:i+2], 16) for i in (0, 2, 4))
                    out += ('{}% {} {} {}\n').format(
                        percentile, rgb_tuple[0], rgb_tuple[1], rgb_tuple[2])
                return out + 'nv 0 0 0 0'
