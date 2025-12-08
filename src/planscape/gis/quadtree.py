from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Union

import numpy as np
from gis.geometry import shapely_reproject
from rasterio.io import DatasetReader
from rasterio.windows import Window
from rasterio.windows import bounds as window_bounds
from shapely.geometry import box
from shapely.ops import unary_union

Number = Union[int, float]


class NodeType(Enum):
    DATA = "DATA"
    NODATA = "NODATA"
    MIXED = "MIXED"


@dataclass
class RasterTreeNode:
    id: str
    level: int
    row: int
    col: int
    window: Window
    bounds: tuple
    type: NodeType
    children: list = field(default_factory=list)


def build_raster_tree(
    raster: DatasetReader,
    max_levels: int = 7,
    band: int = 1,
    classify_downsample: int = 1,
    nodata_values: Optional[List[Number]] = None,
    rows: int = 2,
    cols: int = 2,
):
    """
    nodata_values: list of numeric values that should also be treated as nodata,
                   in addition to the raster's own nodata/mask. Example:
                       nodata_values=[0, -9999]
    """
    full_window = Window(0, 0, raster.width, raster.height)
    return build_node(
        raster=raster,
        window=full_window,
        current_level=0,
        max_levels=max_levels,
        rows=rows,
        cols=cols,
        band=band,
        classify_downsample=classify_downsample,
        nodata_values=nodata_values,
        current_col=0,
        current_row=0,
    )


def classify_window(
    raster: DatasetReader,
    window: Window,
    band: int,
    classify_downsample: int,
    nodata_values: Optional[List[Number]],
):
    win_w = int(window.width)
    win_h = int(window.height)

    if classify_downsample > 1:
        out_w = max(1, win_w // classify_downsample)
        out_h = max(1, win_h // classify_downsample)
        data = raster.read(
            band,
            window=window,
            masked=True,
            out_shape=(out_h, out_w),  # band is single int → 2D array
        )
    else:
        data = raster.read(
            band,
            window=window,
            masked=True,
        )

    mask = np.ma.getmaskarray(data)

    if nodata_values:
        extra_mask = np.isin(data.data, np.array(nodata_values))
        mask = np.logical_or(mask, extra_mask)

    valid = ~mask

    nodata_only = not valid.any()
    all_data = valid.all()

    if nodata_only:
        return NodeType.NODATA

    if all_data:
        return NodeType.DATA

    return NodeType.MIXED


def build_id(current_level: int, current_row: int, current_col: int) -> str:
    return f"L{current_level}/R{current_row}/C{current_col}"


def max_levels_reached(current_level: int, max_levels: int) -> bool:
    return (current_level + 1) >= max_levels


def build_node(
    raster: DatasetReader,
    window: Window,
    current_level: int,
    max_levels: int,
    rows: int,
    cols: int,
    band: int,
    classify_downsample: int,
    nodata_values: Optional[List[Number]],
    current_col: int = 0,
    current_row: int = 0,
) -> RasterTreeNode:
    node_type = classify_window(
        raster,
        window,
        band,
        classify_downsample,
        nodata_values,
    )

    bnds = window_bounds(window, raster.transform)
    id = build_id(
        current_level,
        current_col=current_col,
        current_row=current_row,
    )
    node = RasterTreeNode(
        id=id,
        row=current_row,
        col=current_col,
        level=current_level,
        type=node_type,
        window=window,
        bounds=bnds,
    )

    match node_type:
        case NodeType.NODATA | NodeType.DATA:
            return node
        case _:
            pass

    if max_levels_reached(current_level, max_levels):
        return node

    win_width = int(window.width)
    win_height = int(window.height)

    col_edges = np.linspace(
        window.col_off,
        window.col_off + win_width,
        cols + 1,
        dtype=int,
    )
    row_edges = np.linspace(
        window.row_off,
        window.row_off + win_height,
        rows + 1,
        dtype=int,
    )

    for r in range(rows):
        for c in range(cols):
            col_off = col_edges[c]
            row_off = row_edges[r]
            w = col_edges[c + 1] - col_off
            h = row_edges[r + 1] - row_off

            if w <= 0 or h <= 0:
                continue

            child_window = Window(
                col_off=int(col_off),
                row_off=int(row_off),
                width=int(w),
                height=int(h),
            )

            child = build_node(
                raster=raster,
                window=child_window,
                current_level=current_level + 1,
                current_row=r,
                current_col=c,
                max_levels=max_levels,
                rows=rows,
                cols=cols,
                band=band,
                classify_downsample=classify_downsample,
                nodata_values=nodata_values,
            )
            node.children.append(child)

    return node


def union_data_area(
    node: RasterTreeNode,
    input_srid: int = 3857,
    output_srid: int = 4269,
):
    def iter_leaves(node):
        if not node.children:
            yield node
        else:
            for ch in node.children:
                yield from iter_leaves(ch)

    geoms = []
    for node in iter_leaves(node):
        if node.type == NodeType.NODATA:
            continue

        minx, miny, maxx, maxy = node.bounds
        geoms.append(box(minx, miny, maxx, maxy))

    if not geoms:
        return None
    geom = unary_union(geoms)
    if input_srid != output_srid:
        geom = shapely_reproject(geom, input_srid, output_srid)

    return geom


def plot_tree(node: RasterTreeNode):
    import matplotlib.pyplot as plt  # noqa
    from matplotlib.patches import Rectangle  # noqa

    """
    Plot the entire tree of TreeNode objects.
    This will only work if you do have matplotlib installed.

    Done it this way because I don't want to have that dependency.
    """
    fig, ax = plt.subplots(figsize=(8, 8))

    def _plot_node(node):
        # node.bounds = (minx, miny, maxx, maxy)
        minx, miny, maxx, maxy = node.bounds
        width = maxx - minx
        height = maxy - miny

        # Color by nodata flag
        face = "black" if node.type == NodeType.NODATA else "white"

        rect = Rectangle(
            (minx, miny), width, height, facecolor=face, edgecolor="gray", linewidth=0.5
        )
        ax.add_patch(rect)

        # Plot children (drawn on top of parents)
        for child in node.children:
            _plot_node(child)

    _plot_node(node)

    # Use root bounds for axes limits
    minx, miny, maxx, maxy = node.bounds
    ax.set_xlim(minx, maxx)
    ax.set_ylim(miny, maxy)
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.set_title("Raster tree (white = has data, black = nodata only)")

    plt.show()
