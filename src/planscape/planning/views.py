import logging

from collaboration.permissions import (
    PlanningAreaNotePermission,
    PlanningAreaPermission,
    ScenarioPermission,
)
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from planning.models import (
    PlanningArea,
    PlanningAreaNote,
    Scenario,
    ScenarioResult,
    ScenarioResultStatus,
)
from planning.serializers import (
    ListPlanningAreaSerializer,
    PlanningAreaNoteListSerializer,
    PlanningAreaNoteSerializer,
    ValidatePlanningAreaOutputSerializer,
    ValidatePlanningAreaSerializer,
)
from planning.services import (
    export_to_shapefile,
    get_acreage,
    zip_directory,
)

logger = logging.getLogger(__name__)


@api_view(["POST"])
def validate_planning_area(request: Request) -> Response:
    serializer = ValidatePlanningAreaSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    geometry = serializer.validated_data.get("geometry")
    data = {"area_acres": get_acreage(geometry)}
    out_serializer = ValidatePlanningAreaOutputSerializer(instance=data)
    return Response(out_serializer.data)


# No Params expected, since we're always using the logged in user.
@api_view(["GET"])
def list_planning_areas(request: Request) -> Response:
    """
    Retrieves all planning areas for a user.
    Requires a logged in user.  Users can see only their owned planning_areas.

    Returns: A list of planning areas in JSON form.  Each planning area JSON will also include
        two metadata fields:
      scenario_count: number of scenarios for the planning area returned.
      latest_updated: latest datetime (e.g. 2023-09-08T20:33:28.090393Z) across all scenarios or
        PlanningArea updated_at if no scenarios

    Required params: none
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        planning_areas = PlanningArea.objects.list_for_api(user).order_by(
            "-latest_updated"
        )
        serializer = ListPlanningAreaSerializer(
            instance=planning_areas, many=True, context={"request": request}
        )
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error: Failed to list planning areas: {e}")
        raise


@api_view(["GET"])
def download_csv(request: Request) -> HttpResponse:
    """
    Generates a new Zip file for a scenario based on ID.

    Requires a logged in user.  Users can only access a scenarios belonging to their own planning areas.

    Returns: a Zip file generated with the CSVs ad JSON file for this particular scenario

    Required params:
      id (int): The scenario ID to be retrieved.
    """
    # Ensure that the user is logged in.
    user = request.user
    if not user.is_authenticated:
        return Response(
            {"error": "Authentication Required"}, status=status.HTTP_401_UNAUTHORIZED
        )
    if "id" not in request.GET:
        return Response(
            {"error": "Missing required parameter 'id'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        scenario = Scenario.objects.get(id=request.GET["id"])

        # Ensure that current user is associated with this scenario
        if not ScenarioPermission.can_view(user, scenario):
            return Response(
                "Scenario matching query does not exist.",
                status=status.HTTP_403_FORBIDDEN,
            )

        output_zip_name: str = str(scenario.uuid) + ".zip"

        if not scenario.get_forsys_folder().exists():
            return Response(
                {"error": "Scenario files cannot be read."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = HttpResponse(content_type="application/zip")
        zip_directory(response, scenario.get_forsys_folder())

        response["Content-Disposition"] = f"attachment; filename={output_zip_name}"
        return response

    except Scenario.DoesNotExist:
        return Response(
            {"error": "Scenario matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.exception(f"Error: {e}")
        raise


@api_view(["GET"])
def download_shapefile(request: Request) -> Response:
    """
    Generates a new Zip file of the shapefile for a scenario based on ID.

    Requires a logged in user.  Users can only access a scenarios belonging to their own planning areas.

    Returns: a Zip file generated with the shapefiles

    Required params:
      id (int): The scenario ID to be retrieved.
    """
    # Ensure that the user is logged in.
    user = request.user
    if not user.is_authenticated:
        return Response(
            {"error": "Authentication Required"}, status=status.HTTP_401_UNAUTHORIZED
        )

    if "id" not in request.GET:
        return Response(
            {"error": "Missing required parameter 'id'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        scenario = Scenario.objects.get(id=request.GET["id"])
        # Ensure that current user is associated with this scenario
        if not ScenarioPermission.can_view(user, scenario):
            return Response(
                {"error": "User has no permission to view scenario"},
                status=status.HTTP_403_FORBIDDEN,
            )

        scenario_result = ScenarioResult.objects.get(scenario__id=scenario.pk)
        if scenario_result.status != ScenarioResultStatus.SUCCESS:
            return Response(
                "Scenario was not successful, can't download data.",
                status=status.HTTP_424_FAILED_DEPENDENCY,
            )

        output_zip_name = f"{str(scenario.uuid)}.zip"
        export_to_shapefile(scenario)
        response = HttpResponse(content_type="application/zip")
        zip_directory(response, scenario.get_shapefile_folder())

        response["Content-Disposition"] = f"attachment; filename={output_zip_name}"
        return response
    except Scenario.DoesNotExist:
        return Response(
            {"error": "Scenario matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except ScenarioResult.DoesNotExist:
        return Response(
            {"error": "Scenario result matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error("Error in downloading shapefile %s", e)
        raise


class PlanningAreaNotes(APIView):
    def post(self, request: Request, planningarea_pk: int):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        note_data = request.data.copy()
        note_data["planning_area"] = planningarea_pk

        try:
            serializer = PlanningAreaNoteSerializer(
                data=note_data, context={"user": user}
            )
            serializer.is_valid(raise_exception=True)

            if not PlanningAreaNotePermission.can_add(
                user, PlanningAreaNote(**serializer.validated_data)
            ):
                return Response(
                    {"error": "Authentication Required"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            new_note = serializer.save()
            out_serializer = PlanningAreaNoteSerializer(new_note)
            return Response(
                out_serializer.data,
                content_type="application/json",
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.error("Error creating PlanningAreaNote: %s", e)
            raise

    def get(
        self, request: Request, planningarea_pk: int, planningareanote_pk: int = None
    ):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            if planningareanote_pk:
                planningareanote = PlanningAreaNote.objects.get(
                    id=planningareanote_pk, planning_area=planningarea_pk
                )
                if not PlanningAreaNotePermission.can_view(user, planningareanote):
                    return Response(status=status.HTTP_403_FORBIDDEN)
                serializer = PlanningAreaNoteListSerializer(
                    instance=planningareanote,
                    many=False,
                    context={"request": request, "user": user},
                )
                return Response(serializer.data)

            else:
                planningarea = PlanningArea.objects.get(id=planningarea_pk)
                # Note: all of the notes in this query will have the same PlanningArea, so for now,
                #  having view access to the PlanningArea means a viewer can see the notes,
                if not PlanningAreaPermission.can_view(user, planningarea):
                    return Response(status=status.HTTP_403_FORBIDDEN)

                notes = PlanningAreaNote.objects.filter(
                    planning_area=planningarea_pk
                ).order_by("-created_at")
                serializer = PlanningAreaNoteListSerializer(
                    instance=notes,
                    many=True,
                    context={"request": request, "user": user},
                )
                return Response(serializer.data)

        except PlanningArea.DoesNotExist as pa_dne:
            logger.error("Error getting notes for planning area: %s", pa_dne)
            return Response(
                {"message": "Planning area with this id could not be found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except PlanningAreaNote.DoesNotExist as pan_dne:
            logger.error("Error getting notes for planning area: %s", pan_dne)
            return Response(
                {"message": "Planning area note could not be found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            logger.error("Error getting notes for planning area: %s", e)
            raise

    def delete(self, request: Request, planningarea_pk: int, planningareanote_pk: int):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            note = get_object_or_404(PlanningAreaNote, pk=planningareanote_pk)

            if not PlanningAreaNotePermission.can_remove(user, note):
                return Response(
                    {"error": "User does not have access to delete this note."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if note.delete():
                return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.error("Exception deleting planning area note: %s", e)
            raise
