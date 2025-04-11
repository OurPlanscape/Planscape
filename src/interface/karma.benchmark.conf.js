module.exports = function(config) {
    config.set({
      basePath: '',
      frameworks: ['benchmark'],
      files: [
        'src/tests/profiling/**/*.ts'
      ],
      preprocessors: {
        'src/profiling/**/*.ts': ['typescript']
      },
      reporters: ['benchmark'],
      port: 9876,
      colors: true,
      logLevel: config.LOG_INFO,
      autoWatch: false,
      browsers: ['Chrome'],
      singleRun: true
    });
  };
