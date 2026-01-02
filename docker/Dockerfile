FROM ghcr.io/astral-sh/uv:latest AS builder

FROM python:3.14.0-slim-trixie
COPY --from=builder /uv /uvx /bin/

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV UV_PROJECT_ENVIRONMENT=/opt/virtualenvs/
ENV UV_LINK_MODE=copy
ARG UID=1000
ARG GID=1000

RUN apt-get update && \
    apt-get -y install \
    g++ binutils \
    openssh-client \
    libc6-dev libsqlite3-dev \
    libpng-dev libtiff-dev libjpeg-dev \
    libgdal-dev libproj-dev libgeos-dev gdal-bin \
    libpq-dev libfreetype-dev libfontconfig1-dev libxml2-dev  \
    libgit2-dev libharfbuzz-dev libfribidi-dev libudunits2-dev \
    libcurl4-openssl-dev libssl-dev \
    postgresql-client \
    python3-pip

RUN groupadd -g ${GID} app && useradd -m -u ${UID} -g ${GID} app \
    && mkdir -p /opt/virtualenvs /app \
    && chown -R app:app /opt/virtualenvs /app

USER app
WORKDIR /app

COPY pyproject.toml uv.lock /app/
RUN uv sync --locked --no-install-project --dev
RUN uv run opentelemetry-bootstrap --action=install

COPY . /app

EXPOSE 8000

CMD ["bin/run_gunicorn.sh"]
