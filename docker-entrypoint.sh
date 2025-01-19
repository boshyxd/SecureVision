#!/bin/bash

echo "Waiting for MySQL to be available..."
sleep 10

python scripts/init_db.py
uvicorn app.main:app --host 0.0.0.0 --reload
