FROM rocker/tidyverse as final

# -----------------------
# Install Python and gdal
# -----------------------
# libudunits2-dev is necessary for R package, sf.
RUN apt-get update \
  && apt-get install python3 \
  && apt-get install -y python3-pip \
  && apt-get install -y python3-venv \
  && apt-get install -y gdal-bin \
  && apt-get install -y libudunits2-dev

# --------------
# Install Forsys
# --------------
# udunits2 is necessary for R package, sf.
RUN R -e "devtools::install_github('forsys-sp/forsysr', auth_token='<YOUR GITHUB PERSONAL ACCESS TOKEN>')" \
  && R -e "install.packages('dplyr')" \
  && R -e "install.packages('sf')" \
  && R -e "install.packages('udunits2')"

# --------------------------------
# Set Python environment variables
# --------------------------------

# log messages will be immediately dumped to the standard output stream instead of being buffered
ENV PYTHONUNBUFFERED 1

# set up a virtual environment for pip install
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# ------------------
# Set work directory
# ------------------
RUN mkdir /code
WORKDIR /code

# ---------------------------
# Install python dependencies
# ---------------------------
COPY requirements.txt .
RUN pip install -r requirements.txt

# -------------------------------------------------------------------
# Update library paths so certain packages can be visible from Django
# -------------------------------------------------------------------
# /usr/local/lib/R/lib is for Rlib.so.
# /usr/local/lib/R/site-library/units/libs is for units.so.
ENV LD_LIBRARY_PATH="${LD_LIBRARY_PATH}:/usr/local/lib/R/lib:/usr/local/lib/R/site-library/units/libs"

# -----------------
# Copy project code
# -----------------
# note: code is copied AFTER dependencies have been installed.
COPY . /code/

CMD python manage.py runserver 0.0.0.0:8080
