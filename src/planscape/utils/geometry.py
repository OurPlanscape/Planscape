def to_multi(geometry):
    if geometry["type"].startswith("Multi"):
        return geometry

    new_coordinates = [geometry.get("coordinates")]
    new_type = f'Multi{geometry["type"]}'
    return {
        "type": new_type,
        "coordinates": new_coordinates,
    }
