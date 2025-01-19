FROM python:3.13

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY docker-entrypoint.sh .

COPY app_test app_test

ENTRYPOINT ["./docker-entrypoint.sh"]