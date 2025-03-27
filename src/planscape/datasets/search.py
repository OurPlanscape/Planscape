import re
from typing import Collection

from datasets.models import (
    Category,
    DataLayer,
    DataLayerStatus,
    Dataset,
    SearchResult,
    VisibilityOptions,
)
from datasets.serializers import BrowseDataLayerSerializer, DatasetSerializer


def get_highlight(
    name: str,
    query: str,
    html_tag="span",
    html_class="highlight",
) -> str:
    parts = re.split(query, name, flags=re.IGNORECASE)
    full_tag = f"<{html_tag} class='{html_class}'>{query}</{html_tag}"
    return full_tag.join(parts)


def organization_to_search_result(organization) -> Collection[SearchResult]:  # type: ignore
    return list(
        [
            dataset_to_search_result(x)
            for x in organization.datasets.filter(visibility=VisibilityOptions.PUBLIC)
        ]
    )


def dataset_to_search_result(dataset: Dataset) -> SearchResult:
    dataset_serializer = DatasetSerializer(instance=dataset)
    return SearchResult(
        id=dataset.id,
        name=dataset.name,
        type="DATASET",
        data=dataset_serializer.data,
    )


def category_to_search_result(category: Category) -> Collection[SearchResult]:
    datalayers = DataLayer.objects.none()
    datalayers |= category.datalayers.filter(
        status=DataLayerStatus.READY,
        dataset__visibility=VisibilityOptions.PUBLIC,
    )

    # what is this madness for python?
    child_category: Category

    for child_category in category.get_children():  # type: ignore
        datalayers |= child_category.datalayers.filter(
            status=DataLayerStatus.READY,
            dataset__visibility=VisibilityOptions.PUBLIC,
        )

    return [datalayer_to_search_result(x) for x in datalayers]


def datalayer_to_search_result(datalayer) -> SearchResult:  # noqa: F811
    datalayer_serializer = BrowseDataLayerSerializer(instance=datalayer)
    return SearchResult(
        id=datalayer.id,
        name=datalayer.name,
        type="DATALAYER",
        data=datalayer_serializer.data,
    )
