####################################################################################
# Builder; this creates Python Wheels, which makes the deployed image smaller

FROM public.ecr.aws/lambda/python:latest as builder

# set work directory
WORKDIR /src/planscape_r

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV R_VERSION=4.0.3
# ENV R_HOME /usr/lib/R

# install binary dependencies
RUN yum -y update 
RUN yum -y install wget
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN yum install -y openblas-devel
RUN wget https://cdn.rstudio.com/r/centos-7/pkgs/R-${R_VERSION}-1-1.x86_64.rpm \
  && yum -y install R-${R_VERSION}-1-1.x86_64.rpm

RUN printenv

RUN ~/R-${R_VERSION}/bin/R --version
# set the PATH
# RUN export PATH=${PATH}:~/R-${R_VERSION}/bin/
# unset R_HOME if needed
# RUN unset R_HOME

# install dependencies
# COPY ./requirements.txt .
RUN pip install --upgrade pip
RUN pip install rpy2
# RUN pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels -r requirements.txt


####################################################################################
# Deployed image

FROM public.ecr.aws/lambda/python:latest

# create the appropriate directories
ENV APP_HOME=/home/planscape/backend_r
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

# install dependencies
COPY --from=builder /usr/src/app/wheels /wheels
COPY --from=builder /src/planscape_r/requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache /wheels/*

# copy project
COPY . $APP_HOME

# run lambda handler
CMD ["lambda_handler.lambda_handler"]
