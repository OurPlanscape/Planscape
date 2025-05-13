FROM python:3.10-slim-bullseye

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

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

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Python dependencies
RUN pip install -U pip poetry setuptools
COPY pyproject.toml poetry.lock /usr/src/app/

RUN poetry config virtualenvs.create false && \
    poetry config installer.max-workers 10 && \
    poetry install --no-interaction

COPY .env martin.yaml Makefile /usr/src/app/
COPY src/planscape/* /usr/src/app/

EXPOSE 8000

CMD ["bin/run_gunicorn.sh"]
