FROM public.ecr.aws/lambda/python:latest

RUN yum update -y && yum install -y wget && yum clean all

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -o miniconda.sh && sh Miniconda3-latest-Linux-x86_64.sh -b -p /opt/miniconda

RUN /opt/miniconda/bin/conda init bash && \ 
conda create -n elsie && \ 
conda activate elsie 
# openblas-devel openssl-devel

RUN R -e 'install.packages("pak", repos = sprintf("https://r-lib.github.io/p/pak/devel/%s/%s/%s", .Platform$pkgType, R.Version()$os, R.Version()$arch))'
RUN R -e 'pak::pkg_install(c("sf", "forsys-sp/forsysr"))'

RUN /opt/conda-env/bin/pip install awslambdaric
# RUN mv /var/lang/bin/python3.8 /var/lang/bin/python3.8-clean && ln -sf /opt/conda-env/bin/python /var/lang/bin/python3.8

COPY requirements.txt  .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}
COPY rank.R ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["lambda_handler.lambda_handler"]
