#!/bin/bash

# We want these to run in parallel
docker build -t securevision-api:latest . & \
    docker build -t securevision-client:latest frontend-test
docker build -f Dockerfile.data-worker -t securevision-data-worker:latest .
dotenv run terraform -chdir=terraform fmt
dotenv run terraform -chdir=terraform validate && \
    dotenv run terraform -chdir=terraform plan && \
    dotenv run terraform -chdir=terraform apply
docker logs -f securevision_data_worker_0