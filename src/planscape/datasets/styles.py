def get_default_vector_style(**kwargs):
    # for now uses maplibre default stuff
    return {
        "paint": {
            "fill-color": "#0096FF",
            "fill-outline-color": "#0000FF",
            "fill-opacity": 0.4,
        }
    }


def get_default_raster_style(min: float, max: float, **kwargs):
    steps = 7
    delta = max - min
    interval = delta / (steps - 1)
    breakpoints = list([(i * interval) + min for i in range(steps + 1)])
    colors = [
        "#7a0403",
        "#d93807",
        "#fe992c",
        "#d3e835",
        "#64fd6a",
        "#4777ef",
        "#30123b",
    ]

    tuples = zip(breakpoints, colors)
    if min == max:
        entries = [{"value": min, "color": colors[0], "opacity": 1, "label": str(min)}]
    else:
        entries = list(
            [
                {"value": value, "color": color, "opacity": 1, "label": str(value)}
                for value, color in tuples
            ]
        )

    return {
        "map_type": "RAMP",
        "no_data": {"values": [], "color": None, "opacity": 0, "label": ""},
        "entries": entries,
    }
