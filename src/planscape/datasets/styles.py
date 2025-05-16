from typing import Any, Dict, Optional

from datasets.models import DataLayer, Style


def get_default_vector_style(**kwargs) -> Dict[str, Any]:
    # for now uses maplibre default stuff
    return {
<<<<<<< HEAD
        "id": 0,
        "data": {
            "fill-color": "#0096FF",
            "fill-outline-color": "#0000FF",
            "fill-opacity": 0.4,
        },
=======
        "fill-color": "#0096FF",
        "fill-outline-color": "#0000FF",
        "fill-opacity": 0.4,
>>>>>>> 7791b288 (changes how we return the default vec style)
    }


def get_raster_style(datalayer: DataLayer, style: Style) -> Dict[str, Any]:
    nodata = datalayer.info.get("nodata") if datalayer.info else None
    style_data = style.data
    if nodata is not None:
        previous = style_data.get("no_data", {}) or {}
        values = previous.get("values", []) or []
        style_data["no_data"] = {**previous, "values": [*values, nodata]}
    return {"id": style.id, "data": style_data}


def get_default_raster_style(
    min: float,
    max: float,
    nodata: Optional[float] = None,
    **kwargs,
) -> Dict[str, Any]:
    steps = 7
    delta = max - min
    interval = delta / (steps - 1)
    breakpoints = list([round((i * interval) + min, 2) for i in range(steps + 1)])
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

    # merge no data from the layer
    nodata_dict = {"values": [], "color": None, "opacity": 0, "label": ""}
    if nodata:
        nodata_dict["values"].append(nodata)

    return {
        "id": 0,
        "data": {
            "map_type": "RAMP",
            "no_data": nodata_dict,
            "entries": entries,
        },
    }
