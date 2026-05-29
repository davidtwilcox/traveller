FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
COPY src/ src/
RUN pip install --no-cache-dir -e .

COPY web/api/requirements.txt web/api/
RUN pip install --no-cache-dir -r web/api/requirements.txt

COPY web/api/ web/api/

WORKDIR /app/web/api

EXPOSE 5000

CMD ["flask", "run", "--host=0.0.0.0"]
