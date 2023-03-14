FROM public.ecr.aws/lambda/python:latest

RUN yum update -y && yum install -y wget && yum clean all

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
# -p is the directory to install into, -b to be able to run unattended
RUN bash Miniconda3-latest-Linux-x86_64.sh -p /miniconda3 -b
RUN rm Miniconda3-latest-Linux-x86_64.sh

# Required for R https://github.com/ContinuumIO/anaconda-issues/issues/11133
RUN yum install -y which
RUN yum -y install tar
RUN yum -y install binutils

# Required for forsys
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN yum -y install openssl-devel udunits2-devel

RUN yum -y install util-linux
# /var/lang/bin:/usr/local/bin:/usr/bin/:/bin:/opt/bin:/miniconda3/bin
ENV PATH=${PATH}:/miniconda3/bin
# /miniconda3/bin/python
# Lambda will always execute from /var/lang/bin/python
RUN which python
RUN which pip


RUN conda init bash
RUN conda init zsh
RUN conda config --add channels conda-forge
RUN /miniconda3/bin/activate
RUN conda install -y -c conda-forge gdal poppler r r-base r-stringi r-units blas-devel udunits2 r-sf r-tidyverse r-rgeos r-roxygen2 r-rgdal r-extremes r-doparallel r-r.utils libspatialite sqlite gcc
RUN R -e "install.packages('remotes', repos='http://cran.rstudio.com/')"
RUN R -e "remotes::install_github('forsys-sp/forsysr', force=TRUE)"
# RUN R -e "sessionInfo()"
# RUN R -e ".libPaths()"
# RUN R -e "search()"

RUN ln -s /miniconda3/bin/R /var/lang/bin/R
RUN ln -s /miniconda3/lib/R /var/lang/lib/R
RUN pip install rpy2
# RUN python -m rpy2.situation
RUN echo $LD_LIBRARY_PATH
ENV LD_LIBRARY_PATH=/var/lang/lib:/miniconda3/lib:/lib64:/usr/lib64:/var/runtime:/var/runtime/lib:/var/task:/var/task/lib:/opt/lib
RUN ln -s /miniconda3/lib /lib64


RUN which gcc
RUN ldd --version
RUN ldd /miniconda3/lib/libstdc++.so.6
RUN ldd /lib64/libstdc++.so.6
RUN ldd /miniconda3/lib/R/library/libspatialite.so
RUN conda list


RUN strings /lib64/libstdc++.so.6 | grep GLIBCXX
RUN strings /miniconda3/lib/libstdc++.so.6 | grep GLIBCXX

# /miniconda3/bin/R
RUN which R

# COPY requirements.txt  .
# RUN pip install --upgrade pip
# RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}
COPY rank.R ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["lambda_handler.lambda_handler"]
