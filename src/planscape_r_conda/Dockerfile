FROM public.ecr.aws/lambda/python:latest

RUN yum update -y && yum install -y wget && yum clean all

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -o miniconda.sh && sh Miniconda3-latest-Linux-x86_64.sh -b -p /opt/miniconda


RUN conda env create -f environment.yml && conda activate elsie

RUN conda install -y r 

# Copy function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}
COPY rank.R ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["lambda_handler.lambda_handler"]
