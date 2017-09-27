var compressor = require('node-minify');

compressor.minify({
    compressor: 'gcc',
    input: './content-scripts/js/beautified/canvas-draw.js',
    output: './content-scripts/js/canvas-draw.min.js',
    options: {
      compilation_level: 'WHITESPACE_ONLY'
    },
    callback: function (err, min) {
    }
});

compressor.minify({
  compressor: 'clean-css',
  input: './content-scripts/css/beautified/canvas-draw.css',
  output: './content-scripts/css/canvas-draw.min.css',
  options: {
    advanced: false, // set to false to disable advanced optimizations - selector & property merging, reduction, etc.
    aggressiveMerging: false // set to false to disable aggressive merging of properties.
  },
  callback: function (err, min) {
  }
});

compressor.minify({
  compressor: 'clean-css',
  input: './content-scripts/css/beautified/icons.css',
  output: './content-scripts/css/icons.min.css',
  options: {
    advanced: false, // set to false to disable advanced optimizations - selector & property merging, reduction, etc.
    aggressiveMerging: false // set to false to disable aggressive merging of properties.
  },
  callback: function (err, min) {
  }
});