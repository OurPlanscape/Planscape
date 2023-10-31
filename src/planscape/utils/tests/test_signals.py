from django.test import TestCase
from utils.signals import SignalHandler
from signal import SIGINT


class TestSignalHandler(TestCase):
    def test_init_returns_instance(self):
        handler = SignalHandler(signals=[SIGINT])
        self.assertIsNotNone(handler)
        self.assertEquals(handler.watching_signals, [SIGINT])
        self.assertIsNone(handler.caught_signal)

    def test_handle_sets_caught_signal(self):
        handler = SignalHandler(signals=[SIGINT])
        handler.handle(signal="foo", frame=None)
        self.assertIsNotNone(handler.caught_signal)
        self.assertTrue(handler.should_break)
