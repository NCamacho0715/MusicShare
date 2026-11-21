import boto3
from shared.config import Config

def get_boto3_client(service_name: str):
    kwargs = {"region_name": Config.AWS_REGION}
    if Config.AWS_ENDPOINT_URL:
        kwargs["endpoint_url"] = Config.AWS_ENDPOINT_URL
        kwargs["aws_access_key_id"] = "test"
        kwargs["aws_secret_access_key"] = "test"
    return boto3.client(service_name, **kwargs)

def get_boto3_resource(service_name: str):
    kwargs = {"region_name": Config.AWS_REGION}
    if Config.AWS_ENDPOINT_URL:
        kwargs["endpoint_url"] = Config.AWS_ENDPOINT_URL
        kwargs["aws_access_key_id"] = "test"
        kwargs["aws_secret_access_key"] = "test"
    return boto3.resource(service_name, **kwargs)

def get_dynamodb_resource():
    return get_boto3_resource("dynamodb")

def get_s3_client():
    return get_boto3_client("s3")

def get_sqs_client():
    return get_boto3_client("sqs")

def get_sns_client():
    return get_boto3_client("sns")
