FROM ghcr.io/osgeo/gdal:ubuntu-small-3.8.5

ENV DEBIAN_FRONTEND=noninteractive
ENV UBUNTU=jammy
ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y \
    git curl wget software-properties-common && \
    wget -qO- https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc | tee -a /etc/apt/trusted.gpg.d/cran_ubuntu_key.asc && \
    add-apt-repository "deb https://cloud.r-project.org/bin/linux/ubuntu jammy-cran40/"

RUN apt-get update && \
    apt-get -y install \
    dirmngr \
    openssh-client \
    libpng-dev libtiff-dev libjpeg-dev \
    libpq-dev libfreetype-dev libfontconfig1-dev libxml2-dev  \
    libgit2-dev libharfbuzz-dev libfribidi-dev libudunits2-dev \
    libcurl4-openssl-dev libssl-dev \
    postgresql-client \
    python3-pip \
    r-base

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# R dependencies
COPY install.R /usr/src/app/
RUN Rscript install.R

# Python dependencies
RUN pip install -U pip poetry setuptools
COPY pyproject.toml poetry.lock /usr/src/app/

RUN poetry config virtualenvs.create false && \
    poetry config installer.max-workers 10 && \
    poetry install --no-interaction

COPY . /usr/src/app

EXPOSE 8000

CMD ["bin/run_gunicorn.sh"]