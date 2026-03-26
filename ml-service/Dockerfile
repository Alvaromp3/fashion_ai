FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=6001 \
    FASHION_ML_ROOT=/app \
    ML_VIT_PATH=/app/models/best_model_17_marzo.keras

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -r /app/requirements.txt

COPY src /app/src
COPY app.py /app/app.py
# Before deployment, place best_model_17_marzo.keras in ml-service/models/
COPY models /app/models

EXPOSE 6001

CMD ["python", "app.py"]
