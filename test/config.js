/*

    Configure amdjs-tests.
        
    1.  Add a directory ../amdjs-tests/impl/amdlite
    
    2.  Create symlinks to this file and amdlite.js inside.
    
    3.  In ../amdjs-tests/server/manifest.js, add:

        exports.manifest.amdlite = {
            name:   'amdlite @ 1',
            impl:   'amdlite/amdlite.js',
            config: 'amdlite/config.js'
        };

*/

var config = define.amd.lite.config;

var go = define;

var implemented = {
    basic: true
  , anon: true
  //, funcString: true
  //, namedWrapped: true
  , require: true

  // plugin support
  
  //, plugins: true
  //, pluginDynamic: true

  // config proposal
  
  //, pathsConfig: true
  //, packagesConfig: true
  //, mapConfig: true
  //, moduleConfig: true
  //, shimConfig: true

};

require = undefined;

