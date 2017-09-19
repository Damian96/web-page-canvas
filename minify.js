var compressor = require('node-minify');

compressor.minify({
    compressor: 'gcc',
    input: './content-scripts/js/beautified/highlight.js',
    output: './content-scripts/js/highlight.min.js',
    options: {
      compilation_level: 'WHITESPACE_ONLY',
      language: 'ECMASCRIPT6'
    },
    callback: function (err, min) {}
});

compressor.minify({
    compressor: 'clean-css',
    input: './content-scripts/css/beautified/highlight.css',
    output: './content-scripts/css/highlight.min.css',
    options: {
      advanced: false, // set to false to disable advanced optimizations - selector & property merging, reduction, etc.
      aggressiveMerging: false // set to false to disable aggressive merging of properties.
    },
    callback: function (err, min) {}
  });