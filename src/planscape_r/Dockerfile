FROM python:3.10.9

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /src/planscape_r

# copy all code and lambda handler
COPY elsie.py ./
COPY rank.R ./
COPY lambda_handler.py ./
COPY requirements.txt ./

# install packages
RUN python3 -m pip install -r ./requirements.txt
RUN apt-get update && apt-get install -y r-base-core

# run lambda handler
CMD ["lambda_handler.lambda_handler"]