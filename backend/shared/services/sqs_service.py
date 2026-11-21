import json
from typing import Any, Dict, Optional
from shared.aws_clients import get_sqs_client
from shared.config import Config

class SQSService:
    def __init__(self, queue_url: Optional[str] = None):
        self.sqs_client = get_sqs_client()
        self.queue_url = queue_url or Config.DANOS_QUEUE_URL

    def _get_queue_url(self) -> str:
        if self.queue_url:
            return self.queue_url
        # Attempt resolving by queue name if URL was not injected
        try:
            res = self.sqs_client.get_queue_url(QueueName="musicshare-danos-queue")
            self.queue_url = res.get("QueueUrl", "")
            return self.queue_url
        except Exception:
            return ""

    def send_damage_event(self, event_payload: Dict[str, Any]) -> Optional[str]:
        q_url = self._get_queue_url()
        if not q_url:
            return None
        res = self.sqs_client.send_message(
            QueueUrl=q_url,
            MessageBody=json.dumps(event_payload)
        )
        return res.get("MessageId")
