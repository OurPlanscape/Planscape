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
        case 'inferno':
            return (
                '100%   0   0   4\n'
                '75%  87  16 110\n'
                '50% 188  55  84\n'
                '25% 249 142   9\n'
                ' 0% 252 255 164\n'
                'nv 0 0 0 0')
        case 'bluered':
            return 'bluered'
        case 'greyscale':
            return 'greyscale'
        case 'fire':
            return 'fire'
        case _:
            return 'fire'
