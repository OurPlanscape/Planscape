FROM public.ecr.aws/lambda/python:latest

RUN yum update -y && yum install -y wget && yum clean all

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
# -p is the directory to install into
# -b to be able to run unattended
RUN bash Miniconda3-latest-Linux-x86_64.sh -p /miniconda3 -b
RUN rm Miniconda3-latest-Linux-x86_64.sh

ENV PATH=/miniconda3/bin:${PATH}
RUN echo $PATH
RUN ls /miniconda3/bin
RUN conda init bash
RUN conda init zsh
RUN conda config --add channels conda-forge
RUN /miniconda3/bin/activate
RUN conda install -y -c conda-forge r
RUN yum -y install util-linux
RUN whereis R

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
