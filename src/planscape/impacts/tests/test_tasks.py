from unittest import mock
from django.test import TransactionTestCase
from impacts.tests.factories import TreatmentPlanFactory
from impacts.tasks import async_send_email_process_finished


class AsyncSendEmailProcessFinishedTest(TransactionTestCase):
    def setUp(self):
        self.treatment_plan = TreatmentPlanFactory.create()
        self.user = self.treatment_plan.created_by

    @mock.patch("impacts.tasks.send_mail", return_value=True)
    def test_trigger_email(self, send_email_mock):
        async_send_email_process_finished(
            treatment_plan_pk=self.treatment_plan.pk,
        )
        self.assertTrue(send_email_mock.called)

        send_email_mock.assert_called_once_with(
            subject="Planscape Treatment Plan is completed",
            from_email=mock.ANY,
            recipient_list=[self.user.email],
            message=mock.ANY,
            html_message=mock.ANY,
        )

    @mock.patch("impacts.tasks.send_mail", return_value=True)
    def test_trigger_email__set_status_failed(self, send_email_mock):
        async_send_email_process_finished(
            treatment_plan_pk=self.treatment_plan.pk,
        )
        self.assertFalse(send_email_mock.called)
