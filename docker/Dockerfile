FROM ghcr.io/osgeo/gdal:ubuntu-small-3.8.5

ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get -y install \
    wget \
    openssh-client \
    git \
    curl \
    libcurl4-openssl-dev \
    libssl-dev \
    postgresql-client \
    python3-venv \
    python3-pip

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN pip install -U pip poetry setuptools
COPY pyproject.toml poetry.lock /usr/src/app/

RUN poetry config virtualenvs.create false && \
    poetry config installer.max-workers 10 && \
    poetry install --no-interaction

COPY . /usr/src/app

EXPOSE 8000

CMD ["bin/run_gunicorn.sh"]