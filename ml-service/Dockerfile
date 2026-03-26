FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=6001 \
    FASHION_ML_ROOT=/app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -r /app/requirements.txt

COPY src /app/src
COPY app.py /app/app.py

EXPOSE 6001

CMD ["python", "app.py"]
