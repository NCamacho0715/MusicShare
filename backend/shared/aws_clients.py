import boto3
from botocore.config import Config as BotoConfig
from shared.config import Config


def get_boto3_client(service_name: str, **extra_kwargs):
    kwargs = {"region_name": Config.get_aws_region()}
    endpoint_url = Config.get_aws_endpoint_url()
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
        kwargs["aws_access_key_id"] = "test"
        kwargs["aws_secret_access_key"] = "test"
    kwargs.update(extra_kwargs)
    return boto3.client(service_name, **kwargs)


def get_boto3_resource(service_name: str):
    kwargs = {"region_name": Config.get_aws_region()}
    endpoint_url = Config.get_aws_endpoint_url()
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
        kwargs["aws_access_key_id"] = "test"
        kwargs["aws_secret_access_key"] = "test"
    return boto3.resource(service_name, **kwargs)


def get_dynamodb_resource():
    return get_boto3_resource("dynamodb")


def get_s3_client():
    endpoint_url = Config.get_aws_endpoint_url()
    if endpoint_url:
        return get_boto3_client(
            "s3",
            config=BotoConfig(s3={"addressing_style": "path"}, signature_version="s3v4"),
        )
    return get_boto3_client("s3")


def get_s3_presign_client():
    kwargs = {"region_name": Config.get_aws_region()}
    public_endpoint = Config.get_public_s3_endpoint_url()
    if public_endpoint:
        kwargs["endpoint_url"] = public_endpoint
        kwargs["aws_access_key_id"] = "test"
        kwargs["aws_secret_access_key"] = "test"
        kwargs["config"] = BotoConfig(
            s3={"addressing_style": "path"},
            signature_version="s3v4",
        )
    return boto3.client("s3", **kwargs)


def get_sqs_client():
    return get_boto3_client("sqs")


def get_sns_client():
    return get_boto3_client("sns")
