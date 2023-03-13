FROM public.ecr.aws/lambda/python:latest

RUN yum update -y && yum install -y wget && yum clean all

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
# -p is the directory to install into, -b to be able to run unattended
RUN bash Miniconda3-latest-Linux-x86_64.sh -p /miniconda3 -b
RUN rm Miniconda3-latest-Linux-x86_64.sh

# Required for R https://github.com/ContinuumIO/anaconda-issues/issues/11133
RUN yum install -y which
RUN yum -y install tar

# Required for forsys
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN yum -y install openssl-devel udunits2-devel

RUN yum -y install util-linux
ENV PATH=/miniconda3/bin:${PATH}
# /miniconda3/bin:/var/lang/bin:/usr/local/bin:/usr/bin/:/bin:/opt/bin
RUN echo $PATH
RUN conda init bash
RUN conda init zsh
RUN conda config --add channels conda-forge
RUN /miniconda3/bin/activate
RUN conda install -y -c conda-forge gdal poppler r r-base r-stringi r-units blas-devel udunits2 r-sf r-tidyverse r-rgeos r-roxygen2 r-rgdal r-extremes r-doparallel r-r.utils

RUN conda list

# RUN R -e "install.packages('sf', repos='http://cran.rstudio.com/')"
# RUN R -e "install.packages('tidyverse', repos='http://cran.rstudio.com/')"
RUN R -e "install.packages('remotes', repos='http://cran.rstudio.com/')"
RUN R -e "remotes::install_github('forsys-sp/forsysr', force=TRUE)"

# RUN conda pip install awslambdaric
# RUN ln -sf /opt/conda-env/bin/python /var/lang/bin/python3.8

ENV LD_LIBRARY_PATH=/miniconda3/lib/R/lib:/miniconda3/lib:${LD_LIBRARY_PATH}
RUN /miniconda3/bin/deactivate
COPY requirements.txt  .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

RUN ln -s /miniconda/bin/R /usr/bin/R

# R: /miniconda3/bin/R
RUN whereis R
# /miniconda3/lib/R
RUN R RHOME
RUN whereis python
RUN whereis pip
RUN whereis rpy2
RUN whereis lblas
RUN echo $PATH
RUN echo $LD_LIBRARY_PATH


# Copy function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}
COPY rank.R ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["lambda_handler.lambda_handler"]
