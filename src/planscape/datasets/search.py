import re

from datasets.models import Dataset, SearchResult, SimpleCategory
from datasets.serializers import (
    BrowseDataLayerSerializer,
    DatasetSerializer,
    SimpleCategorySerializer,
)


def get_highlight(
    name: str,
    query: str,
    html_tag="span",
    html_class="highlight",
) -> str:
    parts = re.split(query, name, flags=re.IGNORECASE)
    full_tag = f"<{html_tag} class='{html_class}'>{query}</{html_tag}"
    return full_tag.join(parts)


def dataset_to_search_result(dataset: Dataset) -> SearchResult:
    dataset_serializer = DatasetSerializer(instance=dataset)
    return SearchResult(
        id=dataset.id,
        name=dataset.name,
        type="DATASET",
        data=dataset_serializer.data,
    )


def simple_category_to_search_result(category: SimpleCategory) -> SearchResult:
    category_serializer = SimpleCategorySerializer(instance=category)
    return SearchResult(
        id=category.id,
        name=category.name,
        type="SIMPLE_CATEGORY",
        data=category_serializer.data,
    )


def datalayer_to_search_result(datalayer) -> SearchResult:  # noqa: F811
    datalayer_serializer = BrowseDataLayerSerializer(instance=datalayer)
    return SearchResult(
        id=datalayer.id,
        name=datalayer.name,
        type="DATALAYER",
        data=datalayer_serializer.data,
    )
