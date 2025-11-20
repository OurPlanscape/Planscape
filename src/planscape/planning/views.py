import json
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
    SharedLink,
)
from planning.serializers import (
    PlanningAreaNoteListSerializer,
    PlanningAreaNoteSerializer,
    SharedLinkSerializer,
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


# TODO: add more things to update other than state
# Unlike other routines, this does not require a user login context, as it is expected to be called
# by the EP.
#
# TODO: require credential from EP so that random people cannot call this endpoint.
@api_view(["GET", "POST"])
def update_scenario_result(request: Request) -> Response:
    """
    Updates a ScenarioResult's status.
    Requires a logged in user, as a scenario must be associated with a user's planning area.
    Throws an error if no scenario/ScenarioResult owned by the user can be found with the desired ID.
    This does not modify the Scenario object itself.
    A ScenarioResult's status can be updated only in the following directions:
       PENDING -> RUNNING | FAILURE
       RUNNING -> SUCCESS | FAILURE

    Returns: id: the ID of the Scenario whose ScenarioResult was updated.

    Required params:
      scenario_id (int): The scenario ID whose ScenarioResult is meant to be updated.

    Optional params:
      status (ScenarioResultStatus): The new status of the ScenarioResult.
      result (JSON str): Details of the run.
      run_details (JSON str): Even more verbose details of the run.
    """
    try:
        body = json.loads(request.body)
        scenario_id = body.get("scenario_id")

        scenario_result = ScenarioResult.objects.get(scenario__id=scenario_id)

        new_status = body.get("status")
        old_status = scenario_result.status

        if new_status is not None:
            match new_status:
                case ScenarioResultStatus.RUNNING:
                    if old_status != ScenarioResultStatus.PENDING:
                        return Response(
                            {"error": "Invalid new state."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                case ScenarioResultStatus.SUCCESS:
                    if old_status != ScenarioResultStatus.RUNNING:
                        return Response(
                            {"error": "Invalid new state."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                case _:
                    if new_status != ScenarioResultStatus.FAILURE:
                        return Response(
                            {"error": "Invalid new state."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
            scenario_result.status = new_status

        if (run_details := body.get("run_details")) is not None:
            scenario_result.run_details = run_details

        if (result := body.get("result")) is not None:
            scenario_result.result = result

        scenario_result.save()

        return Response({"id": scenario_id}, content_type="application/json")
    except ScenarioResult.DoesNotExist:
        return Response(
            {"error": "Scenario result matching query does not exist."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error("Error updating scenario result: %s", e)
        raise


#### SHARED LINK Handlers ####
@api_view(["GET"])
def get_shared_link(request: Request, link_code: str) -> Response:
    try:
        link_obj = SharedLink.objects.get(link_code=link_code)
    except SharedLink.DoesNotExist:
        # Handle the case where the object doesn't exist
        return Response(
            {"error": "This link does not exist"}, status=status.HTTP_404_NOT_FOUND
        )
    serializer = SharedLinkSerializer(link_obj)
    return Response(serializer.data, content_type="application/json")


@api_view(["POST"])
def create_shared_link(request: Request) -> Response:
    try:
        user = request.user

        body = json.loads(request.body)
        serializer = SharedLinkSerializer(data=body, context={"user": user})
        serializer.is_valid(raise_exception=True)
        shared_link = serializer.save()

        serializer = SharedLinkSerializer(shared_link)
        return Response(serializer.data, content_type="application/json")

    except Exception as e:
        logger.error("Error creating shared link: %s", e)
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
