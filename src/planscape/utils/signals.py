import signal


class SignalHandler:
    """
    Simple class to capture keyboard signals
    and treat them accordingly.
    """

    def __init__(self, signals):
        self.caught_signal = None
        self.watching_signals = signals
        for s in self.watching_signals:
            signal.signal(s, self.handle)

    def handle(self, signal, _frame):
        self.caught_signal = signal

    @property
    def should_break(self):
        """Has logic to determine if we should break
        the execution based on a list of signals
        that can be caught from operating-system.

        In production, this list is likely to grow.

        :return: a boolean.
        :rtype: bool
        """
        return self.caught_signal is not None
