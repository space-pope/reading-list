FROM python:3.13-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml ./
RUN if [ -f uv.lock ]; then uv sync --frozen --no-dev; else pip install --no-cache-dir -e .; fi

COPY reading_list/ reading_list/

ENV READING_LIST_DB_PATH=/data/db.sqlite
ENV READING_LIST_HOST=0.0.0.0
ENV READING_LIST_PORT=3000

RUN mkdir -p /data

EXPOSE 3000

CMD ["python", "-m", "reading_list.main"]
