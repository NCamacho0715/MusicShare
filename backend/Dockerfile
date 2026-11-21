FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Terraform
ARG TERRAFORM_VERSION=1.7.5
RUN curl -fsSL https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip -o tf.zip \
    && unzip tf.zip -d /usr/local/bin \
    && rm tf.zip

COPY pyproject.toml .
RUN pip install --no-cache-dir .[dev]

COPY . .

CMD ["pytest", "tests/unit"]
