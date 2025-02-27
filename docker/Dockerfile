FROM python:3.10-bullseye

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y \
    git curl wget software-properties-common && \
    gpg --keyserver keyserver.ubuntu.com --recv-key '95C0FAF38DB3CCAD0C080A7BDC78B2DDEABC47B7' && \
    gpg --armor --export '95C0FAF38DB3CCAD0C080A7BDC78B2DDEABC47B7' | tee /etc/apt/trusted.gpg.d/cran_debian_key.asc && \
    add-apt-repository "deb http://cloud.r-project.org/bin/linux/debian bullseye-cran40/"

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
    python3-pip \
    r-base r-base-dev

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