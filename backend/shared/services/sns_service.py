import json
from typing import Any, Dict, Optional
from shared.aws_clients import get_sns_client
from shared.config import Config

class SNSService:
    def __init__(self, topic_arn: Optional[str] = None):
        self.sns_client = get_sns_client()
        self.topic_arn = topic_arn or Config.NOTIFICACIONES_TOPIC_ARN

    def _get_topic_arn(self) -> str:
        if self.topic_arn:
            return self.topic_arn
        try:
            res = self.sns_client.list_topics()
            for topic in res.get("Topics", []):
                arn = topic.get("TopicArn", "")
                if "musicshare-notificaciones" in arn:
                    self.topic_arn = arn
                    return arn
            return ""
        except Exception:
            return ""

    def publish_notification(self, subject: str, message_data: Dict[str, Any], tipo_evento: str) -> Optional[str]:
        t_arn = self._get_topic_arn()
        if not t_arn:
            return None
        res = self.sns_client.publish(
            TopicArn=t_arn,
            Subject=subject,
            Message=json.dumps(message_data),
            MessageAttributes={
                "tipo_evento": {
                    "DataType": "String",
                    "StringValue": tipo_evento
                }
            }
        )
        return res.get("MessageId")
