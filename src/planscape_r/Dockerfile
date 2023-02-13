####################################################################################
# Builder; this creates Python Wheels, which makes the deployed image smaller

FROM public.ecr.aws/lambda/python:latest as builder

# set work directory
WORKDIR /src/planscape_r

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install binary dependencies
RUN yum -y update 
RUN yum -y install R-devel


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
