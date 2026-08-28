# works with both python 2 and 3
from __future__ import print_function

import os
import ssl
import requests.adapters

# The Africa's Talking API server requires legacy TLS renegotiation.
# OpenSSL 3.0+ disables this by default, causing:
#   SSLError: [SSL: WRONG_VERSION_NUMBER] wrong version number
_orig_init_poolmanager = requests.adapters.HTTPAdapter.init_poolmanager


def _init_poolmanager_with_legacy_renegotiation(self, *args, **kwargs):
    ctx = ssl.create_default_context()
    ctx.options |= ssl.OP_LEGACY_SERVER_CONNECT
    kwargs["ssl_context"] = ctx
    return _orig_init_poolmanager(self, *args, **kwargs)


requests.adapters.HTTPAdapter.init_poolmanager = _init_poolmanager_with_legacy_renegotiation

import africastalking


class SMS:
    def __init__(self, username, api_key):
        self.username = username
        self.api_key = api_key
        africastalking.initialize(self.username, self.api_key)
        self.sms = africastalking.SMS

    def send_custom(self, recipients_with_names, message_template, sender=None):
        """
        recipients_with_names: list of dicts with keys "name", "phone"
        message_template: string containing a "{name}" placeholder
        """
        for r in recipients_with_names:
            message = message_template.format(name=r["name"])
            try:
                if sender:
                    response = self.sms.send(message, [r["phone"]], sender)
                else:
                    response = self.sms.send(message, [r["phone"]])
                print(response)
            except Exception as e:
                print('Encountered an error while sending to %s: %s' % (r["phone"], str(e)))


if __name__ == '__main__':
    username = os.environ.get("AT_USERNAME")
    api_key = os.environ.get("AT_API_KEY")

    if not username or not api_key:
        raise RuntimeError(
            "Set AT_USERNAME and AT_API_KEY environment variables before running this script."
        )

    recipients = [
        {"name": "Andrew", "phone": "+254701922375"},
        {"name": "Stanley", "phone": "+254727230675"},
    ]

    message_template = (
        "Hello {name}, every single day is a new chance to move closer to the "
        "life you truly want. Motivation is not something you wait for; it is "
        "something you build through small, consistent actions. When you feel "
        "tired or unsure, remember why you started, and let that reason carry "
        "you one more step forward. Success is rarely a straight line, it is "
        "made of ordinary days handled with discipline, patience, and belief "
        "in yourself even when results are not yet visible. Do not compare your "
        "chapter one to someone else's chapter twenty; focus only on becoming a "
        "little better than you were yesterday. Wake up with purpose, work with "
        "focus, and rest with gratitude. Every challenge you are facing right "
        "now is shaping the strength you will need for what is coming next, so "
        "keep going, {name}, your effort today is building your tomorrow."
    )

    SMS(username, api_key).send_custom(recipients, message_template)
