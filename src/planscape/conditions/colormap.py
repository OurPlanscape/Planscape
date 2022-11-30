# Functions for color maps, used for rasters.
# See ST_ColorMap documentation for format.

def get_colormap(colormap: str) -> str | None:
    match colormap:
        case 'viridis':
          return (
            '100% 68    1  84\n'
            ' 75% 59   82 139\n'
            ' 50% 33  145 140\n'
            ' 25% 94  201  98\n'
            '  0% 253 231  37\n'
            'nv 0 0 0 0')
        case 'wistia':
          return (
            '100% 252 127   0\n'
            ' 75% 255 160   0\n'
            ' 50% 255 189   0\n'
            ' 25% 255 232  26\n'
            '  0% 228 255 122\n'
            'nv 0 0 0 0')
        case 'bluered':
            return 'bluered'
        case 'greyscale':
            return 'greyscale'
        case _:
            return 'fire'