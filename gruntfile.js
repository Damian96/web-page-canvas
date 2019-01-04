/*global module:false*/
module.exports = function(grunt) {
  const path = require("path");
  const sass = require("node-sass");

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON("package.json"),
    datetime: Date.now(),

    paths: {
      build: "./build",
      modules: "./node_modules",
      src: "./src"
    },

    clean: ["<%= paths.build %>/*"],

    jshint: {
      options: {
        force: true,
        undef: true,
        unused: true,
        devel: true,
        esversion: 6,
        browser: true,
        globals: {
          jQuery: true,
          $: true,
          chrome: true,
          console: true
        }
      },
      background: {
        src: ["<%= paths.src %>/background/*.js"]
      },
      popup: {
        src: ["<%= paths.src %>/popup/js/*.js"]
      },
      content: {
        src: ["<%= paths.src %>/content-scripts/js/*.js"]
      },
      resources: {
        src: ["<%= paths.src %>/web-resources/js/options.js"]
      }
    },

    cssmin: {
      options: {
        mergeIntoShorthands: false,
        roundingPrecision: -1
      },
      main: {
        expand: true,
        cwd: "<%= paths.build %>/",
        src: ["**/*.css"],
        dest: "<%= paths.build %>/"
      }
    },

    sass: {
      options: {
        implementation: sass,
        sourceMap: false
      },
      resources: {
        src: "<%= paths.src %>/content-scripts/sass/web-page-canvas.scss",
        dest: "<%= paths.build %>/content-scripts/css/web-page-canvas.css"
      },
      resources_src: {
        src: "<%= paths.src %>/content-scripts/sass/web-page-canvas.scss",
        dest: "<%= paths.src %>/content-scripts/css/web-page-canvas.css"
      },
      popup: {
        expand: true,
        flatten: true,
        src: ["<%= paths.src %>/popup/sass/*.scss"],
        rename: function(dest, src) {
          var name = path.basename(src, ".scss") + ".css";
          return path.join(dest, name);
        },
        dest: "<%= paths.build %>/popup/css/"
      },
      popup_src: {
        expand: true,
        flatten: true,
        src: ["<%= paths.src %>/popup/sass/*.scss"],
        rename: function(dest, src) {
          var name = path.basename(src, ".scss") + ".css";
          return path.join(dest, name);
        },
        dest: "<%= paths.src %>/popup/css/"
      }
    },

    copy: {
      about: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "about/*",
        dest: "<%= paths.build %>/"
      },
      images: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "images/*",
        dest: "<%= paths.build %>/"
      },
      popup: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "popup/html/*",
        dest: "<%= paths.build %>/"
      },
      resources: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "web-resources/html/options.html",
        dest: "<%= paths.build %>/"
      },
      cssres: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "web-resources/css/options.css",
        dest: "<%= paths.build %>/"
      },
      libs: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "web-resources/js/*.min.js",
        dest: "<%= paths.build %>/"
      },
      manifest: {
        src: "<%= paths.src %>/manifest.json",
        dest: "<%= paths.build %>/manifest.json"
      }
    },

    concat: {
      options: {
        seperator: ";\n"
      },
      // content: {
      //   src: [
      //     "<%= paths.modules %>/immutable/dist/immutable.min.js",
      //     "<%= paths.build %>/content-scripts/js/web-page-canvas.js"
      //   ],
      //   dest: "<%= paths.build %>/content-scripts/js/web-page-canvas.js"
      // }
      content: {
        src: "<%= paths.build %>/content-scripts/js/web-page-canvas.js",
        dest: "<%= paths.build %>/content-scripts/js/web-page-canvas.js"
      }
    },

    uglify: {
      options: {
        mangle: {
          toplevel: false
        } // Don't mangle as it seems to break on this
      },
      background: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "background/*.js",
        dest: "<%= paths.build %>/"
      },
      popup: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "popup/js/*.js",
        dest: "<%= paths.build %>/"
      },
      content: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "content-scripts/js/web-page-canvas.js",
        dest: "<%= paths.build %>/"
      },
      resources: {
        expand: true,
        cwd: "<%= paths.src %>",
        src: "web-resources/js/options.js",
        dest: "<%= paths.build %>/"
      }
    },

    watch: {
      backgroundjs: {
        files: ["<%= paths.src %>/background/*.js"],
        tasks: ["jshint:background"],
        options: {
          spawn: false,
          debounceDelay: 750,
          interval: 2000,
          event: ["changed", "added"]
        }
      },
      contentjs: {
        files: ["<%= paths.src %>/content-scripts/js/*.js"],
        tasks: ["jshint:content"],
        options: {
          spawn: false,
          debounceDelay: 750,
          interval: 2000,
          event: ["changed", "added"]
        }
      },
      resjs: {
        files: ["<%= paths.src %>/web-resources/js/options.js"],
        tasks: ["jshint:resources"],
        options: {
          spawn: false,
          debounceDelay: 750,
          interval: 2000,
          event: ["changed", "added"]
        }
      },
      src_popup_sass: {
        files: ["<%= paths.src %>/popup/sass/*.scss"],
        tasks: ["sass:popup_src"],
        options: {
          spawn: false,
          debounceDelay: 750,
          interval: 2000,
          event: ["changed", "added"]
        }
      },
      src_res_sass: {
        files: ["<%= paths.src %>/web-resources/sass/*.scss"],
        tasks: ["sass:resources_src"],
        options: {
          spawn: false,
          debounceDelay: 750,
          interval: 2000,
          event: ["changed", "added"]
        }
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-uglify-es");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-sass");

  // Default task.- alias of 'build'
  grunt.registerTask("default", ["clean", "copy", "sass", "cssmin", "uglify"]);

  // same as 'default'
  grunt.registerTask("build", [
    "clean",
    "copy",
    "sass",
    "cssmin",
    "uglify",
    "concat"
  ]);

  // same as 'watch'
  grunt.registerTask("dev", ["watch"]);

  // same as 'jshint'
  grunt.registerTask("debug", ["jshint"]);
};
