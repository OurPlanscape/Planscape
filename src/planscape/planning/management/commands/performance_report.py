import os
from datetime import date
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandParser
from django.db import connection
from planscape import settings
from utils.string_utils import snake_to_capitals


class Command(BaseCommand):
    help = "Runs some SQL reports about performance and either emails them or outputs to stdout"

    message_text = ""
    emailing = False
    recipient = None

    query_folder = "planning/report_queries/"

    def process_queries(self):
        query_path = os.path.join(settings.BASE_DIR, self.query_folder)
        files = os.listdir(query_path)
        for f in files:
            self.output_report(f)

    def output_report(self, query_file):
        title = snake_to_capitals(query_file)
        query_path = os.path.join(settings.BASE_DIR, self.query_folder, query_file)
        # Check if query file exists
        if not os.path.isfile(query_path):
            self.stderr.write(f"Error: File not found: {query_path}")
            return
        try:
            with open(query_path, "r", encoding="UTF-8") as f:
                sql = f.read()
        except OSError as e:
            self.stderr.write(f"Error opening file: {e}")

        self.write(f"\n\n{title}\n")

        with connection.cursor() as cursor:
            try:
                cursor.execute(sql)
                rows = cursor.fetchall()
                column_descriptions = cursor.description

                if rows:
                    # Get header names and maximum widths
                    headers = [desc[0] for desc in column_descriptions]
                    max_widths = [
                        max(len(str(row[i])) for row in rows)
                        for i in range(len(headers))
                    ]

                    for i, header in enumerate(headers):
                        max_widths[i] = max(max_widths[i] or 0, len(header))

                    # Format headers and rows based on max widths found
                    formatted_headers = "  ".join(
                        header.ljust(width)
                        for header, width in zip(headers, max_widths)
                    )
                    self.write(formatted_headers)

                    for row in rows:
                        formatted_row = "  ".join(
                            str(value).ljust(width)
                            for value, width in zip(row, max_widths)
                        )
                        self.write(formatted_row)
                else:
                    self.write("** No rows **")

            except Exception as e:
                self.stderr.write("Error executing SQL: {}".format(e))
                self.write("** Error executing this query. **")

    def write(self, output):
        if self.emailing:
            self.message_text += output + "\n"
        else:
            self.stdout.write(output)

    def send_email(self):
        subject = f"Data report for {date.today()}"
        sender_email = settings.DEFAULT_FROM_EMAIL
        recipient_email = settings.REPORT_RECIPIENT_EMAIL
        # if we explicitly set a recipient, we override the default
        if self.recipient:
            recipient_email = self.recipient

        if recipient_email:
            try:
                send_mail(
                    subject,
                    self.message_text,
                    sender_email,  # Sender email
                    [recipient_email],  # Recipient email(s)
                )
            except Exception as e:
                self.stderr.write("Email sending exception: {}", format(e))
        else:
            self.stderr.write("No recipient email designated. Refusing to send email.")

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--send-email",
            default=False,
            action="store_true",
            help="If missing, the command just outputs the report to std out.",
        )
        parser.add_argument(
            "--recipient",
            nargs="?",
            type=str,
            help="Email address for report recipient",
        )

    def handle(self, *args, **options):
        if options.get("send_email"):
            self.emailing = True
            self.message_text = ""

        if options.get("recipient"):
            self.recipient = options.get("recipient") or None

        self.process_queries()

        if self.emailing:
            self.send_email()
