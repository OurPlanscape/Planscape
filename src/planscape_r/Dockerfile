####################################################################################
# Builder; this creates Python Wheels, which makes the deployed image smaller

FROM python:3.10.9 as builder

# set work directory
WORKDIR /src/planscape_r

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install binary dependencies
RUN apt-get update && apt-get install -y  r-base r-base-core

# install dependencies
COPY ./requirements.txt .
RUN pip install --upgrade pip
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels -r requirements.txt


####################################################################################
# Deployed image

FROM python:3.10.9

# create the appropriate directories
ENV APP_HOME=/home/planscape/backend_r
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

# install dependencies
COPY --from=builder /usr/src/app/wheels /wheels
COPY --from=builder /src/planscape_r/requirements.txt .
RUN pip install --no-cache /wheels/*

# copy project
COPY . $APP_HOME

# run lambda handler
CMD ["lambda_handler.lambda_handler"]
