FROM public.ecr.aws/lambda/python:latest

RUN yum -y update
RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN yum -y install openblas-devel

# https://github.com/rstudio/r-builds/
RUN yum -y install compat-gcc-48-libgfortran
RUN curl -O https://cdn.posit.co/r/centos-7/pkgs/R-4.2.2-1-1.x86_64.rpm && \
    yum -y install R-*.rpm && \
    rm R-*.rpm

RUN ln -s /opt/R/4.2.2/bin/R /usr/local/bin/R && \
    ln -s /opt/R/4.2.2/bin/Rscript /usr/local/bin/Rscript

# https://pak.r-lib.org/reference/install.html#nightly-builds
RUN R -e 'install.packages("pak", repos = sprintf("https://r-lib.github.io/p/pak/devel/%s/%s/%s", .Platform$pkgType, R.Version()$os, R.Version()$arch))'

RUN yum -y install openssl-devel udunits2-devel tar

# https://gist.github.com/alanorth/9681766ed4c737adfb48a4ef549a8503
RUN set -x && \
    cd /tmp && \
    curl -LO https://download.osgeo.org/proj/proj-6.1.1.tar.gz && \
    tar xf proj-6.1.1.tar.gz && \
    cd proj-6.1.1 && \
    yum -y install sqlite-devel file && \
    ./configure && \
    make -j4 && \
    make install

RUN set -x && \
    cd /tmp && \
    curl -LO https://download.osgeo.org/gdal/2.4.2/gdal-2.4.2.tar.gz && \
    tar xf gdal-2.4.2.tar.gz && \
    cd gdal-2.4.2 && \
    yum -y install libzstd-devel sqlite-devel libwebp-devel hdf5-devel && \
    ./configure && \
    make -j4 && \
    make install
    
RUN set -x && \
    cd /tmp && \
    curl -LO https://download.osgeo.org/geos/geos-3.7.5.tar.bz2 && \
    yum -y install bzip2 && \
    tar xf geos-3.7.5.tar.bz2 && \
    cd geos-3.7.5 && \
    ./configure && \
    make -j4 && \
    make install
    
RUN echo 'options(repos = c(CRAN = "https://cloud.r-project.org"))' >> \
         /opt/R/4.2.2/lib/R/library/base/R/Rprofile && \
    echo 'options(repos = c(RSPM="https://packagemanager.rstudio.com/all/__linux__/centos7/latest", getOption("repos")))' >> \
         /opt/R/4.2.2/lib/R/library/base/R/Rprofile

RUN R -e 'pak::pkg_install(c("sf", "forsys-sp/forsysr"))'


RUN ls /opt/R/4.2.2/lib/R/lib   
RUN ldd /opt/R/4.2.2/lib/R/lib/libR.so
RUN whereis R

# Install the function's dependencies using file requirements.txt
# from your project folder.
# Install any dependencies under the ${LAMBDA_TASK_ROOT} directory 
# alongside the function handler to ensure that the Lambda runtime can locate them when the function is invoked.
COPY requirements.txt  .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# # Copy function code
# COPY lambda_handler.py ${LAMBDA_TASK_ROOT}
# COPY rank.R ${LAMBDA_TASK_ROOT}

# RUN ls
# RUN ls ${LAMBDA_TASK_ROOT}

# # Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
# CMD ["lambda_handler.lambda_handler"]


# # RUN yum -y update 
# # RUN yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
# # # RUN yum -y install R
# # RUN yum -y install amazon-linux-extras
# # RUN PYTHON=python2 amazon-linux-extras install R4
# # RUN yum -y install tar


# # # RUN ls /usr/bin/tar .
# # # RUN ls /usr/bin/gtar .
# # # RUN ln -s /usr/bin/tar /usr/bin/gtar

# # RUN yum -y install libcurl-devel
# # RUN yum -y install openssl-devel
# # RUN yum -y install udunits2-devel
# # RUN yum -y install gdal-devel

# # RUN yum -y install wget
# # RUN wget https://github.com/libgit2/libgit2/archive/refs/tags/v1.5.0.tar.gz -O libgit2-1.5.0.tar.gz
# # RUN tar xzf libgit2-1.5.0.tar.gz
# # RUN cd libgit2-1.5.0/
# # RUN cmake .
# # RUN make
# # RUN make install

# # # RUN yum -y install libxml2-devel
# # # RUN yum -y install harfbuzz-devel fribidi-devel
# # # RUN yum -y install freetype-devel libpng-devel libtiff-devel libjpeg-turbo-devel
# # # RUN yum -y install libssh2-devel
# # # RUN yum -y install libssh2-devel

# # # RUN R -e "install.packages('dplyr',dependencies=TRUE, repos='http://cran.rstudio.com/')"
# # RUN R -e "install.packages('sf', repos='http://cran.rstudio.com/')"
# # RUN R -e "install.packages('remotes', repos='http://cran.rstudio.com/')"
# # RUN R -e "remotes::install_github('forsys-sp/forsysr')"

# # # COPY ./forsysr /usr/lib64/R/library/forsysr
