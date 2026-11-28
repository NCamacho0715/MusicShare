import json
from typing import Any, Dict, Optional
from urllib.parse import urlparse, urlunparse
from shared.aws_clients import get_sqs_client
from shared.config import Config


class SQSService:
    def __init__(self, queue_url: Optional[str] = None):
        self.sqs_client = get_sqs_client()
        self.queue_url = self._normalize_queue_url(queue_url or Config.get_danos_queue_url())

    def _normalize_queue_url(self, q_url: str) -> str:
        if not q_url:
            return ""
        endpoint = Config.get_aws_endpoint_url()
        if endpoint:
            parsed_q = urlparse(q_url)
            parsed_e = urlparse(endpoint)
            if (
                parsed_q.hostname in ("localhost", "127.0.0.1")
                and parsed_e.hostname
                and parsed_e.hostname not in ("localhost", "127.0.0.1")
            ):
                return urlunparse(
                    parsed_q._replace(scheme=parsed_e.scheme, netloc=parsed_e.netloc)
                )
        return q_url

    def _get_queue_url(self) -> str:
        if self.queue_url:
            return self.queue_url
        # Attempt resolving by queue name if URL was not injected
        try:
            res = self.sqs_client.get_queue_url(QueueName="musicshare-danos-queue")
            self.queue_url = self._normalize_queue_url(res.get("QueueUrl", ""))
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
