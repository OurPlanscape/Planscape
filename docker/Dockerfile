FROM python:3.10-alpine

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Required packages
RUN apk update
RUN apk add g++
RUN apk add binutils
RUN apk add openssh-client
RUN apk add postgresql-client
RUN apk add py3-pip
RUN apk add musl
RUN apk add libssl3
RUN apk add curl-dev
RUN apk add jpeg-dev
RUN apk add tiff-dev
RUN apk add proj-dev
RUN apk add gdal
RUN apk add gdal-dev
RUN apk add py3-gdal
RUN apk add libpng-dev
RUN apk add geos-dev
RUN apk add libpq-dev
RUN apk add freetype-dev
RUN apk add fontconfig-dev
RUN apk add libxml2-dev
RUN apk add libgit2-dev
RUN apk add harfbuzz-dev
RUN apk add fribidi-dev
RUN apk add sqlite-dev
RUN apk add R-dev
RUN apk add perl
# RUN apk add udunits-dev


# Compile R
RUN wget https://cloud.r-project.org/src/base/R-4/R-4.4.1.tar.gz \
    && tar -xvzf R-4.4.1.tar.gz 
RUN cd R-4.4.1/ && ./configure -C --with-x=no
RUN cd R-4.4.1/ && make 
RUN cd R-4.4.1/ && make install-strip


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