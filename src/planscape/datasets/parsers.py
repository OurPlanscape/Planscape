import logging
from pathlib import Path
from xml.etree import ElementTree

from typing import Any, Dict, List, Optional
from pygeometa.schemas import load_schema, SCHEMAS


logger = logging.getLogger(__name__)


def _get_item_text_or_none(
    element: Optional[ElementTree.Element], tag: str
) -> Optional[str]:
    find_element = element.find(tag) if element else None
    return str(find_element.text).strip() if find_element is not None else None


def parse_qmd_metadata(metadata_file: Path) -> Optional[Dict[str, Any]]:
    with metadata_file.open() as f:
        try:
            root = ElementTree.fromstring(f.read())
            metadata = {
                "metadata": {
                    "identifier": _get_item_text_or_none(root, "identifier"),
                    "parentidentifier": _get_item_text_or_none(
                        root, "parentidentifier"
                    ),
                    "hierarchylevel": _get_item_text_or_none(root, "type"),
                    "language": _get_item_text_or_none(root, "language"),
                },
            }

            identification = {
                "language": _get_item_text_or_none(root, "language"),
                "title": _get_item_text_or_none(root, "title"),
                "abstract": _get_item_text_or_none(root, "abstract"),
                "fees": _get_item_text_or_none(root, "fees"),
                "accessconstraints": _get_item_text_or_none(root, "constraints"),
                "license": {"name": _get_item_text_or_none(root, "license")},
            }
            keywords_tree = root.find("keywords")
            keywords = []
            if keywords_tree:
                for keyword in keywords_tree.iter():
                    kw = str(keyword.text).strip()
                    if kw:
                        keywords.append(keyword.text)

            if keywords:
                identification.update({"keywords": {"default": {"keywords": keywords}}})

            extents = {}
            extent_tree = root.find("extent")
            if extent_tree:
                spatial = extent_tree.find("spatial")
                temporal = extent_tree.find("temporal")
                if spatial:
                    extents.update({"spatial": [spatial.attrib]})
                if temporal:
                    extents.update(
                        {
                            "temporal": [
                                {
                                    "begin": temporal.get("start"),
                                    "end": temporal.get("end"),
                                }
                            ]
                        }
                    )

            if extents:
                identification.update({"extents": extents})

            metadata.update({"identification": identification})

            contact_tree = root.find("contact")
            if contact_tree:
                address_tree = contact_tree.find("contactAddress")
                contact = {
                    "name": _get_item_text_or_none(contact_tree, "name"),
                    "organization": _get_item_text_or_none(
                        contact_tree, "organization"
                    ),
                    "position": _get_item_text_or_none(contact_tree, "position"),
                    "voice": _get_item_text_or_none(contact_tree, "voice"),
                    "fax": _get_item_text_or_none(contact_tree, "fax"),
                    "email": _get_item_text_or_none(contact_tree, "email"),
                    "role": _get_item_text_or_none(contact_tree, "role"),
                    "city": _get_item_text_or_none(address_tree, "city"),
                    "address": _get_item_text_or_none(address_tree, "address"),
                    "postalcode": _get_item_text_or_none(address_tree, "postalcode"),
                    "country": _get_item_text_or_none(address_tree, "country"),
                }
                metadata.update({"contact": contact})

            links = root.find("links")
            distribution = {}
            if links:
                for link in links.iter():
                    if link.get("name"):
                        distribution.update({link.get("name"): link.attrib})
            if distribution:
                metadata.update({"distribution": distribution})

            crs_tree = root.find("crs")
            spatialrefsys_tree = crs_tree.find("spatialrefsys") if crs_tree else None
            if spatialrefsys_tree:
                spatial_ref = {
                    element.tag: element.text for element in spatialrefsys_tree.iter()
                }
                metadata.update({"crs": {"spatialrefsys": spatial_ref}})  # type: ignore

            return metadata
        except Exception:
            logger.warning(
                f"Failed to parse {metadata_file.name} with QMD schema.",
                exc_info=True,
            )

    return None


def parse_xml_metadata(metadata_file: Path) -> Optional[Dict[str, Any]]:
    with metadata_file.open() as f:
        for schema in SCHEMAS.keys():
            try:
                schema_object = load_schema(schema)
                metadata = schema_object.import_(f.read())
                if metadata:
                    metadata.pop("mcf")
                return metadata
            except Exception:
                logger.warning(
                    f"Failed to parse {metadata_file.name} with {schema}.",
                    exc_info=True,
                )

    return None


def parse_file_metadata(metadata_file: Path) -> Optional[Dict[str, Any]]:
    match metadata_file.suffix:
        case ".qmd":
            metadata = parse_qmd_metadata(metadata_file)
        case _:
            metadata = parse_xml_metadata(metadata_file)

    return metadata


def get_and_parse_datalayer_file_metadata(file_path: Path) -> Optional[Dict[str, Any]]:
    for ext in [".xml", ".aux.xml", ".qmd"]:
        metadata_file = file_path.with_suffix(ext)
        if metadata_file.exists():
            logger.info(f"Found metadata file {metadata_file.name}.")
            return parse_file_metadata(metadata_file)

    logger.warning(f"No metadata file found for {file_path.name}.")
    return None
