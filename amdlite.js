/* jshint sub:true */
(
/** 
    amdlite.js
    
    @param {Object} global
    @param {undefined=} undefined
*/
function(global, undefined){

    'use strict';
    
    /** @const */
    var E_REQUIRE_FAILED = 'malformed require';
    
    /** Modules waiting for dependencies to be exported.
    
        @type {Array.<Module>}
    */
    var pendingModules = [];
    
    /** New modules since the last script loaded.
    
        @type {Array.<Module>}
    */
    var newModules = [];

    /** Loaded modules, keyed by id.
    
        @type {Object.<Module>}
    */
    var cache = { };
    
    /** Names of modules which are loading/loaded.
    
        @type {Object.<boolean>}
    */
    var loads = { };
    
    /** Module definition.
    
        @name Module
        
        @constructor
        
        @param {string?=} id
            Optional string identifying the module.
        @param {Array.<string>?=} dependencies
            Optional array of strings identifying the module's dependencies.
        @param {function(...)?=} factory
            Optional function returning the export value of the module.
        @param {?=} exportValue
            Optional export value for modules without a factory.
        @param {function(Module)?=} generator
            Optional function returning a dynamic export value for the module.
    */
    function Module(id, dependencies, factory, exportValue, generator) {
        this.id = id;
        this.dependencies = dependencies;
        this.factoryFunction = factory;
        this['exports'] = {};
        this.generator = generator;
        this['global'] = global;
        if (!factory) {
            this.exportValue = exportValue || this['exports'];
        }
    }

    /** Load dependencies.
    */
    Module.prototype.loadDependencies = function () {
        var dependencies = this.dependencies;
        var id, i;
        
        for (i = dependencies.length; i--;) {
            id = dependencies[i];
            
            // normalize relative deps
            // TODO: normalize 'dot dot' segments
            if (id.charAt(0) == '.') {
                if (this.id.indexOf('/') >= 0) {
                    id = this.id.replace(/\/[^/]*$/, '/') + id;
                } else {
                    id = '/' + id;
                }
                id = id.replace(/[/]\.[/]/g, '/');
                dependencies[i] = id;
            }
            
            // load deps that haven't started loading yet
            if (!loads.hasOwnProperty(id)) {
                this.loadScript(id);
            }
        }
    };
    
    /** Check dependencies.
    
        Checks if all dependencies of a module are ready.
        
        @param {string=} ignore
            Module name to ignore, for circular reference check.
        
        @return {boolean} true if all dependencies are ready, else false.
    */
    Module.prototype.checkDependencies = function (ignore) {
        var dependencies = this.dependencies || []; 
        var dep, i;
        
        for (i = dependencies.length; i--;) {
            dep = getCached(dependencies[i]);
            // if the dependency doesn't exist, it's not ready
            if (!dep) {
                return false;
            }
            // if the dependency already exported something, it's ready
            if (dep.exportValue) {
                continue;
            }
            // if the dependency is only blocked by this module, it's ready
            // (circular reference check, this module)
            if (!ignore && dep.checkDependencies(this.id)) {
                continue;
            }
            // if we're ignoring this dependency, it's ready
            // (circular reference check, dependency of dependency)
            if (ignore && (ignore == dep.id)) {
                continue;
            }
            // else it's not ready
            return false;
        }
        return true;
    };
    
    /** Get dependency value.
    
        Gets the value of a cached or builtin dependency module by id.
        
        @return the dependency value.
    */
    Module.prototype.getDependencyValue = function (id) {
        /** @type {Module} */
        var dep = getCached(id);
        
        return dep.generator ? dep.generator(this) : dep.exportValue;
    };
    
    /** Load a script by module id.
        
        @param {string} id
            Module id.
    */
    Module.prototype.loadScript = function (id) {
        var script = document.createElement('script'),
            parent = document.documentElement.children[0];
        
        loads[id] = true;
        script.onload = script.onreadystatechange = function() {
            var hasDefinition; // anonymous or matching id
            var module;
            
            // exit early if the script isn't loaded
            if (typeof script.readyState == 'string' &&
                    !script.readyState.match(/^(loaded|complete)$/)) {
                return;
            }
            // loading amd modules
            while ((module = newModules.pop())) {
                if ((!module.id) || (module.id == id)) {
                    hasDefinition = true;
                    module.id = id;
                }
                if (!getCached(module.id)) {
                    cache[module.id] = module;
                }
            }
            // loading alien script
            if (!hasDefinition) {
                module = new Module(id);
                cache[id] = module;
            }
            // set export values for modules that have all dependencies ready
            exportValues();
            parent.removeChild(script);
        };
        script.src = id + '.js';
        parent.appendChild(script);
    };
    
    /** Define a module.
    
        Wrap Module constructor and fiddle with optional arguments.
        
        @param {?=} id
            Module id.
        @param {?=} dependencies
            Module dependencies.
        @param {?=} factory
            Module factory.
    */
    function define(id, dependencies, factory) {
        var argc = arguments.length;
        var defaultDeps = ["require", "exports", "module"];
        var module, exportValue;
        
        if (argc == 1) {
            factory = id;
            dependencies = defaultDeps;
            id = undefined;
        } else if (argc == 2) {
            factory = dependencies;
            if (typeof id == 'string') {
                dependencies = defaultDeps;
            } else {
                dependencies = id;
                id = undefined;
            }
        }
        if (typeof factory != 'function') {
            exportValue = factory;
            factory = undefined;
        }
        module = new Module(id, dependencies, factory, exportValue);
        newModules.push(module);
        pendingModules.push(module);
        setTimeout(function(){ module.loadDependencies(); }, 0);
        exportValues();
        
        return module;
    }
        
    /** Get a cached module.
        
        @param {string} id
            Module id.
    */
    function getCached(id) {
        if (cache.hasOwnProperty(id)) {
            return cache[id];
        }
    }
    
    /** Export module values.
    
        For each module with all dependencies ready, set the
        export value from the factory or exports object.
    */
    function exportValues() {
        var count = 0;
        var lastCount = 1;
        var i, j, module, factory, args, id, value;
        
        while (count != lastCount) {
            lastCount = count;
            for (i = pendingModules.length; i--;) {
                module = pendingModules[i];
                if ((!module.exportValue) && module.checkDependencies()) {
                    pendingModules.splice(i, 1);
                    factory = module.factoryFunction;
                    args = [];
                    for (j = module.dependencies.length; j--;) {
                        id = module.dependencies[j];
                        args.unshift(module.getDependencyValue(id));
                    }
                    value = factory.apply(module['exports'], args);
                    module.exportValue = value || module['exports'];
                    ++count;
                }
            }
        }
    }
    
    /** Built-in require function.
    
        If callback is present, call define, else return the export value
        of the cached module identified by the first argument.
        
        https://github.com/amdjs/amdjs-api/blob/master/require.md
        
        @param {string|Array.<string>} dependencies
            Module dependencies.
        @param {function()=} callback
            Module factory.
            
        @return {Module|undefined}
    */
    function require(dependencies, callback) {
        if (dependencies.push && callback) {
            define(dependencies, callback);
        } else if (typeof dependencies == 'string') {
            return getCached(dependencies).exportValue;
        } else {
            throw new Error(E_REQUIRE_FAILED);
        }
    }
    
    // Built-in dynamic modules
    
    function dynamic(id, generator) {
        cache[id] = new Module(id, undefined, undefined, undefined, generator);
        loads[id] = true;
    }
    
    dynamic('require', function (module) {
        function r() {
            return require.apply(global, arguments);
        }
        r['toUrl'] = function(path) {
            return module.id + '/' + path;
        };
        return r;
    });
    
    dynamic('exports', function (module) {
        return module['exports'];
    });
    
    dynamic('module', function (module) {
        return module;
    });
    
    // Exports, closure compiler style
    
    global['define'] = define;
    global['define']['amd'] = { 'lite': {
        // if we support common config later, do it here.
        'config': function(){}
    } };
    
}(this));

