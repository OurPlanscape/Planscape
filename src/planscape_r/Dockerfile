####################################################################################
# Builder; this creates Python Wheels, which makes the deployed image smaller

FROM public.ecr.aws/lambda/python:latest as builder

# set work directory
WORKDIR /src/planscape_r

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV R_VERSION=4.0.3

# install binary dependencies
RUN yum -y update 
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN yum -y install R

# install dependencies
COPY ./requirements.txt .
RUN pip install --upgrade pip
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels -r requirements.txt


####################################################################################
# Deployed image

FROM public.ecr.aws/lambda/python:latest

# create the appropriate directories
ENV APP_HOME=/home/planscape/backend_r
RUN mkdir -p $APP_HOME

# install dependencies
COPY --from=builder /usr/src/app/wheels /wheels
COPY --from=builder /src/planscape_r/requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache /wheels/*

# copy project
COPY . $APP_HOME
WORKDIR $APP_HOME
RUN ls

# run lambda handler
CMD ["lambda_handler.lambda_handler"]
