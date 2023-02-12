# lambda base image for Docker from AWS
FROM public.ecr.aws/lambda/python:latest

# copy all code and lambda handler
COPY elsie.py ./
COPY rank.R ./
COPY lambda_handler.py ./
COPY requirements.txt ./

# install packages
RUN yum install -y gcc-c++ pkgconfig poppler-cpp-devel
RUN python3 -m pip install -r requirements.txt

# run lambda handler
CMD ["lambda_handler.lambda_handler"]