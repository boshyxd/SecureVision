#!/bin/bash

# We want these to run in parallel
docker build -t securevision-api:latest . & \
    docker build -t securevision-client:latest frontend-test
dotenv run terraform -chdir=terraform fmt
dotenv run terraform -chdir=terraform validate && \
    dotenv run terraform -chdir=terraform plan && \
    dotenv run terraform -chdir=terraform apply
docker logs -f securevision_api & \
    docker logs -f securevision_client