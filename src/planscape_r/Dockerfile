FROM public.ecr.aws/lambda/python:latest as builder

# install binary dependencies
RUN yum -y update 
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN yum -y install R
RUN yum -y install tar
# RUN ls /usr/bin/tar .
# RUN ls /usr/bin/gtar .
# RUN ln -s /usr/bin/tar /usr/bin/gtar
# RUN which amazon-linux-extras
# RUN yum install -y amazon-linux-extras
# RUN PYTHON=python2 amazon-linux-extras install R4
RUN yum -y install libcurl-devel
RUN yum -y install openssl-devel
RUN yum -y install udunits2-devel
# RUN yum -y install libxml2-devel
# RUN yum -y install harfbuzz-devel fribidi-devel
# RUN yum -y install freetype-devel libpng-devel libtiff-devel libjpeg-turbo-devel
# RUN yum -y install binutils
# RUN yum -y install libssh2-devel
# RUN yum -y install libssh2-devel
# RUN yum -y install libgit2 

# RUN yum -y install python-pip
# RUN pip install pygit2

# RUN R -e "install.packages('dplyr',dependencies=TRUE, repos='http://cran.rstudio.com/')"
# RUN R -e "install.packages('sf',dependencies=TRUE, repos='http://cran.rstudio.com/')"
# RUN R -e "install.packages('libgit2-devel',dependencies=TRUE, repos='http://cran.rstudio.com/')"
# RUN R -e "install.packages('gert',dependencies=TRUE, repos='http://cran.rstudio.com/')"
# RUN R -e "install.packages('pkgdown',dependencies=TRUE, repos='http://cran.rstudio.com/')"
# RUN R -e "install.packages('devtools',dependencies=TRUE, repos='http://cran.rstudio.com/')"
# RUN R -e "library(devtools)"
# RUN R -e "devtools::install('/usr/lib64/R/library/forsysr')"
# RUN R -e ""
# RUN export TAR="/usr/bin/tar"
# RUN echo $TAR
# RUN R -e "Sys.getenv('TAR')"
# RUN R -e "Sys.setenv('TAR' = 'internal'); Sys.getenv('TAR'); install.packages('remotes',dependencies=TRUE, repos='http://cran.rstudio.com/'); remotes::install_github('forsys-sp/forsysr');"
RUN R -e "install.packages('remotes',dependencies=TRUE, repos='http://cran.rstudio.com/'); remotes::install_github('forsys-sp/forsysr')"
RUN R -e "remotes::install_github('forsys-sp/forsysr')"

# COPY ./forsysr /usr/lib64/R/library/forsysr

# RUN git clone https://github.com/forsys-sp/forsysr.git
# RUN cd forsysr
# RUN ls



# Install the function's dependencies using file requirements.txt
# from your project folder.
# Install any dependencies under the ${LAMBDA_TASK_ROOT} directory 
# alongside the function handler to ensure that the Lambda runtime can locate them when the function is invoked.
COPY requirements.txt  .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}
COPY rank.R ${LAMBDA_TASK_ROOT}

RUN ls
RUN ls /usr/lib64/R/library
RUN ls ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["lambda_handler.lambda_handler"]
