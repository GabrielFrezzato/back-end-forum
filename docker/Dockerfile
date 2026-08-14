# QUADRO — imagem do backend Flask (também serve o frontend estático)
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY frontend/ frontend/
COPY database/ database/
COPY config/ config/
COPY docker/entrypoint.sh entrypoint.sh

ENV FLASK_APP=backend/app.py
RUN chmod +x entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
