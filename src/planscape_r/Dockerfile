FROM public.ecr.aws/lambda/python:latest as builder

# install binary dependencies
RUN yum -y update 
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN yum -y install R

# Install the function's dependencies using file requirements.txt
# from your project folder.
# Install any dependencies under the ${LAMBDA_TASK_ROOT} directory 
# alongside the function handler to ensure that the Lambda runtime can locate them when the function is invoked.
COPY requirements.txt  .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["lambda_handler.lambda_handler"]
