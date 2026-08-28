# works with both python 2 and 3
from __future__ import print_function

import os
import ssl
import requests.adapters

# The Africa's Talking sandbox API server requires legacy TLS renegotiation.
# OpenSSL 3.0+ disables this by default, causing:
#   SSLError: [SSL: WRONG_VERSION_NUMBER] wrong version number
# Patch the default HTTPAdapter to re-enable it for all `requests` calls
# (the africastalking SDK uses `requests` internally).
_orig_init_poolmanager = requests.adapters.HTTPAdapter.init_poolmanager


def _init_poolmanager_with_legacy_renegotiation(self, *args, **kwargs):
    ctx = ssl.create_default_context()
    ctx.options |= ssl.OP_LEGACY_SERVER_CONNECT
    kwargs["ssl_context"] = ctx
    return _orig_init_poolmanager(self, *args, **kwargs)


requests.adapters.HTTPAdapter.init_poolmanager = _init_poolmanager_with_legacy_renegotiation

import africastalking


class SMS:
    def __init__(self):
        # Sandbox credentials
        self.username = "sandbox"
        # Set the API key as an environment variable before running:
        #   PowerShell:  $env:AT_API_KEY="your_sandbox_api_key"
        #   cmd.exe:     set AT_API_KEY=your_sandbox_api_key
        self.api_key = os.environ.get("AT_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "AT_API_KEY environment variable is not set. "
                "Set it to your sandbox API key before running this script."
            )

        # Initialize the SDK
        africastalking.initialize(self.username, self.api_key)

        # Get the SMS service
        self.sms = africastalking.SMS

    MESSAGE_TEMPLATE = (
        "Dear {name}, this is a reminder that classes resume on {class_date}. "
        "Kindly note that you have an outstanding fee balance of KES {balance}. "
        "Please clear it before the deadline to avoid disruption. Thank you."
    )

    def build_message(self, name, class_date, balance):
        return self.MESSAGE_TEMPLATE.format(name=name, class_date=class_date, balance=balance)

    def send_to_students(self, students):
        """
        students: list of dicts, each with keys:
            name        - student's name
            phone       - phone number in international format, e.g. "+254712345678"
            class_date  - e.g. "Monday, 1st September"
            balance     - outstanding fee amount, e.g. "5,000"
        """
        # In sandbox mode you can omit the sender / use the default test sender
        sender = None

        for student in students:
            message = self.build_message(
                student["name"], student["class_date"], student["balance"]
            )
            recipients = [student["phone"]]
            try:
                if sender:
                    response = self.sms.send(message, recipients, sender)
                else:
                    response = self.sms.send(message, recipients)
                print(response)
            except Exception as e:
                print('Encountered an error while sending to %s: %s' % (student["phone"], str(e)))


if __name__ == '__main__':
    # Sample list of students who haven't cleared fees.
    # Replace with real data (e.g. loaded from a CSV/database).
    students_with_pending_fees = [
        {
            "name": "John Doe",
            "phone": "+254712345678",
            "class_date": "Monday, 1st September",
            "balance": "5,000",
        },
    ]

    SMS().send_to_students(students_with_pending_fees)
