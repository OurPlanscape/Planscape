from unittest import mock
from django.test import TransactionTestCase
from impacts.models import TreatmentPlanStatus
from impacts.tests.factories import TreatmentPlanFactory
from impacts.tasks import async_set_status, async_send_email_process_finished


class AsyncSendEmailProcessFinishedTest(TransactionTestCase):
    def setUp(self):
        self.treatment_plan = TreatmentPlanFactory.create()
        self.user = self.treatment_plan.created_by

    @mock.patch("impacts.tasks.send_mail", return_value=True)
    def test_trigger_email(self, send_email_mock):
        async_send_email_process_finished(treatment_plan_pk=self.treatment_plan.pk)
        self.assertTrue(send_email_mock.called)

        send_email_mock.assert_called_once_with(
            subject="Planscape Treatment Plan is completed",
            from_email=mock.ANY,
            recipient_list=[self.user.email],
            message=mock.ANY,
        )

    @mock.patch(
        "impacts.tasks.async_send_email_process_finished.delay", return_value=None
    )
    def test_async_send_email_task_triggered_when_end_state(self, async_task_mock):
        async_set_status(
            treatment_plan_pk=self.treatment_plan.pk,
            status=TreatmentPlanStatus.SUCCESS,
        )
        self.assertTrue(async_task_mock.called)

        async_task_mock.assert_called_once_with(
            treatment_plan_pk=self.treatment_plan.pk
        )

    @mock.patch(
        "impacts.tasks.async_send_email_process_finished.delay", return_value=None
    )
    def test_async_send_email_task_not_triggered_when_not_end_state(
        self, async_task_mock
    ):
        async_set_status(
            treatment_plan_pk=self.treatment_plan.pk,
            status=TreatmentPlanStatus.RUNNING,
        )
        self.assertFalse(async_task_mock.called)
