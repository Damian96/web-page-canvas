var compressor = require('node-minify');

compressor.minify({
    compressor: 'gcc',
    input: './popup/js/beautified/highlight-popup.js',
    output: './popup/js/highlight-popup.min.js',
    options: {
      compilation_level: 'WHITESPACE_ONLY'
    },
    callback: function (err, min) {
    }
});

compressor.minify({
    compressor: 'clean-css',
    input: './popup/css/beautified/highlight-popup.css',
    output: './popup/css/highlight-popup.min.css',
    options: {
      advanced: false, // set to false to disable advanced optimizations - selector & property merging, reduction, etc.
      aggressiveMerging: false // set to false to disable aggressive merging of properties.
    },
    callback: function (err, min) {
    }
  });