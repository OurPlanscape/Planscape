import re
from typing import Collection

from datasets.models import Category, DataLayer, Dataset, SearchResult
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
    return list([dataset_to_search_result(x) for x in organization.datasets.all()])


def dataset_to_search_result(dataset: Dataset) -> SearchResult:
    dataset_serializer = DatasetSerializer(instance=dataset)
    return SearchResult(
        id=dataset.id,
        name=dataset.name,
        type="DATASET",
        url="url-to-go-to-dataset",
        data=dataset_serializer.data,
    )


def category_to_search_result(category: Category) -> Collection[SearchResult]:
    datalayers = DataLayer.objects.none()
    datalayers |= category.datalayers.all()

    # what is this madness for python?
    child_category: Category

    for child_category in category.get_children():
        datalayers |= child_category.datalayers.all()

    return [datalayer_to_search_result(x) for x in datalayers]


def datalayer_to_search_result(datalayer) -> SearchResult:  # noqa: F811
    datalayer_serializer = BrowseDataLayerSerializer(instance=datalayer)
    return SearchResult(
        id=datalayer.id,
        name=datalayer.name,
        type="DATALAYER",
        url="public-url-for-the-dataset?",
        data=datalayer_serializer.data,
    )
