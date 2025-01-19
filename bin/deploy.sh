#!/bin/bash

set -euxo pipefail

docker build -t securevision-api:latest .
docker build -t securevision-client:latest frontend/secure-vision
docker build -f Dockerfile.data-worker -t securevision-data-worker:latest .
dotenv run terraform -chdir=terraform fmt
dotenv run terraform -chdir=terraform validate && \
    dotenv run terraform -chdir=terraform plan && \
    dotenv run terraform -chdir=terraform apply
docker logs -f securevision_api > app_logs/api.log & \
    docker logs -f securevision_client > app_logs/client.log
