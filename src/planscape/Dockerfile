FROM python:3.10.9

# -------------------------
# Set environment variables
# -------------------------

# log messages will be immediately dumped to the standard output stream instead of being buffered
ENV PYTHONUNBUFFERED 1

# set up a virtual environment for pip install
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# ------------------
# Set work directory
# ------------------
RUN mkdir -p /src/planscape
WORKDIR /src/planscape

# --------------------
# Install dependencies
# --------------------
RUN pip install --upgrade pip
COPY requirements.txt .
RUN apt-get update && apt-get install -y gdal-bin libgdal-dev r-base-core
RUN pip install -r requirements.txt

# -----------------
# Copy project code
# -----------------
# note: code is copied AFTER dependencies have been installed.
COPY . /src/planscape
