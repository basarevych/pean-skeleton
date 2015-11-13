'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/* <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %> */\n\n',

        copy: {
            assets: {
                files: [
                    /*
                     * Add your non-JS/non-CSS dependencies here
                     */

                    { // Copy Bootstrap fonts
                        expand: true,
                        cwd: 'bower_components/bootstrap/dist/',
                        src: 'fonts/**',
                        dest: '../public',     
                    },
                    { // Copy CLDR main data
                        expand: true,
                        cwd: 'bower_components/cldr-data/',
                        src: 'main/en/**',
                        dest: '../public/cldr',     
                    },
                    { // Copy CLDR supplemental data
                        expand: true,
                        cwd: 'bower_components/cldr-data/',
                        src: 'supplemental/**',
                        dest: '../public/cldr',     
                    },
                ]
            },
            app: {
                files: [
                    { // Copy l10n files
                        expand: true,
                        cwd: '..',
                        src: 'l10n/**',
                        dest: '../public',
                    },
                    { // Copy images
                        expand: true,
                        src: 'img/**',
                        dest: '../public',
                    },
                    { // Copy modal dialogs
                        expand: true,
                        src: 'modals/**',
                        dest: '../public',
                    },
                    { // Copy views
                        expand: true,
                        src: 'views/**',
                        dest: '../public',
                    },
                ]
            },
        },

        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            },
            vendorjs: {
                src: [
                    /*
                     * Add your JS dependencies here, order is respected
                     */
                    'bower_components/jquery/dist/jquery.js',
                    'bower_components/bootstrap/dist/js/bootstrap.js',
                    'bower_components/moment/min/moment-with-locales.js',
                    'bower_components/moment-timezone/builds/moment-timezone-with-data.js',

                    'bower_components/angular/angular.js',
                    'bower_components/angular-loader/angular-loader.js',
                    'bower_components/angular-loading-bar/build/loading-bar.js',
                    'bower_components/angular-resource/angular-resource.js',
                    'bower_components/angular-cookies/angular-cookies.js',
                    'bower_components/angular-animate/angular-animate.js',
                    'bower_components/angular-ui-router/release/angular-ui-router.js',
                    'bower_components/angular-ui-bootstrap-bower/ui-bootstrap-tpls.js',
                    'bower_components/angular-ui-tree/dist/angular-ui-tree.js',
                    'bower_components/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',

                    'bower_components/cldrjs/dist/cldr.js',
                    'bower_components/cldrjs/dist/cldr/event.js',
                    'bower_components/cldrjs/dist/cldr/supplemental.js',

                    'bower_components/globalize/dist/globalize.js',
                    'bower_components/globalize/dist/globalize/message.js',
                    'bower_components/globalize/dist/globalize/number.js',
                    'bower_components/globalize/dist/globalize/plural.js',
                    'bower_components/globalize/dist/globalize/currency.js',
                    'bower_components/globalize/dist/globalize/date.js',

                    'bower_components/angular-globalize-wrapper/dist/angular-globalize-wrapper.js',

                    'bower_components/pnotify/src/pnotify.core.js',
                    'bower_components/pnotify/src/pnotify.buttons.js',

                    'bower_components/highlightjs/highlight.pack.js',
                    'bower_components/angular-highlightjs/build/angular-highlightjs.js',

                    '../node_modules/dynamic-table/dist/jquery.dynamic-table.js',
                    '../node_modules/dynamic-table/dist/angularjs.dynamic-table.js',
                ],
                dest: '../public/js/vendor.js'
            },
            appjs: {
                src: 'js/**/*.js',
                dest: '../public/js/app.js',
            },
            vendorcss: {
                src: [
                    /*
                     * Add your CSS dependencies here, order is respected
                     */
                    'bower_components/angular-loading-bar/build/loading-bar.css',
                    'bower_components/angular-ui-tree/dist/angular-ui-tree.min.css',

                    'bower_components/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.css',

                    'bower_components/pnotify/src/pnotify.core.css',
                    'bower_components/pnotify/src/pnotify.buttons.css',

                    'bower_components/highlightjs/styles/default.css',

                    '../node_modules/dynamic-table/dist/jquery.dynamic-table.css',
                ],
                dest: '../public/css/vendor.css'
            },
        },

        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            vendorjs: {
                src: '<%= concat.vendorjs.dest %>',
                dest: '../public/js/vendor.min.js'
            },
            appjs: {
                src: '<%= concat.appjs.dest %>',
                dest: '../public/js/app.min.js'
            },
        },

        less: {
            appcss: {
                files: {
                    "../public/css/app.css": "less/app.less"
                },
            },
        },

        cssmin: {
            options: {
                banner: '<%= banner %>'
            },
            vendorcss: {
                src: '../public/css/vendor.css',
                dest: '../public/css/vendor.min.css'
            },
            appcss: {
                src: '../public/css/app.css',
                dest: '../public/css/app.min.css'
            },
        },

        watch: {
            copy: {
                files: [ '../l10n/**/*', 'img/**/*', 'modals/**/*', 'views/**/*' ],
                tasks: [ 'copy:app' ]
            },
            js: {
                files: [ 'js/**/*' ],
                tasks: [ 'concat:appjs', 'uglify:appjs' ],
            },
            less: {
                files: [ 'less/**/*' ],
                tasks: [ 'less', 'cssmin:appcss' ],
            },
        },

        karma: {
            unit: {
                configFile: 'tests/karma.conf.js',
                options: {
                    singleRun: true,
                    files: [
                        '<%= concat.vendorjs.dest %>',
                        'bower_components/angular-mocks/angular-mocks.js',
                        '<%= concat.appjs.dest %>',
                        'tests/unit/**/*.js',
                    ],
                    proxies: {
                        '/locales/': 'dist/locales/'
                    },
                }
            }
        },
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');

    grunt.registerTask('default', ['copy', 'concat', 'uglify', 'less', 'cssmin']);
};
