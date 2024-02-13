import os
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Runs some SQL reports about performance"

    query_folder = "planning/report_queries/"
    reports = [
        {
            "name": "Result Times by Stand Size",
            "query_file": "result_time_by_stand_size.sql",
        },
        {"name": "Result Times by Acreage", "query_file": "result_time_by_acreage.sql"},
    ]

    def output_report(self, report):
        query_path = os.path.join(
            settings.BASE_DIR, self.query_folder, report["query_file"]
        )
        # Check if file exists
        if not os.path.isfile(query_path):
            self.stderr.write("Error: File not found: {}".format(query_path))
            return

        # Open and read the file
        try:
            with open(query_path, "r", encoding="UTF-8") as f:
                sql = f.read()
        except OSError as e:
            self.stderr.write("Error opening file: {}".format(e))

        self.stdout.write(f"\n\n{report['name']}\n")
        # Execute the SQL query

        with connection.cursor() as cursor:
            try:
                cursor.execute(sql)
                rows = cursor.fetchall()
                column_descriptions = cursor.description

                # Get header names and maximum widths
                headers = [desc[0] for desc in column_descriptions]
                max_widths = [
                    max(len(str(row[i])) for row in rows) for i in range(len(headers))
                ]
                for i, header in enumerate(headers):
                    max_widths[i] = max(max_widths[i], len(header))

                # Format headers and rows
                formatted_headers = "  ".join(
                    header.ljust(width) for header, width in zip(headers, max_widths)
                )
                print(formatted_headers)

                for row in rows:
                    formatted_row = "  ".join(
                        str(value).ljust(width) for value, width in zip(row, max_widths)
                    )
                    print(formatted_row)

            except Exception as e:
                self.stderr.write("Error executing SQL: {}".format(e))

    def handle(self, *args, **options):
        for report in self.reports:
            self.output_report(report)
