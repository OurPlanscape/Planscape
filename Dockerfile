FROM ghcr.io/astral-sh/uv:latest AS builder

FROM python:3.10-slim-bookworm
COPY --from=builder /uv /uvx /bin/

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV UV_PROJECT_ENVIRONMENT=/opt/virtualenvs/
ENV UV_LINK_MODE=copy
ARG UID=1000
ARG GID=1000

RUN apt-get update && \
    apt-get -y install --no-install-recommends \
    g++ binutils \
    curl ca-certificates gnupg \
    openssh-client \
    libc6-dev libsqlite3-dev \
    libpng-dev libtiff-dev libjpeg-dev \
    libgdal-dev libproj-dev libgeos-dev gdal-bin \
    libpq-dev libfreetype-dev libfontconfig1-dev libxml2-dev  \
    libgit2-dev libharfbuzz-dev libfribidi-dev libudunits2-dev \
    libcurl4-openssl-dev libssl-dev \
    postgresql-client \
    python3-pip && \
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
      gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg && \
    printf "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main\n" \
      > /etc/apt/sources.list.d/google-cloud-sdk.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends google-cloud-cli && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -g ${GID} app && useradd -m -u ${UID} -g ${GID} app \
    && mkdir -p /opt/virtualenvs /app \
    && chown -R app:app /opt/virtualenvs /app

USER app
WORKDIR /app

COPY pyproject.toml uv.lock /app/
RUN uv sync --locked --no-install-project --dev
RUN uv run opentelemetry-bootstrap --action=install

COPY --chown=app:app . /app

WORKDIR /app/src/planscape

EXPOSE 8000

CMD ["bin/run_gunicorn.sh"]
