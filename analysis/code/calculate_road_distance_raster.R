
require(rgdal)

# The input file geodatabase
fgdb <- 'analysis/data/BMFP Notebook Data/data.gdb'

# List all feature classes in a file geodatabase
subset(ogrDrivers(), grepl('GDB', name))
fc_list <- ogrListLayers(fgdb)
print(fc_list)

# Read the feature class
fc <- readOGR(dsn = fgdb, layer = 'some_featureclass')

# Determine the FC extent, projection, and attribute information
summary(fc)

# View the feature class
plot(fc)