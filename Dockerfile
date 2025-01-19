FROM python:3.13

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY docker-entrypoint.sh .

COPY scripts scripts 

COPY app app

ENTRYPOINT ["./docker-entrypoint.sh"]