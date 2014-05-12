(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//     Backbone.js 1.1.2

//     (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    factory(root, exports, _);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.2';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model, options);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : _.clone(models);
      var i, l, id, model, attrs, existing, sort;
      var at = options.at;
      var targetModel = this.model;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        attrs = models[i] || {};
        if (attrs instanceof Model) {
          id = model = attrs;
        } else {
          id = attrs[targetModel.prototype.idAttribute || 'id'];
        }

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(id)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge) {
            attrs = attrs === model ? model.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);
          this._addReference(model, options);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (order && (model.isNew() || !modelMap[model.id])) order.push(model);
        modelMap[model.id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (i = 0, l = orderedModels.length; i < l; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          (model = toAdd[i]).trigger('add', model, this, options);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) return attrs;
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      if (model.id != null) this._byId[model.id] = model;
      if (!model.collection) model.collection = this;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy', 'indexBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  var noXhrPatch =
    typeof window !== 'undefined' && !!window.ActiveXObject &&
      !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        router.execute(callback, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = decodeURI(this.location.pathname + this.location.search);
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
        this.iframe = frame.hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot() && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment);
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));

},{"underscore":2}],2:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}],3:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v2.1.0
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-01-23T21:10Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper window is present,
		// execute the factory and get jQuery
		// For environments that do not inherently posses a window with a document
		// (such as Node.js), expose a jQuery-making factory as module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Can't do this because several apps including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
// Support: Firefox 18+
//

var arr = [];

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var trim = "".trim;

var support = {};



var
	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,

	version = "2.1.0",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return a 'clean' array
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return just the object
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		return obj - parseFloat( obj ) >= 0;
	},

	isPlainObject: function( obj ) {
		// Not plain objects:
		// - Any object or value whose internal [[Class]] property is not "[object Object]"
		// - DOM nodes
		// - window
		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		// Support: Firefox <20
		// The try/catch suppresses exceptions thrown when attempting to access
		// the "constructor" property of certain host objects, ie. |window.location|
		// https://bugzilla.mozilla.org/show_bug.cgi?id=814622
		try {
			if ( obj.constructor &&
					!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
				return false;
			}
		} catch ( e ) {
			return false;
		}

		// If the function hasn't returned already, we're confident that
		// |obj| is a plain object, created by {} or constructed with new Object
		return true;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		// Support: Android < 4.0, iOS < 6 (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		var script,
			indirect = eval;

		code = jQuery.trim( code );

		if ( code ) {
			// If the code includes a valid, prologue position
			// strict mode pragma, execute code by injecting a
			// script tag into the document.
			if ( code.indexOf("use strict") === 1 ) {
				script = document.createElement("script");
				script.text = code;
				document.head.appendChild( script ).parentNode.removeChild( script );
			} else {
			// Otherwise, avoid the DOM node creation, insertion
			// and removal by using an indirect global eval
				indirect( code );
			}
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	trim: function( text ) {
		return text == null ? "" : trim.call( text );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {
	var length = obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v1.10.16
 * http://sizzlejs.com/
 *
 * Copyright 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-01-13
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	compile,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:([*^$|!~]?=)" + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments quoted,
	//   then not containing pseudos/brackets,
	//   then attribute selectors/non-parenthetical expressions,
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + attributes.replace( 3, 8 ) + ")*)|.*)\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== strundefined && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare,
		doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.defaultView;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", function() {
				setDocument();
			}, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", function() {
				setDocument();
			});
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Check if getElementsByClassName can be trusted
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName ) && assert(function( div ) {
		div.innerHTML = "<div class='a'></div><div class='a i'></div>";

		// Support: Safari<4
		// Catch class over-caching
		div.firstChild.className = "i";
		// Support: Opera<10
		// Catch gEBCN failure to find non-leading classes
		return div.getElementsByClassName("i").length === 2;
	});

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select t=''><option selected=''></option></select>";

			// Support: IE8, Opera 10-12
			// Nothing should be selected when empty strings follow ^= or $= or *=
			if ( div.querySelectorAll("[t^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [elem] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[5] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] && match[4] !== undefined ) {
				match[2] = match[4];

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

function tokenize( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
}

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, group /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !group ) {
			group = tokenize( selector );
		}
		i = group.length;
		while ( i-- ) {
			cached = matcherFromTokens( group[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
	}
	return cached;
};

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function select( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		match = tokenize( selector );

	if ( !seed ) {
		// Try to minimize operations if there is only one group
		if ( match.length === 1 ) {

			// Take a shortcut and set the context if the root selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					support.getById && context.nodeType === 9 && documentIsHTML &&
					Expr.relative[ tokens[1].type ] ) {

				context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
				if ( !context ) {
					return results;
				}
				selector = selector.slice( tokens.shift().value.length );
			}

			// Fetch a seed set for right-to-left matching
			i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
			while ( i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( runescape, funescape ),
						rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && toSelector( tokens );
						if ( !selector ) {
							push.apply( results, seed );
							return results;
						}

						break;
					}
				}
			}
		}
	}

	// Compile and execute a filtering function
	// Provide `match` to avoid retokenization if we modified the selector above
	compile( selector, match )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
}

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome<14
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) >= 0 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			len = this.length,
			ret = [],
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	init = jQuery.fn.init = function( selector, context ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return typeof rootjQuery.ready !== "undefined" ?
				rootjQuery.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter(function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.unique(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	while ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.unique( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
});
var rnotwhite = (/\S+/g);



// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});


// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {
	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend({
	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.trigger ) {
			jQuery( document ).trigger("ready").off("ready");
		}
	}
});

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed, false );
	window.removeEventListener( "load", completed, false );
	jQuery.ready();
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready );

		} else {

			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed, false );
		}
	}
	return readyList.promise( obj );
};

// Kick off the DOM ready check even if the user does not
jQuery.ready.promise();




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			len ? fn( elems[0], key ) : emptyGet;
};


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( owner ) {
	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	/* jshint -W018 */
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};


function Data() {
	// Support: Android < 4,
	// Old WebKit does not have Object.preventExtensions/freeze method,
	// return new empty object instead with no [[set]] accessor
	Object.defineProperty( this.cache = {}, 0, {
		get: function() {
			return {};
		}
	});

	this.expando = jQuery.expando + Math.random();
}

Data.uid = 1;
Data.accepts = jQuery.acceptData;

Data.prototype = {
	key: function( owner ) {
		// We can accept data for non-element nodes in modern browsers,
		// but we should not, see #8335.
		// Always return the key for a frozen object.
		if ( !Data.accepts( owner ) ) {
			return 0;
		}

		var descriptor = {},
			// Check if the owner object already has a cache key
			unlock = owner[ this.expando ];

		// If not, create one
		if ( !unlock ) {
			unlock = Data.uid++;

			// Secure it in a non-enumerable, non-writable property
			try {
				descriptor[ this.expando ] = { value: unlock };
				Object.defineProperties( owner, descriptor );

			// Support: Android < 4
			// Fallback to a less secure definition
			} catch ( e ) {
				descriptor[ this.expando ] = unlock;
				jQuery.extend( owner, descriptor );
			}
		}

		// Ensure the cache object
		if ( !this.cache[ unlock ] ) {
			this.cache[ unlock ] = {};
		}

		return unlock;
	},
	set: function( owner, data, value ) {
		var prop,
			// There may be an unlock assigned to this node,
			// if there is no entry for this "owner", create one inline
			// and set the unlock as though an owner entry had always existed
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		// Handle: [ owner, key, value ] args
		if ( typeof data === "string" ) {
			cache[ data ] = value;

		// Handle: [ owner, { properties } ] args
		} else {
			// Fresh assignments by object are shallow copied
			if ( jQuery.isEmptyObject( cache ) ) {
				jQuery.extend( this.cache[ unlock ], data );
			// Otherwise, copy the properties one-by-one to the cache object
			} else {
				for ( prop in data ) {
					cache[ prop ] = data[ prop ];
				}
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		// Either a valid cache is found, or will be created.
		// New caches will be created and the unlock returned,
		// allowing direct access to the newly created
		// empty data object. A valid owner object must be provided.
		var cache = this.cache[ this.key( owner ) ];

		return key === undefined ?
			cache : cache[ key ];
	},
	access: function( owner, key, value ) {
		var stored;
		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				((key && typeof key === "string") && value === undefined) ) {

			stored = this.get( owner, key );

			return stored !== undefined ?
				stored : this.get( owner, jQuery.camelCase(key) );
		}

		// [*]When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i, name, camel,
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		if ( key === undefined ) {
			this.cache[ unlock ] = {};

		} else {
			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = key.concat( key.map( jQuery.camelCase ) );
			} else {
				camel = jQuery.camelCase( key );
				// Try the string as a key before any manipulation
				if ( key in cache ) {
					name = [ key, camel ];
				} else {
					// If a key with the spaces exists, use it.
					// Otherwise, create an array by matching non-whitespace
					name = camel;
					name = name in cache ?
						[ name ] : ( name.match( rnotwhite ) || [] );
				}
			}

			i = name.length;
			while ( i-- ) {
				delete cache[ name[ i ] ];
			}
		}
	},
	hasData: function( owner ) {
		return !jQuery.isEmptyObject(
			this.cache[ owner[ this.expando ] ] || {}
		);
	},
	discard: function( owner ) {
		if ( owner[ this.expando ] ) {
			delete this.cache[ owner[ this.expando ] ];
		}
	}
};
var data_priv = new Data();

var data_user = new Data();



/*
	Implementation Summary

	1. Enforce API surface and semantic compatibility with 1.9.x branch
	2. Improve the module's maintainability by reducing the storage
		paths to a single mechanism.
	3. Use the same single mechanism to support "private" and "user" data.
	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
	5. Avoid exposing implementation details on user objects (eg. expando properties)
	6. Provide a clear path for implementation upgrade to WeakMap in 2014
*/
var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /([A-Z])/g;

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			data_user.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend({
	hasData: function( elem ) {
		return data_user.hasData( elem ) || data_priv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return data_user.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		data_user.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to data_priv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return data_priv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		data_priv.remove( elem, name );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = data_user.get( elem );

				if ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {
						name = attrs[ i ].name;

						if ( name.indexOf( "data-" ) === 0 ) {
							name = jQuery.camelCase( name.slice(5) );
							dataAttr( elem, name, data[ name ] );
						}
					}
					data_priv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				data_user.set( this, key );
			});
		}

		return access( this, function( value ) {
			var data,
				camelKey = jQuery.camelCase( key );

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {
				// Attempt to get data from the cache
				// with the key as-is
				data = data_user.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to get data from the cache
				// with the key camelized
				data = data_user.get( elem, camelKey );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, camelKey, undefined );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each(function() {
				// First, attempt to store a copy or reference of any
				// data that might've been store with a camelCased key.
				var data = data_user.get( this, camelKey );

				// For HTML5 data-* attribute interop, we have to
				// store property names with dashes in a camelCase form.
				// This might not apply to all properties...*
				data_user.set( this, camelKey, value );

				// *... In the case of properties that might _actually_
				// have dashes, we need to also store a copy of that
				// unchanged property.
				if ( key.indexOf("-") !== -1 && data !== undefined ) {
					data_user.set( this, key, value );
				}
			});
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each(function() {
			data_user.remove( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = data_priv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = data_priv.access( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return data_priv.get( elem, key ) || data_priv.access( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				data_priv.remove( elem, [ type + "queue", key ] );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = data_priv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;

var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHidden = function( elem, el ) {
		// isHidden might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;
		return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
	};

var rcheckableType = (/^(?:checkbox|radio)$/i);



(function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) );

	// #11217 - WebKit loses check when the name is after the checked attribute
	div.innerHTML = "<input type='radio' checked='checked' name='t'/>";

	// Support: Safari 5.1, iOS 5.1, Android 4.x, Android 2.3
	// old WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Make sure textarea (and checkbox) defaultValue is properly cloned
	// Support: IE9-IE11+
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
})();
var strundefined = typeof undefined;



support.focusinBubbles = "onfocusin" in window;


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.hasData( elem ) && data_priv.get( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;
			data_priv.remove( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, j, ret, matched, handleObj,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, matches, sel, handleObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: Cordova 2.5 (WebKit) (#13255)
		// All events should have a target; Cordova deviceready doesn't
		if ( !event.target ) {
			event.target = document;
		}

		// Support: Safari 6.0+, Chrome < 28
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle, false );
	}
};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				// Support: Android < 4.0
				src.defaultPrevented === undefined &&
				src.getPreventDefault && src.getPreventDefault() ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && e.preventDefault ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && e.stopPropagation ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
// Support: Chrome 15+
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// Create "bubbling" focus and blur events
// Support: Firefox, Chrome, Safari
if ( !support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				data_priv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					data_priv.remove( doc, fix );

				} else {
					data_priv.access( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


var
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {

		// Support: IE 9
		option: [ 1, "<select multiple='multiple'>", "</select>" ],

		thead: [ 1, "<table>", "</table>" ],
		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		_default: [ 0, "", "" ]
	};

// Support: IE 9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: 1.x compatibility
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute("type");
	}

	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		data_priv.set(
			elems[ i ], "globalEval", !refElements || data_priv.get( refElements[ i ], "globalEval" )
		);
	}
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( data_priv.hasData( src ) ) {
		pdataOld = data_priv.access( src );
		pdataCur = data_priv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( data_user.hasData( src ) ) {
		udataOld = data_user.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		data_user.set( dest, udataCur );
	}
}

function getAll( context, tag ) {
	var ret = context.getElementsByTagName ? context.getElementsByTagName( tag || "*" ) :
			context.querySelectorAll ? context.querySelectorAll( tag || "*" ) :
			[];

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], ret ) :
		ret;
}

// Support: IE >= 9
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Support: IE >= 9
		// Fix Cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var elem, tmp, tag, wrap, contains, j,
			fragment = context.createDocumentFragment(),
			nodes = [],
			i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					// Support: QtWebKit
					// jQuery.merge because push.apply(_, arraylike) throws
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					tmp.innerHTML = wrap[ 1 ] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[ 2 ];

					// Descend through wrappers to the right content
					j = wrap[ 0 ];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Support: QtWebKit
					// jQuery.merge because push.apply(_, arraylike) throws
					jQuery.merge( nodes, tmp.childNodes );

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Fixes #12346
					// Support: Webkit, IE
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( fragment.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		return fragment;
	},

	cleanData: function( elems ) {
		var data, elem, events, type, key, j,
			special = jQuery.event.special,
			i = 0;

		for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
			if ( jQuery.acceptData( elem ) ) {
				key = elem[ data_priv.expando ];

				if ( key && (data = data_priv.cache[ key ]) ) {
					events = Object.keys( data.events || {} );
					if ( events.length ) {
						for ( j = 0; (type = events[j]) !== undefined; j++ ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}
					if ( data_priv.cache[ key ] ) {
						// Discard any remaining `private` data
						delete data_priv.cache[ key ];
					}
				}
			}
			// Discard any remaining `user` data
			delete data_user.cache[ elem[ data_user.expando ] ];
		}
	}
});

jQuery.fn.extend({
	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each(function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				});
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	remove: function( selector, keepData /* Internal Use Only */ ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {
			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var arg = arguments[ 0 ];

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			arg = this.parentNode;

			jQuery.cleanData( getAll( this ) );

			if ( arg ) {
				arg.replaceChild( elem, this );
			}
		});

		// Force removal if there was no new content (e.g., from empty arguments)
		return arg && (arg.length || arg.nodeType) ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var fragment, first, scripts, hasScripts, node, doc,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[ 0 ],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[ 0 ] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							// Support: QtWebKit
							// jQuery.merge because push.apply(_, arraylike) throws
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[ i ], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!data_priv.access( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
							}
						}
					}
				}
			}
		}

		return this;
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: QtWebKit
			// .get() because push.apply(_, arraylike) throws
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});


var iframe,
	elemdisplay = {};

/**
 * Retrieve the actual display of a element
 * @param {String} name nodeName of the element
 * @param {Object} doc Document object
 */
// Called only from within defaultDisplay
function actualDisplay( name, doc ) {
	var elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

		// getDefaultComputedStyle might be reliably used only on attached element
		display = window.getDefaultComputedStyle ?

			// Use of this method is a temporary fix (more like optmization) until something better comes along,
			// since it was removed from specification and supported only in FF
			window.getDefaultComputedStyle( elem[ 0 ] ).display : jQuery.css( elem[ 0 ], "display" );

	// We don't have any data stored on the element,
	// so use "detach" method as fast way to get rid of the element
	elem.detach();

	return display;
}

/**
 * Try to determine the default display value of an element
 * @param {String} nodeName
 */
function defaultDisplay( nodeName ) {
	var doc = document,
		display = elemdisplay[ nodeName ];

	if ( !display ) {
		display = actualDisplay( nodeName, doc );

		// If the simple way fails, read from inside an iframe
		if ( display === "none" || !display ) {

			// Use the already-created iframe if possible
			iframe = (iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" )).appendTo( doc.documentElement );

			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
			doc = iframe[ 0 ].contentDocument;

			// Support: IE
			doc.write();
			doc.close();

			display = actualDisplay( nodeName, doc );
			iframe.detach();
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return display;
}
var rmargin = (/^margin/);

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {
		return elem.ownerDocument.defaultView.getComputedStyle( elem, null );
	};



function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE9
	// getPropertyValue is only needed for .css('filter') in IE9, see #12537
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];
	}

	if ( computed ) {

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// Support: iOS < 6
		// A tribute to the "awesome hack by Dean Edwards"
		// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
		// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
		if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?
		// Support: IE
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {
	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {
				// Hook not needed (or it's not possible to use it due to missing dependency),
				// remove it.
				// Since there are no other hooks for marginRight, remove the whole object.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.

			return (this.get = hookFn).apply( this, arguments );
		}
	};
}


(function() {
	var pixelPositionVal, boxSizingReliableVal,
		// Support: Firefox, Android 2.3 (Prefixed box-sizing versions).
		divReset = "padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;" +
			"-moz-box-sizing:content-box;box-sizing:content-box",
		docElem = document.documentElement,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:0;height:0;position:absolute;top:0;left:-9999px;" +
		"margin-top:1px";
	container.appendChild( div );

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computePixelPositionAndBoxSizingReliable() {
		// Support: Firefox, Android 2.3 (Prefixed box-sizing versions).
		div.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +
			"box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;" +
			"position:absolute;top:1%";
		docElem.appendChild( container );

		var divStyle = window.getComputedStyle( div, null );
		pixelPositionVal = divStyle.top !== "1%";
		boxSizingReliableVal = divStyle.width === "4px";

		docElem.removeChild( container );
	}

	// Use window.getComputedStyle because jsdom on node.js will break without it.
	if ( window.getComputedStyle ) {
		jQuery.extend(support, {
			pixelPosition: function() {
				// This test is executed only once but we still do memoizing
				// since we can use the boxSizingReliable pre-computing.
				// No need to check if the test was already performed, though.
				computePixelPositionAndBoxSizingReliable();
				return pixelPositionVal;
			},
			boxSizingReliable: function() {
				if ( boxSizingReliableVal == null ) {
					computePixelPositionAndBoxSizingReliable();
				}
				return boxSizingReliableVal;
			},
			reliableMarginRight: function() {
				// Support: Android 2.3
				// Check if div with explicit width and no margin-right incorrectly
				// gets computed margin-right based on width of container. (#3333)
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// This support function is only executed once so no memoizing is needed.
				var ret,
					marginDiv = div.appendChild( document.createElement( "div" ) );
				marginDiv.style.cssText = div.style.cssText = divReset;
				marginDiv.style.marginRight = marginDiv.style.width = "0";
				div.style.width = "1px";
				docElem.appendChild( container );

				ret = !parseFloat( window.getComputedStyle( marginDiv, null ).marginRight );

				docElem.removeChild( container );

				// Clean up the div for other support tests.
				div.innerHTML = "";

				return ret;
			}
		});
	}
})();


// A method for quickly swapping in/out CSS properties to get correct calculations.
jQuery.swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var
	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),
	rrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: 0,
		fontWeight: 400
	},

	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name[0].toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var valueIsBorderBox = true,
		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

function showHide( elements, show ) {
	var display, elem, hidden,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		values[ index ] = data_priv.get( elem, "olddisplay" );
		display = elem.style.display;
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = data_priv.access( elem, "olddisplay", defaultDisplay(elem.nodeName) );
			}
		} else {

			if ( !values[ index ] ) {
				hidden = isHidden( elem );

				if ( display && display !== "none" || !hidden ) {
					data_priv.set( elem, "olddisplay", hidden ? display : jQuery.css(elem, "display") );
				}
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"columnCount": true,
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set. See: #7116
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// Fixes #8908, it can be done more correctly by specifying setters in cssHooks,
			// but it would mean to define eight (for every problematic property) identical functions
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				// Support: Chrome, Safari
				// Setting style to blank string required to delete "style: x !important;"
				style[ name ] = "";
				style[ name ] = value;
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	}
});

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				return elem.offsetWidth === 0 && rdisplayswap.test( jQuery.css( elem, "display" ) ) ?
					jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					}) :
					getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var styles = extra && getStyles( elem );
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				) : 0
			);
		}
	};
});

// Support: Android 2.3
jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
	function( elem, computed ) {
		if ( computed ) {
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			// Work around by temporarily setting element display to inline-block
			return jQuery.swap( elem, { "display": "inline-block" },
				curCSS, [ elem, "marginRight" ] );
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});

jQuery.fn.extend({
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each(function() {
			if ( isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE9
// Panic based approach to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	}
};

jQuery.fx = Tween.prototype.init;

// Back Compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value ),
				target = tween.cur(),
				parts = rfxnum.exec( value ),
				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

				// Starting value computation is required for potential unit mismatches
				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
				scale = 1,
				maxIterations = 20;

			if ( start && start[ 3 ] !== unit ) {
				// Trust units reported by jQuery.css
				unit = unit || start[ 3 ];

				// Make sure we update the tween properties later on
				parts = parts || [];

				// Iteratively approximate from a nonzero starting point
				start = +target || 1;

				do {
					// If previous iteration zeroed out, double until we get *something*
					// Use a string for doubling factor so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					start = start / scale;
					jQuery.style( tween.elem, prop, start + unit );

				// Update scale, tolerating zero or NaN from tween.cur()
				// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
			}

			// Update tween properties
			if ( parts ) {
				start = tween.start = +start || +target || 0;
				tween.unit = unit;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[ 1 ] ?
					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
					+parts[ 2 ];
			}

			return tween;
		} ]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( (tween = collection[ index ].call( animation, prop, value )) ) {

			// we're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, tween, hooks, oldfire, display,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHidden( elem ),
		dataShow = data_priv.get( elem, "fxshow" );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE9-10 do not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		display = jQuery.css( elem, "display" );
		// Get default display if display is currently "none"
		if ( display === "none" ) {
			display = defaultDisplay( elem.nodeName );
		}
		if ( display === "inline" &&
				jQuery.css( elem, "float" ) === "none" ) {

			style.display = "inline-block";
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always(function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		});
	}

	// show/hide pass
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	if ( !jQuery.isEmptyObject( orig ) ) {
		if ( dataShow ) {
			if ( "hidden" in dataShow ) {
				hidden = dataShow.hidden;
			}
		} else {
			dataShow = data_priv.access( elem, "fxshow", {} );
		}

		// store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;

			data_priv.remove( elem, "fxshow" );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( prop in orig ) {
			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || data_priv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = data_priv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = data_priv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// enable finishing flag on private data
			data.finish = true;

			// empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// turn off finishing flag
			delete data.finish;
		});
	}
});

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;

jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = setTimeout( next, time );
		hooks.stop = function() {
			clearTimeout( timeout );
		};
	});
};


(function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: iOS 5.1, Android 4.x, Android 2.3
	// Check the default checkbox/radio value ("" on old WebKit; "on" elsewhere)
	support.checkOn = input.value !== "";

	// Must access the parent to make an option select properly
	// Support: IE9, IE10
	support.optSelected = opt.selected;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Check if an input maintains its value after becoming a radio
	// Support: IE9, IE10
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
})();


var nodeHook, boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					elem[ propName ] = false;
				}

				elem.removeAttribute( name );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to default in case type is set after value during creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	}
});

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle;
		if ( !isXML ) {
			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ name ];
			attrHandle[ name ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				name.toLowerCase() :
				null;
			attrHandle[ name ] = handle;
		}
		return ret;
	};
});




var rfocusable = /^(?:input|select|textarea|button)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each(function() {
			delete this[ jQuery.propFix[ name ] || name ];
		});
	}
});

jQuery.extend({
	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				return elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ?
					elem.tabIndex :
					-1;
			}
		}
	}
});

// Support: IE9+
// Selectedness for an option in an optgroup can be inaccurate
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});




var rclass = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = arguments.length === 0 || typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					classNames = value.match( rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					data_priv.set( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed "false",
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});




var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// IE6-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ? !option.disabled : option.getAttribute( "disabled" ) === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( (option.selected = jQuery.inArray( jQuery(option).val(), values ) >= 0) ) {
						optionSet = true;
					}
				}

				// force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			// Support: Webkit
			// "" is returned instead of "on" if a value isn't specified
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});


var nonce = jQuery.now();

var rquery = (/\?/);



// Support: Android 2.3
// Workaround failure to string-cast null input
jQuery.parseJSON = function( data ) {
	return JSON.parse( data + "" );
};


// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, tmp;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE9
	try {
		tmp = new DOMParser();
		xml = tmp.parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	// Document location
	ajaxLocParts,
	ajaxLocation,

	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat("*");

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType[0] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

		// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,
			// URL without anti-cache param
			cacheURL,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" )
			.replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});


jQuery._evalUrl = function( url ) {
	return jQuery.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: false,
		global: false,
		"throws": true
	});
};


jQuery.fn.extend({
	wrapAll: function( html ) {
		var wrap;

		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapAll( html.call(this, i) );
			});
		}

		if ( this[ 0 ] ) {

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	}
});


jQuery.expr.filters.hidden = function( elem ) {
	// Support: Opera <= 12.12
	// Opera reports offsetWidths and offsetHeights less than zero on some elements
	return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
};
jQuery.expr.filters.visible = function( elem ) {
	return !jQuery.expr.filters.hidden( elem );
};




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


jQuery.ajaxSettings.xhr = function() {
	try {
		return new XMLHttpRequest();
	} catch( e ) {}
};

var xhrId = 0,
	xhrCallbacks = {},
	xhrSuccessStatus = {
		// file protocol always yields status code 0, assume 200
		0: 200,
		// Support: IE9
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE9
// Open requests must be manually aborted on unload (#5280)
if ( window.ActiveXObject ) {
	jQuery( window ).on( "unload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]();
		}
	});
}

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport(function( options ) {
	var callback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr(),
					id = ++xhrId;

				xhr.open( options.type, options.url, options.async, options.username, options.password );

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers["X-Requested-With"] ) {
					headers["X-Requested-With"] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							delete xhrCallbacks[ id ];
							callback = xhr.onload = xhr.onerror = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {
								complete(
									// file: protocol always yields status 0; see #8605, #14207
									xhr.status,
									xhr.statusText
								);
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,
									// Support: IE9
									// Accessing binary-data responseText throws an exception
									// (#11426)
									typeof xhr.responseText === "string" ? {
										text: xhr.responseText
									} : undefined,
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				xhr.onerror = callback("error");

				// Create the abort callback
				callback = xhrCallbacks[ id ] = callback("abort");

				// Do send the request
				// This may raise an exception which is actually
				// handled in jQuery.ajax (so no try/catch here)
				xhr.send( options.hasContent && options.data || null );
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {
	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery("<script>").prop({
					async: true,
					charset: s.scriptCharset,
					src: s.url
				}).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});




// data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	context = context || document;

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = jQuery.buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Keep a copy of the old load method
var _load = jQuery.fn.load;

/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = url.slice( off );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};




jQuery.expr.filters.animated = function( elem ) {
	return jQuery.grep(jQuery.timers, function( fn ) {
		return elem === fn.elem;
	}).length;
};




var docElem = window.document.documentElement;

/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf("auto") > -1;

		// Need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend({
	offset: function( options ) {
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each(function( i ) {
					jQuery.offset.setOffset( this, options, i );
				});
		}

		var docElem, win,
			elem = this[ 0 ],
			box = { top: 0, left: 0 },
			doc = elem && elem.ownerDocument;

		if ( !doc ) {
			return;
		}

		docElem = doc.documentElement;

		// Make sure it's not a disconnected DOM node
		if ( !jQuery.contains( docElem, elem ) ) {
			return box;
		}

		// If we don't have gBCR, just use 0,0 rather than error
		// BlackBerry 5, iOS 3 (original iPhone)
		if ( typeof elem.getBoundingClientRect !== strundefined ) {
			box = elem.getBoundingClientRect();
		}
		win = getWindow( doc );
		return {
			top: box.top + win.pageYOffset - docElem.clientTop,
			left: box.left + win.pageXOffset - docElem.clientLeft
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {
			// We assume that getBoundingClientRect is available when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;

			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || docElem;
		});
	}
});

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : window.pageXOffset,
					top ? val : window.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// getComputedStyle returns percent when specified for top/left/bottom/right
// rather than make the css module depend on the offset module, we just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );
				// if curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
});


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});


// The number of elements contained in the matched element set
jQuery.fn.size = function() {
	return this.length;
};

jQuery.fn.andSelf = jQuery.fn.addBack;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}




var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in
// AMD (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === strundefined ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;

}));

},{}],4:[function(require,module,exports){
/*! Socket.IO.js build:0.9.16, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

var io = ('undefined' === typeof module ? {} : module.exports);
(function() {

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.9.16';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = kv[1];
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest && !util.ua.hasCORS) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new window[(['Active'].concat('Object').join('X'))]('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */

  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */

  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  };

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

   /**
   * Detect iPad/iPhone/iPod.
   *
   * @api public
   */

  util.ua.iDevice = 'undefined' != typeof navigator
      && /iPad|iPhone|iPod/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    if (name === undefined) {
      this.$events = {};
      return this;
    }

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  "use strict";

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    };
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"' : '\\"',
          '\\': '\\\\'
      },
      rep;


  function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return typeof c === 'string' ? c :
              '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
  }


  function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value instanceof Date) {
          value = date(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
      case 'string':
          return quote(value);

      case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

          return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

          return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

      case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

          if (!value) {
              return 'null';
          }

// Make an array to hold the partial results of stringifying this object value.

          gap += indent;
          partial = [];

// Is the value an array?

          if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

              length = value.length;
              for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
              }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

              v = partial.length === 0 ? '[]' : gap ?
                  '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                  '[' + partial.join(',') + ']';
              gap = mind;
              return v;
          }

// If the replacer is an array, use it to select the members to be stringified.

          if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                      k = rep[i];
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          } else {

// Otherwise, iterate through all of the keys in the object.

              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

          v = partial.length === 0 ? '{}' : gap ?
              '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
              '{' + partial.join(',') + '}';
          gap = mind;
          return v;
      }
  }

// If the JSON object does not yet have a stringify method, give it one.

  JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

      var i;
      gap = '';
      indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

      if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
              indent += ' ';
          }

// If the space parameter is a string, it will be used as the indent string.

      } else if (typeof space === 'string') {
          indent = space;
      }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

      rep = replacer;
      if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
              typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
      }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

      return str('', {'': value});
  };

// If the JSON object does not yet have a parse method, give it one.

  JSON.parse = function (text, reviver) {
  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

      var j;

      function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

          var k, v, value = holder[key];
          if (value && typeof value === 'object') {
              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = walk(value, k);
                      if (v !== undefined) {
                          value[k] = v;
                      } else {
                          delete value[k];
                      }
                  }
              }
          }
          return reviver.call(holder, key, value);
      }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
          text = text.replace(cx, function (a) {
              return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          });
      }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

      if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

          j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

          return typeof reviver === 'function' ?
              walk({'': j}, '') : j;
      }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

      throw new SyntaxError('JSON.parse');
  };

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);


  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  Transport.prototype.heartbeats = function () {
    return true;
  };

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();

    // If the connection in currently open (or in a reopening state) reset the close
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.socket.connected || this.socket.connecting || this.socket.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    this.socket.setHeartbeatTimeout();

    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    if (packet.type == 'error' && packet.advice == 'reconnect') {
      this.isOpen = false;
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */

  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.isOpen) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  };

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };

  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.isOpen = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.isOpen = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': false
      , 'auto connect': true
      , 'flash policy port': 10843
      , 'manualFlush': false
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;
      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.connecting = false;
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      if (this.isXDomain()) {
        xhr.withCredentials = true;
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else if (xhr.status == 403) {
            self.onError(xhr.responseText);
          } else {
            self.connecting = false;            
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck(this))) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;
    self.connecting = true;
    
    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      if(!self.transports)
          self.transports = self.origTransports = (transports ? io.util.intersect(
              transports.split(',')
            , self.options.transports
          ) : self.options.transports);

      self.setHeartbeatTimeout();

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  var remaining = self.transports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect(self.transports);

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Clears and sets a new heartbeat timeout using the value given by the
   * server during the handshake.
   *
   * @api private
   */

  Socket.prototype.setHeartbeatTimeout = function () {
    clearTimeout(this.heartbeatTimeoutTimer);
    if(this.transport && !this.transport.heartbeats()) return;

    var self = this;
    this.heartbeatTimeoutTimer = setTimeout(function () {
      self.transport.onClose();
    }, this.heartbeatTimeout);
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      if (!this.options['manualFlush']) {
        this.flushBuffer();
      }
    }
  };

  /**
   * Flushes the buffer data over the wire.
   * To be invoked manually when 'manualFlush' is set to true.
   *
   * @api public
   */

  Socket.prototype.flushBuffer = function() {
    this.transport.payload(this.buffer);
    this.buffer = [];
  };
  

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected || this.connecting) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request();
    var uri = [
        'http' + (this.options.secure ? 's' : '') + ':/'
      , this.options.host + ':' + this.options.port
      , this.options.resource
      , io.protocol
      , ''
      , this.sessionid
    ].join('/') + '/?disconnect=1';

    xhr.open('GET', uri, false);
    xhr.send(null);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
    clearTimeout(this.heartbeatTimeoutTimer);
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && (this.connected || this.connecting)) {
        this.disconnect();
        if (this.options.reconnect) {
          this.reconnect();
        }
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected
      , wasConnecting = this.connecting;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected || wasConnecting) {
      this.transport.close();
      this.transport.clearTimeouts();
      if (wasConnected) {
        this.publish('disconnect', reason);

        if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
          this.reconnect();
        }
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      clearTimeout(self.reconnectionTimer);

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transports = self.origTransports;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  // Do to a bug in the current IDevices browser, we need to wrap the send in a 
  // setTimeout, when they resume from sleeping the browser will crash if 
  // we don't allow the browser time to detect the socket has been closed
  if (io.util.ua.iDevice) {
    WS.prototype.send = function (data) {
      var self = this;
      setTimeout(function() {
         self.websocket.send(data);
      },0);
      return this;
    };
  } else {
    WS.prototype.send = function (data) {
      this.websocket.send(data);
      return this;
    };
  }

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O[(['Active'].concat('Object').join('X'))]!=D){try{var ad=new window[(['Active'].concat('Object').join('X'))](W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?(['Active'].concat('').join('X')):"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */

  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      var request = io.util.request(xdomain),
          usesXDomReq = (global.XDomainRequest && request instanceof XDomainRequest),
          socketProtocol = (socket && socket.options && socket.options.secure ? 'https:' : 'http:'),
          isXProtocol = (global.location && socketProtocol != global.location.protocol);
      if (request && !(usesXDomReq && isXProtocol)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports cross domain requests.
   *
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function (socket) {
    return XHR.check(socket, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new Ac...eX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    // unescape all forward slashes. see GH-1251
    data = data.replace(/\\\//g, '/');
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `Ac...eXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function (socket) {
    if (typeof window != "undefined" && (['Active'].concat('Object').join('X')) in window){
      try {
        var a = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
        return a && io.Transport.XHR.check(socket);
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  XHRPolling.prototype.heartbeats = function () {
    return false;
  };

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.isOpen) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      this.onerror = empty;
      self.retryCounter = 1;
      self.onData(this.responseText);
      self.get();
    };

    function onerror () {
      self.retryCounter ++;
      if(!self.retryCounter || self.retryCounter > 3) {
        self.onClose();  
      } else {
        self.get();
      }
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = onload;
      this.xhr.onerror = onerror;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '0px';
      form.style.left = '0px';
      form.style.display = 'none';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };

  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0];
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.isOpen) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

if (typeof define === "function" && define.amd) {
  define([], function () { return io; });
}
})();
},{}],5:[function(require,module,exports){
module.exports=require(2)
},{}],6:[function(require,module,exports){
(function (global){
(function(t){"use strict";function e(){function e(t){for(var e,i=Array(t.byteLength),s=t.BYTES_PER_ELEMENT,n=0,r=i.length;r>n;++n)e=8*(n%s),i[n]=(t[0|n/s]&255<<e)>>>e;return i.__view=t,i}function i(i,s,h,u){var l,c,f,p,d;if(Array.isArray(s))if(s.__view)if(h===t&&(h=0),u===t&&(u=s.length-h),f=i.bytes,i.type===r)l=s.__view.slice(0|h/f,0|(h+u)/f);else{for(c=s.slice(h,h+u),l=Array(0|c.length/f),p=0,d=l.length;d>p;++p)l[p]=0;for(p=0,d=c.length;d>p;++p)l[0|p/f]+=(255&c[p])<<8*(p%f)}else l=s.slice();else l="number"==typeof s&&s>0?Array(0|s):[];if(i.type!==r)for(p=0,d=l.length;d>p;++p)l[p]=65535&(+l[p]||0);else for(p=0,d=l.length;d>p;++p)l[p]=l[p]||0;if(i.type===n)for(p=0,d=l.length;d>p;++p)l[p]&1<<8*f-1&&(l[p]-=1<<8*f);return l.__klass=i,l.constructor=window[i.name],l.set=a,l.subarray=o,l.BYTES_PER_ELEMENT=i.bytes,l.byteLength=i.bytes*l.length,l.byteOffset=h||0,Object.defineProperty(l,"buffer",{get:function(){return new e(this)}}),l}var s=0,n=1,r=2,a=function(e,i){i===t&&(i=0);var s,n=Math.min(this.length-i,e.length);for(s=0;n>s;++s)this[i+s]=e[s]},o=function(e,i){return i===t&&(i=this.length),new this.constructor(this.slice(e,i))};[["Int8Array",1,n],["Uint8Array",1,s],["Int16Array",2,n],["Uint16Array",2,s],["Int32Array",4,n],["Uint32Array",4,s],["Float32Array",4,r],["Float64Array",8,r]].forEach(function(t){var e=t[0],s={bytes:t[1],type:t[2],name:e};window[e]=function(t,e,n){return i.call(this,s,t,e,n)}})}"undefined"==typeof Float32Array&&e();var i=function(){return b.apply(null,arguments)},s=Array.prototype.slice,n=0,r=1,a=2,o=3,h=[8e3,11025,12e3,16e3,22050,24e3,32e3,44100,48e3],u=[32,64,128,256],l="13.08.03",c=null,f={},p={},d="undefined"!=typeof module&&module.exports?"node":"undefined"!=typeof window?"browser":"unknown",m="browser"===d&&/(iPhone|iPad|iPod|Android)/i.test(navigator.userAgent),v=!1,g=120,b=function(){var e,i,n=s.call(arguments),r=n[0];switch(typeof r){case"string":f[r]?e=new f[r](n.slice(1)):p[r]?e=p[r](n.slice(1)):(i=/^(.+?)(?:\.(ar|kr))?$/.exec(r),i&&(r=i[1],f[r]?e=new f[r](n.slice(1)):p[r]&&(e=p[r](n.slice(1))),e&&i[2]&&e[i[2]]()));break;case"number":e=new O(n);break;case"boolean":e=new D(n);break;case"function":e=new M(n);break;case"object":if(null!==r){if(r instanceof T)return r;if(r.context instanceof T)return r.context;x(r)?e=new j(n):w(r)&&(e=new L(n))}}e===t&&(e=new R(n.slice(1)),console.warn('T("'+r+'") is not defined.'));var a=e._;return a.originkey=r,a.meta=_(e),a.emit("init"),e},_=function(t){for(var e,i,s=t._.meta,n=t;null!==n&&n.constructor!==Object;){e=Object.getOwnPropertyNames(n);for(var r=0,a=e.length;a>r;++r)s[e[r]]||(/^(constructor$|process$|_)/.test(e[r])?s[e[r]]="ignore":(i=Object.getOwnPropertyDescriptor(n,e[r]),"function"==typeof i.value?s[e[r]]="function":(i.get||i.set)&&(s[e[r]]="property")));n=Object.getPrototypeOf(n)}return s};Object.defineProperties(i,{version:{value:l},envtype:{value:d},envmobile:{value:m},env:{get:function(){return c.impl.env}},samplerate:{get:function(){return c.samplerate}},channels:{get:function(){return c.channels}},cellsize:{get:function(){return c.cellsize}},currentTime:{get:function(){return c.currentTime}},isPlaying:{get:function(){return c.status===r}},isRecording:{get:function(){return c.status===o}},amp:{set:function(t){"number"==typeof t&&(c.amp=t)},get:function(){return c.amp}},bpm:{set:function(t){"number"==typeof t&&t>=5&&300>=t&&(g=t)},get:function(){return g}}}),i.bind=function(t,e){return c.bind(t,e),i},i.setup=function(t){return c.setup(t),i},i.play=function(){return c.play(),i},i.pause=function(){return c.pause(),i},i.reset=function(){return c.reset(),c.events.emit("reset"),i},i.on=i.addListener=function(t,e){return c.on(t,e),i},i.once=function(t,e){return c.once(t,e),i},i.off=i.removeListener=function(t,e){return c.off(t,e),i},i.removeAllListeners=function(t){return c.removeAllListeners(t),i},i.listeners=function(t){return c.listeners(t)},i.rec=function(){return c.rec.apply(c,arguments)},i.timevalue=function(){var t=function(t){var e,i=g;return(e=/^bpm(\d+(?:\.\d+)?)/i.exec(t))&&(i=Math.max(5,Math.min(300,+(e[1]||0)))),i};return function(e){var s,n,r;if(s=/^(\d+(?:\.\d+)?)Hz$/i.exec(e))return 0===+s[1]?0:1e3/+s[1];if(s=/L(\d+)?(\.*)$/i.exec(e))return n=1e3*60/t(e)*(4/(s[1]||4)),n*=[1,1.5,1.75,1.875][(s[2]||"").length]||1;if(s=/^(\d+(?:\.\d+)?|\.(?:\d+))(min|sec|m)s?$/i.exec(e))switch(s[2]){case"min":return 1e3*60*+(s[1]||0);case"sec":return 1e3*+(s[1]||0);case"m":return+(s[1]||0)}return(s=/^(?:([0-5]?[0-9]):)?(?:([0-5]?[0-9]):)(?:([0-5]?[0-9]))(?:\.([0-9]{1,3}))?$/.exec(e))?(r=3600*(s[1]||0)+60*(s[2]||0)+(s[3]||0),r=1e3*r+(0|((s[4]||"")+"00").substr(0,3))):(s=/(\d+)\.(\d+)\.(\d+)$/i.exec(e))?(r=480*(4*s[1]+ +s[2])+ +s[3],1e3*60/t(e)*(r/480)):(s=/(\d+)ticks$/i.exec(e))?1e3*60/t(e)*(s[1]/480):(s=/^(\d+)samples(?:\/(\d+)Hz)?$/i.exec(e))?1e3*s[1]/(s[2]||i.samplerate):0}}();var y=i.fn={SignalArray:Float32Array,currentTimeIncr:0,emptycell:null,FINISHED_STATE:n,PLAYING_STATE:r,UNSCHEDULED_STATE:a,SCHEDULED_STATE:o},w=y.isArray=Array.isArray,x=y.isDictionary=function(t){return"object"==typeof t&&t.constructor===Object};y.nop=function(){return this},y.isSignalArray=function(t){return t instanceof y.SignalArray?!0:Array.isArray(t)&&t.__klass&&2===t.__klass.type?!0:!1},y.extend=function(t,e){function i(){this.constructor=t}e=e||T;for(var s in e)e.hasOwnProperty(s)&&(t[s]=e[s]);return i.prototype=e.prototype,t.prototype=new i,t.__super__=e.prototype,t},y.constructorof=function(t,e){for(var i=t&&t.prototype;i;){if(i===e.prototype)return!0;i=Object.getPrototypeOf(i)}return!1},y.register=function(t,e){y.constructorof(e,T)?f[t]=e:p[t]=e},y.alias=function(t,e){f[e]?f[t]=f[e]:p[e]&&(p[t]=p[e])},y.getClass=function(t){return f[t]},y.pointer=function(t,e,i){return e=t.byteOffset+e*t.constructor.BYTES_PER_ELEMENT,"number"==typeof i?new t.constructor(t.buffer,e,i):new t.constructor(t.buffer,e)},y.nextTick=function(t){return c.nextTick(t),i},y.fixAR=function(t){t._.ar=!0,t._.aronly=!0},y.fixKR=function(t){t._.ar=!1,t._.kronly=!0},y.changeWithValue=function(){var t=this._,e=t.value*t.mul+t.add;isNaN(e)&&(e=0);for(var i=this.cells[0],s=0,n=i.length;n>s;++s)i[s]=e},y.changeWithValue.unremovable=!0,y.clone=function(t){var e=new t.constructor([]);return e._.ar=t._.ar,e._.mul=t._.mul,e._.add=t._.add,e._.bypassed=t._.bypassed,e},y.timer=function(){var t=function(t){return function(){-1===c.timers.indexOf(t)&&(c.timers.push(t),c.events.emit("addObject"),t._.emit("start"),y.buddies_start(t))}},e=function(t){return function(){var e=c.timers.indexOf(t);-1!==e&&(c.timers.splice(e,1),t._.emit("stop"),c.events.emit("removeObject"),y.buddies_stop(t))}};return function(i){var s=t(i),n=e(i);return i.nodeType=T.TIMER,i.start=function(){return c.nextTick(s),i},i.stop=function(){return c.nextTick(n),i},i}}(),y.listener=function(){var t=function(t){return function(){-1===c.listeners.indexOf(t)&&(c.listeners.push(t),c.events.emit("addObject"),t._.emit("listen"),y.buddies_start(t))}},e=function(t){return function(){var e=c.listeners.indexOf(t);-1!==e&&(c.listeners.splice(e,1),t._.emit("unlisten"),c.events.emit("removeObject"),y.buddies_stop(t))}};return function(i){var s=t(i),n=e(i);return i.nodeType=T.LISTENER,i.listen=function(){return arguments.length&&i.append.apply(i,arguments),i.nodes.length&&c.nextTick(s),i},i.unlisten=function(){return arguments.length&&i.remove.apply(i,arguments),i.nodes.length||c.nextTick(n),i},i}}(),y.make_onended=function(t,e){return function(){if(t.playbackState=n,"number"==typeof e)for(var i=t.cells[0],s=t.cells[1],r=t.cells[2],a=0,o=s.length;o>a;++a)i[0]=s[a]=r[a]=e;t._.emit("ended")}},y.inputSignalAR=function(t){var e,i,s,n,a,o,h=t.cells[0],u=t.cells[1],l=t.cells[2],c=t.nodes,f=c.length,p=h.length,d=t.tickID;if(2===t.numChannels){if(s=!0,0!==f){for(e=0;f>e;++e)if(c[e].playbackState===r){c[e].process(d),u.set(c[e].cells[1]),l.set(c[e].cells[2]),s=!1,++e;break}for(;f>e;++e)if(c[e].playbackState===r)for(c[e].process(d),a=c[e].cells[1],o=c[e].cells[2],i=p;i;)i-=8,u[i]+=a[i],l[i]+=o[i],u[i+1]+=a[i+1],l[i+1]+=o[i+1],u[i+2]+=a[i+2],l[i+2]+=o[i+2],u[i+3]+=a[i+3],l[i+3]+=o[i+3],u[i+4]+=a[i+4],l[i+4]+=o[i+4],u[i+5]+=a[i+5],l[i+5]+=o[i+5],u[i+6]+=a[i+6],l[i+6]+=o[i+6],u[i+7]+=a[i+7],l[i+7]+=o[i+7]}s&&(u.set(y.emptycell),l.set(y.emptycell))}else{if(s=!0,0!==f){for(e=0;f>e;++e)if(c[e].playbackState===r){c[e].process(d),h.set(c[e].cells[0]),s=!1,++e;break}for(;f>e;++e)if(c[e].playbackState===r)for(n=c[e].process(d).cells[0],i=p;i;)i-=8,h[i]+=n[i],h[i+1]+=n[i+1],h[i+2]+=n[i+2],h[i+3]+=n[i+3],h[i+4]+=n[i+4],h[i+5]+=n[i+5],h[i+6]+=n[i+6],h[i+7]+=n[i+7]}s&&h.set(y.emptycell)}},y.inputSignalKR=function(t){var e,i=t.nodes,s=i.length,n=t.tickID,a=0;for(e=0;s>e;++e)i[e].playbackState===r&&(a+=i[e].process(n).cells[0][0]);return a},y.outputSignalAR=function(t){var e,i=t.cells[0],s=t.cells[1],n=t.cells[2],r=t._.mul,a=t._.add;if(2===t.numChannels)for(e=i.length;e;)e-=8,s[e]=s[e]*r+a,n[e]=n[e]*r+a,s[e+1]=s[e+1]*r+a,n[e+1]=n[e+1]*r+a,s[e+2]=s[e+2]*r+a,n[e+2]=n[e+2]*r+a,s[e+3]=s[e+3]*r+a,n[e+3]=n[e+3]*r+a,s[e+4]=s[e+4]*r+a,n[e+4]=n[e+4]*r+a,s[e+5]=s[e+5]*r+a,n[e+5]=n[e+5]*r+a,s[e+6]=s[e+6]*r+a,n[e+6]=n[e+6]*r+a,s[e+7]=s[e+7]*r+a,n[e+7]=n[e+7]*r+a,i[e]=.5*(s[e]+n[e]),i[e+1]=.5*(s[e+1]+n[e+1]),i[e+2]=.5*(s[e+2]+n[e+2]),i[e+3]=.5*(s[e+3]+n[e+3]),i[e+4]=.5*(s[e+4]+n[e+4]),i[e+5]=.5*(s[e+5]+n[e+5]),i[e+6]=.5*(s[e+6]+n[e+6]),i[e+7]=.5*(s[e+7]+n[e+7]);else if(1!==r||0!==a)for(e=i.length;e;)e-=8,i[e]=i[e]*r+a,i[e+1]=i[e+1]*r+a,i[e+2]=i[e+2]*r+a,i[e+3]=i[e+3]*r+a,i[e+4]=i[e+4]*r+a,i[e+5]=i[e+5]*r+a,i[e+6]=i[e+6]*r+a,i[e+7]=i[e+7]*r+a},y.outputSignalKR=function(t){var e,i=t.cells[0],s=t.cells[1],n=t.cells[2],r=t._.mul,a=t._.add,o=i[0]*r+a;if(2===t.numChannels)for(e=i.length;e;)e-=8,i[e]=i[e+1]=i[e+2]=i[e+3]=i[e+4]=i[e+5]=i[e+6]=i[e+7]=s[e]=s[e+1]=s[e+2]=s[e+3]=s[e+4]=s[e+5]=s[e+6]=s[e+7]=n[e]=n[e+1]=n[e+2]=n[e+3]=n[e+4]=n[e+5]=n[e+6]=n[e+7]=o;else for(e=i.length;e;)e-=8,i[e]=i[e+1]=i[e+2]=i[e+3]=i[e+4]=i[e+5]=i[e+6]=i[e+7]=o},y.buddies_start=function(t){var e,i,s,n=t._.buddies;for(i=0,s=n.length;s>i;++i)switch(e=n[i],e.nodeType){case T.DSP:e.play();break;case T.TIMER:e.start();break;case T.LISTENER:e.listen()}},y.buddies_stop=function(t){var e,i,s,n=t._.buddies;for(i=0,s=n.length;s>i;++i)switch(e=n[i],e.nodeType){case T.DSP:e.pause();break;case T.TIMER:e.stop();break;case T.LISTENER:e.unlisten()}},y.fix_iOS6_1_problem=function(t){c.fix_iOS6_1_problem(t)};var k=i.modules={},A=k.EventEmitter=function(){function e(t){this.context=t,this.events={}}var i=e.prototype;return i.emit=function(e){var i=this.events[e];if(!i)return!1;var n;if("function"==typeof i){switch(arguments.length){case 1:i.call(this.context);break;case 2:i.call(this.context,arguments[1]);break;case 3:i.call(this.context,arguments[1],arguments[2]);break;default:n=s.call(arguments,1),i.apply(this.context,n)}return!0}if(w(i)){n=s.call(arguments,1);for(var r=i.slice(),a=0,o=r.length;o>a;++a)r[a]instanceof T?r[a].bang.apply(r[a],n):r[a].apply(this.context,n);return!0}return i instanceof T?(n=s.call(arguments,1),i.bang.apply(i,n),t):!1},i.on=function(t,e){if("function"!=typeof e&&!(e instanceof T))throw Error("addListener takes instances of Function or timbre.Object");var i=this.events;return i[t]?w(i[t])?i[t].push(e):i[t]=[i[t],e]:i[t]=e,this},i.once=function(t,e){var i,s=this;if("function"==typeof e)i=function(){s.off(t,i),e.apply(s.context,arguments)};else{if(!(e instanceof T))throw Error("once takes instances of Function or timbre.Object");i=function(){s.off(t,i),e.bang.apply(e,arguments)}}return i.listener=e,s.on(t,i),this},i.off=function(t,e){if("function"!=typeof e&&!(e instanceof T))throw Error("removeListener takes instances of Function or timbre.Object");var i=this.events;if(!i[t])return this;var s=i[t];if(w(s)){for(var n=-1,r=0,a=s.length;a>r;++r)if(s[r]===e||s[r].listener&&s[r].listener===e){n=r;break}if(0>n)return this;s.splice(n,1),0===s.length&&(i[t]=null)}else(s===e||s.listener&&s.listener===e)&&(i[t]=null);return this},i.removeAllListeners=function(t){var e=this.events,i=!1,s=e[t];if(w(s))for(var n=s.length;n--;){var r=s[n];r.unremovable?i=!0:this.off(t,r)}else s&&(s.unremovable?i=!0:this.off(t,s));return i||(e[t]=null),this},i.listeners=function(t){var e,i=this.events;if(!i[t])return[];if(i=i[t],!w(i))return i.unremovable?[]:[i];i=i.slice(),e=[];for(var s=0,n=i.length;n>s;++s)i[s].unremovable||e.push(i[s]);return e},e}(),S=k.Deferred=function(){function t(t){this.context=t||this,this._state="pending",this._doneList=[],this._failList=[],this._promise=new e(this)}function e(t){this.context=t.context,this.then=t.then,this.done=function(){return t.done.apply(t,arguments),this},this.fail=function(){return t.fail.apply(t,arguments),this},this.pipe=function(){return t.pipe.apply(t,arguments)},this.always=function(){return t.always.apply(t,arguments),this},this.promise=function(){return this},this.isResolved=function(){return t.isResolved()},this.isRejected=function(){return t.isRejected()}}var i=t.prototype,n=function(t,e,i,s){if("pending"===this._state){this._state=t;for(var n=0,r=e.length;r>n;++n)e[n].apply(i,s);this._doneList=this._failList=null}},r=function(t){return t&&"function"==typeof t.promise};return i.resolve=function(){var t=s.call(arguments,0);return n.call(this,"resolved",this._doneList,this.context||this,t),this},i.resolveWith=function(t){var e=s.call(arguments,1);return n.call(this,"resolved",this._doneList,t,e),this},i.reject=function(){var t=s.call(arguments,0);return n.call(this,"rejected",this._failList,this.context||this,t),this},i.rejectWith=function(t){var e=s.call(arguments,1);return n.call(this,"rejected",this._failList,t,e),this},i.promise=function(){return this._promise},i.done=function(){for(var t=s.call(arguments),e="resolved"===this._state,i="pending"===this._state,n=this._doneList,r=0,a=t.length;a>r;++r)"function"==typeof t[r]&&(e?t[r]():i&&n.push(t[r]));return this},i.fail=function(){for(var t=s.call(arguments),e="rejected"===this._state,i="pending"===this._state,n=this._failList,r=0,a=t.length;a>r;++r)"function"==typeof t[r]&&(e?t[r]():i&&n.push(t[r]));return this},i.always=function(){return this.done.apply(this,arguments),this.fail.apply(this,arguments),this},i.then=function(t,e){return this.done(t).fail(e)},i.pipe=function(e,i){var n=this,a=new t(this.context);return this.done(function(){var t=e.apply(n.context,arguments);r(t)?t.then(function(){var e=s.call(arguments);a.resolveWith.apply(a,[t].concat(e))}):a.resolveWith(n,t)}),this.fail(function(){if("function"==typeof i){var t=i.apply(n.context,arguments);r(t)&&t.fail(function(){var e=s.call(arguments);a.rejectWith.apply(a,[t].concat(e))})}else a.reject.apply(a,arguments)}),a.promise()},i.isResolved=function(){return"resolved"===this._state},i.isRejected=function(){return"rejected"===this._state},i.state=function(){return this._state},t.when=function(e){var i=0,n=s.call(arguments),a=n.length,o=a;1!==a||r(e)||(o=0);var h=1===o?e:new t,u=function(t,e){return function(i){e[t]=arguments.length>1?s.call(arguments):i,--o||h.resolve.apply(h,e)}};if(a>1)for(var l=Array(a),c=function(){h.reject()};a>i;++i)n[i]&&r(n[i])?n[i].promise().done(u(i,l)).fail(c):(l[i]=n[i],--o);return o||h.resolve.apply(h,n),h.promise()},t}(),T=i.Object=function(){function e(t,s){this._={};var n=this._.events=new A(this);if(this._.emit=function(){return n.emit.apply(n,arguments)},x(s[0])){var a=s.shift(),o=a["in"];this.once("init",function(){this.set(a),o&&(w(o)?this.append.apply(this,o):o instanceof e&&this.append(o))})}switch(this.tickID=-1,this.nodes=s.map(i),this.cells=[],this.numChannels=t,t){case 0:this.L=this.R=new I(null),this.cells[0]=this.cells[1]=this.cells[2]=this.L.cell;break;case 1:this.L=this.R=new I(this),this.cells[0]=this.cells[1]=this.cells[2]=this.L.cell;break;case 2:this.L=new I(this),this.R=new I(this),this.cells[0]=new y.SignalArray(c.cellsize),this.cells[1]=this.L.cell,this.cells[2]=this.R.cell}this.playbackState=r,this.nodeType=e.DSP,this._.ar=!0,this._.mul=1,this._.add=0,this._.dac=null,this._.bypassed=!1,this._.meta={},this._.samplerate=c.samplerate,this._.cellsize=c.cellsize,this._.buddies=[]}e.DSP=1,e.TIMER=2,e.LISTENER=3;var n=e.prototype;return Object.defineProperties(n,{isAr:{get:function(){return this._.ar}},isKr:{get:function(){return!this._.ar}},isBypassed:{get:function(){return this._.bypassed}},isEnded:{get:function(){return!(1&this.playbackState)}},mul:{set:function(t){"number"==typeof t&&(this._.mul=t,this._.emit("setMul",t))},get:function(){return this._.mul}},add:{set:function(t){"number"==typeof t&&(this._.add=t,this._.emit("setAdd",t))},get:function(){return this._.add}},buddies:{set:function(t){w(t)||(t=[t]),this._.buddies=t.filter(function(t){return t instanceof e})},get:function(){return this._.buddies}}}),n.toString=function(){return this.constructor.name},n.valueOf=function(){return c.tickID!==this.tickID&&this.process(c.tickID),this.cells[0][0]},n.append=function(){if(arguments.length>0){var t=s.call(arguments).map(i);this.nodes=this.nodes.concat(t),this._.emit("append",t)}return this},n.appendTo=function(t){return t.append(this),this},n.remove=function(){if(arguments.length>0){for(var t,e=this.nodes,i=[],s=0,n=arguments.length;n>s;++s)-1!==(t=e.indexOf(arguments[s]))&&(i.push(e[t]),e.splice(t,1));i.length>0&&this._.emit("remove",i)}return this},n.removeFrom=function(t){return t.remove(this),this},n.removeAll=function(){var t=this.nodes.slice();return this.nodes=[],t.length>0&&this._.emit("remove",t),this},n.removeAtIndex=function(t){var e=this.nodes[t];return e&&(this.nodes.splice(t,1),this._.emit("remove",[e])),this},n.postMessage=function(t){return this._.emit("message",t),this},n.to=function(t){if(t instanceof e)t.append(this);else{var i=s.call(arguments);x(i[1])?i.splice(2,0,this):i.splice(1,0,this),t=b.apply(null,i)}return t},n.splice=function(t,i,s){var n;return i?i instanceof e&&(n=i.nodes.indexOf(s),-1!==n&&i.nodes.splice(n,1),t instanceof e?(t.nodes.push(this),i.nodes.push(t)):i.nodes.push(this)):this._.dac&&(t instanceof e?s instanceof e?s._.dac&&(s._.dac._.node=t,t._.dac=s._.dac,s._.dac=null,t.nodes.push(this)):this._.dac&&(this._.dac._.node=t,t._.dac=this._.dac,this._.dac=null,t.nodes.push(this)):s instanceof e&&s._.dac&&(s._.dac._.node=this,this._.dac=s._.dac,s._.dac=null)),this},n.on=n.addListener=function(t,e){return this._.events.on(t,e),this},n.once=function(t,e){return this._.events.once(t,e),this},n.off=n.removeListener=function(t,e){return this._.events.off(t,e),this},n.removeAllListeners=function(t){return this._.events.removeAllListeners(t),this},n.listeners=function(t){return this._.events.listeners(t)},n.set=function(t,e){var i,s,n=this._.meta;switch(typeof t){case"string":switch(n[t]){case"property":this[t]=e;break;case"function":this[t](e);break;default:for(i=this;null!==i;)s=Object.getOwnPropertyDescriptor(i,t),s&&("function"==typeof s.value?(n[t]="function",this[t](e)):(s.get||s.set)&&(n[t]="property",this[t]=e)),i=Object.getPrototypeOf(i)}break;case"object":for(i in t)this.set(i,t[i])}return this},n.get=function(e){return"property"===this._.meta[e]?this[e]:t},n.bang=function(){return this._.emit.apply(this,["bang"].concat(s.call(arguments))),this},n.process=y.nop,n.bypass=function(){return this._.bypassed=0===arguments.length?!0:!!arguments[0],this},n.play=function(){var t=this._.dac;return null===t&&(t=this._.dac=new P(this)),t.play()&&this._.emit.apply(this,["play"].concat(s.call(arguments))),y.buddies_start(this),this},n.pause=function(){var t=this._.dac;return t&&t.playbackState===r&&(t.pause(),this._.dac=null,this._.emit("pause")),y.buddies_stop(this),this},n.start=n.stop=n.listen=n.unlisten=function(){return this},n.ar=function(){return(0===arguments.length?0:!arguments[0])?this.kr(!0):this._.kronly||(this._.ar=!0,this._.emit("ar",!0)),this},n.kr=function(){return(0===arguments.length?0:!arguments[0])?this.ar(!0):this._.aronly||(this._.ar=!1,this._.emit("ar",!1)),this},n.plot="browser"===d?function(e){var i=this._,s=e.target;if(!s)return this;var n,r=e.width||s.width||320,a=e.height||s.height||240,o=(e.x||0)+.5,h=e.y||0,u=s.getContext("2d");n=e.foreground!==t?e.foreground:i.plotForeground||"rgb(  0, 128, 255)";var l;l=e.background!==t?e.background:i.plotBackground||"rgb(255, 255, 255)";var c,f,p,d,m,v=e.lineWidth||i.plotLineWidth||1,g=!!i.plotCyclic,b=i.plotData||this.cells[0],_=e.range||i.plotRange||[-1.2,1.2],y=_[0],w=a/(_[1]-y),x=r/b.length,k=b.length;if(u.save(),u.rect(o,h,r,a),null!==l&&(u.fillStyle=l,u.fillRect(o,h,r,a)),i.plotBefore&&i.plotBefore.call(this,u,o,h,r,a),i.plotBarStyle)for(u.fillStyle=n,c=0,m=0;k>m;++m)p=(b[m]-y)*w,f=a-p,u.fillRect(c+o,f+h,x,p),c+=x;else{for(u.strokeStyle=n,u.lineWidth=v,u.beginPath(),c=0,d=a-(b[0]-y)*w,u.moveTo(c+o,d+h),m=1;k>m;++m)c+=x,f=a-(b[m]-y)*w,u.lineTo(c+o,f+h);g?u.lineTo(c+x+o,d+h):u.lineTo(c+x+o,f+h),u.stroke()}i.plotAfter&&i.plotAfter.call(this,u,o,h,r,a);var A=e.border||i.plotBorder;return A&&(u.strokeStyle="string"==typeof A?A:"#000",u.lineWidth=1,u.strokeRect(o,h,r,a)),u.restore(),this}:y.nop,e}(),I=i.ChannelObject=function(){function t(t){i.Object.call(this,-1,[]),y.fixAR(this),this._.parent=t,this.cell=new y.SignalArray(c.cellsize),this.L=this.R=this,this.cells[0]=this.cells[1]=this.cells[2]=this.cell,this.numChannels=1}return y.extend(t),t.prototype.process=function(t){return this.tickID!==t&&(this.tickID=t,this._.parent&&this._.parent.process(t)),this},t}(),R=function(){function t(t){T.call(this,2,t)}return y.extend(t),t.prototype.process=function(t){var e=this._;return this.tickID!==t&&(this.tickID=t,e.ar?(y.inputSignalAR(this),y.outputSignalAR(this)):(this.cells[0][0]=y.inputSignalKR(this),y.outputSignalKR(this))),this},y.register("+",t),t}(),O=function(){function t(t){if(T.call(this,1,[]),y.fixKR(this),this.value=t[0],x(t[1])){var e=t[1];this.once("init",function(){this.set(e)})}this.on("setAdd",y.changeWithValue),this.on("setMul",y.changeWithValue)}y.extend(t);var e=t.prototype;return Object.defineProperties(e,{value:{set:function(t){"number"==typeof t&&(this._.value=isNaN(t)?0:t,y.changeWithValue.call(this))},get:function(){return this._.value}}}),t}(),D=function(){function t(t){if(T.call(this,1,[]),y.fixKR(this),this.value=t[0],x(t[1])){var e=t[1];this.once("init",function(){this.set(e)})}this.on("setAdd",y.changeWithValue),this.on("setMul",y.changeWithValue)}y.extend(t);var e=t.prototype;return Object.defineProperties(e,{value:{set:function(t){this._.value=t?1:0,y.changeWithValue.call(this)},get:function(){return!!this._.value}}}),t}(),M=function(){function t(t){if(T.call(this,1,[]),y.fixKR(this),this.func=t[0],this._.value=0,x(t[1])){var e=t[1];this.once("init",function(){this.set(e)})}this.on("setAdd",y.changeWithValue),this.on("setMul",y.changeWithValue)}y.extend(t);var e=t.prototype;return Object.defineProperties(e,{func:{set:function(t){"function"==typeof t&&(this._.func=t)},get:function(){return this._.func}},args:{set:function(t){this._.args=w(t)?t:[t]},get:function(){return this._.args}}}),e.bang=function(){var t=this._,e=s.call(arguments).concat(t.args),i=t.func.apply(this,e);return"number"==typeof i&&(t.value=i,y.changeWithValue.call(this)),this._.emit("bang"),this},t}(),L=function(){function t(t){T.call(this,1,[]);var e,i;for(e=0,i=t[0].length;i>e;++e)this.append(t[0][e]);if(x(t[1])){var s=t[1];this.once("init",function(){this.set(s)})}}y.extend(t);var e=t.prototype;return Object.defineProperties(e,{}),e.bang=function(){var t,e,i=["bang"].concat(s.call(arguments)),n=this.nodes;for(t=0,e=n.length;e>t;++t)n[t].bang.apply(n[t],i);return this},e.postMessage=function(t){var e,i,s=this.nodes;for(e=0,i=s.length;i>e;++e)s[e].postMessage(t);return this},e.process=function(t){var e=this._;return this.tickID!==t&&(this.tickID=t,e.ar?(y.inputSignalAR(this),y.outputSignalAR(this)):(this.cells[0][0]=y.inputSignalKR(this),y.outputSignalKR(this))),this},t}(),j=function(){function t(t){if(T.call(this,1,[]),y.fixKR(this),x(t[1])){var e=t[1];this.once("init",function(){this.set(e)})}}y.extend(t);var e=t.prototype;return Object.defineProperties(e,{}),t}(),P=function(){function t(t){T.call(this,2,[]),this.playbackState=n;var s=this._;s.node=t,s.onplay=e(this),s.onpause=i(this)}y.extend(t);var e=function(t){return function(){-1===c.inlets.indexOf(t)&&(c.inlets.push(t),c.events.emit("addObject"),t.playbackState=r,t._.emit("play"))}},i=function(t){return function(){var e=c.inlets.indexOf(t);-1!==e&&(c.inlets.splice(e,1),t.playbackState=n,t._.emit("pause"),c.events.emit("removeObject"))}},s=t.prototype;return s.play=function(){return c.nextTick(this._.onplay),-1===c.inlets.indexOf(this)},s.pause=function(){c.nextTick(this._.onpause)},s.process=function(t){var e=this._.node;1&e.playbackState?(e.process(t),this.cells[1].set(e.cells[1]),this.cells[2].set(e.cells[2])):(this.cells[1].set(y.emptycell),this.cells[2].set(y.emptycell))},t}(),F=function(){function e(){this.context=this,this.tickID=0,this.impl=null,this.amp=.8,this.status=n,this.samplerate=44100,this.channels=2,this.cellsize=64,this.streammsec=20,this.streamsize=0,this.currentTime=0,this.nextTicks=[],this.inlets=[],this.timers=[],this.listeners=[],this.deferred=null,this.recStart=0,this.recBuffers=null,this.delayProcess=i(this),this.events=null,y.currentTimeIncr=1e3*this.cellsize/this.samplerate,y.emptycell=new y.SignalArray(this.cellsize),this.reset(!0)}var i=function(t){return function(){t.recStart=Date.now(),t.process()}},a=e.prototype;a.bind=function(t,e){if("function"==typeof t){var i=new t(this,e);this.impl=i,this.impl.defaultSamplerate&&(this.samplerate=this.impl.defaultSamplerate)}return this},a.setup=function(e){return"object"==typeof e&&(-1!==h.indexOf(e.samplerate)&&(this.samplerate=e.samplerate<=this.impl.maxSamplerate?e.samplerate:this.impl.maxSamplerate),-1!==u.indexOf(e.cellsize)&&(this.cellsize=e.cellsize),"undefined"!=typeof Float64Array&&e.f64!==t&&(v=!!e.f64,y.SignalArray=v?Float64Array:Float32Array)),y.currentTimeIncr=1e3*this.cellsize/this.samplerate,y.emptycell=new y.SignalArray(this.cellsize),this},a.getAdjustSamples=function(t){var e,i;return t=t||this.samplerate,e=this.streammsec/1e3*t,i=Math.ceil(Math.log(e)*Math.LOG2E),i=8>i?8:i>14?14:i,1<<i},a.play=function(){return this.status===n&&(this.status=r,this.streamsize=this.getAdjustSamples(),this.strmL=new y.SignalArray(this.streamsize),this.strmR=new y.SignalArray(this.streamsize),this.impl.play(),this.events.emit("play")),this},a.pause=function(){return this.status===r&&(this.status=n,this.impl.pause(),this.events.emit("pause")),this},a.reset=function(t){return t&&(this.events=new A(this).on("addObject",function(){this.status===n&&this.play()}).on("removeObject",function(){this.status===r&&0===this.inlets.length+this.timers.length+this.listeners.length&&this.pause()})),this.currentTime=0,this.nextTicks=[],this.inlets=[],this.timers=[],this.listeners=[],this},a.process=function(){var t,e,i,s,n,r,a,h,u=this.tickID,l=this.strmL,c=this.strmR,f=this.amp,p=this.streamsize,d=0,m=this.cellsize,v=this.streamsize/this.cellsize,g=this.timers,b=this.inlets,_=this.listeners,w=y.currentTimeIncr;for(s=0;p>s;++s)l[s]=c[s]=0;for(;v--;){for(++u,n=0,r=g.length;r>n;++n)1&g[n].playbackState&&g[n].process(u);for(n=0,r=b.length;r>n;++n)if(t=b[n],t.process(u),1&t.playbackState)for(e=t.cells[1],i=t.cells[2],a=0,s=d;m>a;++a,++s)l[s]+=e[a],c[s]+=i[a];for(d+=m,n=0,r=_.length;r>n;++n)1&_[n].playbackState&&_[n].process(u);for(this.currentTime+=w,h=this.nextTicks.splice(0),n=0,r=h.length;r>n;++n)h[n]()}for(s=0;p>s;++s)t=l[s]*f,-1>t?t=-1:t>1&&(t=1),l[s]=t,t=c[s]*f,-1>t?t=-1:t>1&&(t=1),c[s]=t;this.tickID=u;var x=this.currentTime;if(this.status===o){if(2===this.recCh)this.recBuffers.push(new y.SignalArray(l)),this.recBuffers.push(new y.SignalArray(c));else{var k=new y.SignalArray(l.length);for(s=0,p=k.length;p>s;++s)k[s]=.5*(l[s]+c[s]);this.recBuffers.push(k)}if(x>=this.maxDuration)this.deferred.sub.reject();else if(x>=this.recDuration)this.deferred.sub.resolve();else{var A=Date.now();A-this.recStart>20?setTimeout(this.delayProcess,10):this.process()}}},a.nextTick=function(t){this.status===n?t():this.nextTicks.push(t)},a.rec=function(){y.fix_iOS6_1_problem(!0);var t=new S(this);if(this.deferred)return console.warn("rec deferred is exists??"),t.reject().promise();if(this.status!==n)return console.log("status is not none",this.status),t.reject().promise();var e=0,i=arguments,r=x(i[e])?i[e++]:{},a=i[e];if("function"!=typeof a)return console.warn("no function"),t.reject().promise();this.deferred=t,this.status=o,this.reset();var h=new b("+"),u=new S(this),c={done:function(){u.resolve.apply(u,s.call(arguments))},send:function(){h.append.apply(h,arguments)}},f=this;return u.then(l,function(){y.fix_iOS6_1_problem(!1),l.call(f,!0)}),this.deferred.sub=u,this.savedSamplerate=this.samplerate,this.samplerate=r.samplerate||this.samplerate,this.recDuration=r.recDuration||1/0,this.maxDuration=r.maxDuration||6e5,this.recCh=r.ch||1,2!==this.recCh&&(this.recCh=1),this.recBuffers=[],this.streamsize=this.getAdjustSamples(),this.strmL=new y.SignalArray(this.streamsize),this.strmR=new y.SignalArray(this.streamsize),this.inlets.push(h),a(c),setTimeout(this.delayProcess,10),t.promise()};var l=function(){this.status=n,this.reset();var t,e=this.recBuffers,i=this.samplerate,s=this.streamsize;this.samplerate=this.savedSamplerate,t=1/0!==this.recDuration?0|.001*this.recDuration*i:(e.length>>this.recCh-1)*s;var r,a,o=0|t/s,h=0,u=0,l=t;if(2===this.recCh){var c=new y.SignalArray(t),f=new y.SignalArray(t),p=new y.SignalArray(t);for(a=0;o>a;++a)if(c.set(e[h++],u),f.set(e[h++],u),u+=s,l-=s,l>0&&s>l){c.set(e[h++].subarray(0,l),u),f.set(e[h++].subarray(0,l),u);break}for(a=0,o=t;o>a;++a)p[a]=.5*(c[a]+f[a]);r={samplerate:i,channels:2,buffer:[p,c,f]}}else{var d=new y.SignalArray(t);for(a=0;o>a;++a)if(d.set(e[h++],u),u+=s,l-=s,l>0&&s>l){d.set(e[h++].subarray(0,l),u);break}r={samplerate:i,channels:1,buffer:[d]}}var m=[].concat.apply([r],arguments);this.deferred.resolve.apply(this.deferred,m),this.deferred=null};return a.on=function(t,e){this.events.on(t,e)},a.once=function(t,e){this.events.once(t,e)},a.off=function(t,e){this.events.off(t,e)},a.removeAllListeners=function(t){this.events.removeListeners(t)},a.listeners=function(t){return this.events.listeners(t)},a.fix_iOS6_1_problem=function(t){this.impl.fix_iOS6_1_problem&&this.impl.fix_iOS6_1_problem(t)},e}(),q=null;q="undefined"!=typeof webkitAudioContext?function(t){var e,i,s=new webkitAudioContext;y._audioContext=s,this.maxSamplerate=s.sampleRate,this.defaultSamplerate=s.sampleRate,this.env="webkit";var n=navigator.userAgent;if(n.match(/linux/i)?t.streammsec*=8:n.match(/win(dows)?\s*(nt 5\.1|xp)/i)&&(t.streammsec*=4),this.play=function(){var n,r,a,o=t.getAdjustSamples(s.sampleRate),h=t.streamsize;t.samplerate===s.sampleRate?n=function(e){var i=e.outputBuffer;t.process(),i.getChannelData(0).set(t.strmL),i.getChannelData(1).set(t.strmR)}:2*t.samplerate===s.sampleRate?n=function(e){var i,s,n=t.strmL,r=t.strmR,a=e.outputBuffer,o=a.getChannelData(0),h=a.getChannelData(1),u=a.length;for(t.process(),i=s=0;u>i;i+=2,++s)o[i]=o[i+1]=n[s],h[i]=h[i+1]=r[s]}:(r=h,a=t.samplerate/s.sampleRate,n=function(e){var i,s=t.strmL,n=t.strmR,o=e.outputBuffer,u=o.getChannelData(0),l=o.getChannelData(1),c=o.length;for(i=0;c>i;++i)r>=h&&(t.process(),r-=h),u[i]=s[0|r],l[i]=n[0|r],r+=a}),e=s.createBufferSource(),i=s.createJavaScriptNode(o,2,t.channels),i.onaudioprocess=n,e.noteOn(0),e.connect(i),i.connect(s.destination)},this.pause=function(){e.disconnect(),i.disconnect()},m){var r=0,a=s.createBufferSource();this.fix_iOS6_1_problem=function(t){r+=t?1:-1,1===r?(a.noteOn(0),a.connect(s.destination)):0===r&&a.disconnect()}}}:"function"==typeof Audio&&"function"==typeof(new Audio).mozSetup?function(t){var e=function(){var t="var t=0;onmessage=function(e){if(t)t=clearInterval(t),0;if(typeof e.data=='number'&&e.data>0)t=setInterval(function(){postMessage(0);},e.data);};",e=new Blob([t],{type:"text/javascript"}),i=URL.createObjectURL(e);return new Worker(i)}();this.maxSamplerate=48e3,this.defaultSamplerate=44100,this.env="moz",this.play=function(){var i=new Audio,s=new Float32Array(t.streamsize*t.channels),n=t.streammsec,r=0,a=1e3*(t.streamsize/t.samplerate),o=Date.now(),h=function(){if(!(r>Date.now()-o)){var e=t.strmL,n=t.strmR,h=s.length,u=e.length;
for(t.process();u--;)s[--h]=n[u],s[--h]=e[u];i.mozWriteAudio(s),r+=a}};i.mozSetup(t.channels,t.samplerate),e.onmessage=h,e.postMessage(n)},this.pause=function(){e.postMessage(0)}}:function(){this.maxSamplerate=48e3,this.defaultSamplerate=44100,this.env="nop",this.play=function(){},this.pause=function(){}},c=(new F).bind(q);var E=i;"node"===d?module.exports=global.timbre=E:"browser"===d&&(E.noConflict=function(){var t=window.timbre,e=window.T;return function(i){return window.T===E&&(window.T=e),i&&window.timbre===E&&(window.timbre=t),E}}(),window.timbre=window.T=E),function(){function t(t){try{return e.plugins&&e.mimeTypes&&e.mimeTypes.length?e.plugins["Shockwave Flash"].description.match(/([0-9]+)/)[t]:new ActiveXObject("ShockwaveFlash.ShockwaveFlash").GetVariable("$version").match(/([0-9]+)/)[t]}catch(i){return-1}}if("nop"===c.impl.env&&"browser"===d&&!m){var e=navigator;if(!(10>t(0))){var i,s="TimbreFlashPlayerDiv",n=function(){var t=document.getElementsByTagName("script");if(t&&t.length)for(var e,i=0,s=t.length;s>i;++i)if(e=/^(.*\/)timbre(?:\.dev)?\.js$/i.exec(t[i].src))return e[1]+"timbre.swf"}();window.timbrejs_flashfallback_init=function(){function t(t){var e=0;this.maxSamplerate=44100,this.defaultSamplerate=44100,this.env="flash",this.play=function(){var s,r=Array(t.streamsize*t.channels),a=t.streammsec,o=0,h=1e3*(t.streamsize/t.samplerate),u=Date.now();s=function(){if(!(o>Date.now()-u)){var e=t.strmL,s=t.strmR,n=r.length,a=e.length;for(t.process();a--;)r[--n]=0|32768*s[a],r[--n]=0|32768*e[a];i.writeAudio(r.join(" ")),o+=h}},i.setup?(i.setup(t.channels,t.samplerate),e=setInterval(s,a)):console.warn("Cannot find "+n)},this.pause=function(){0!==e&&(i.cancel(),clearInterval(e),e=0)}}c.bind(t),delete window.timbrejs_flashfallback_init};var r,a,o=n,h=o+"?"+ +new Date,u="TimbreFlashPlayer",l=document.createElement("div");l.id=s,l.style.display="inline",l.width=l.height=1,e.plugins&&e.mimeTypes&&e.mimeTypes.length?(r=document.createElement("object"),r.id=u,r.classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",r.width=r.height=1,r.setAttribute("data",h),r.setAttribute("type","application/x-shockwave-flash"),a=document.createElement("param"),a.setAttribute("name","allowScriptAccess"),a.setAttribute("value","always"),r.appendChild(a),l.appendChild(r)):l.innerHTML='<object id="'+u+'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="1" height="1"><param name="movie" value="'+h+'" /><param name="bgcolor" value="#FFFFFF" /><param name="quality" value="high" /><param name="allowScriptAccess" value="always" /></object>',window.addEventListener("load",function(){document.body.appendChild(l),i=document[u]})}}}()})(),function(t){"use strict";function e(t){this.samplerate=t,this.frequency=340,this.Q=1,this.gain=0,this.x1L=this.x2L=this.y1L=this.y2L=0,this.x1R=this.x2R=this.y1R=this.y2R=0,this.b0=this.b1=this.b2=this.a1=this.a2=0,this.setType("lpf")}var i=e.prototype;i.process=function(t,e){var i,s,n,r,a,o,h=this.x1L,u=this.x2L,l=this.y1L,c=this.y2L,f=this.x1R,p=this.x2R,d=this.y1R,m=this.y2R,v=this.b0,g=this.b1,b=this.b2,_=this.a1,y=this.a2;for(a=0,o=t.length;o>a;++a)i=t[a],n=v*i+g*h+b*u-_*l-y*c,u=h,h=i,c=l,l=n,s=e[a],r=v*s+g*f+b*p-_*d-y*m,p=f,f=s,m=d,d=r,t[a]=n,e[a]=r;this.x1L=h,this.x2L=u,this.y1L=l,this.y2L=c,this.x1R=f,this.x2R=p,this.y1R=d,this.y2R=m},i.setType=function(t){var e;(e=s[t])&&(this.type=t,e.call(this,this.frequency,this.Q,this.gain))},i.setParams=function(t,e,i){this.frequency=t,this.Q=e,this.gain=i;var n=s[this.type];return n&&n.call(this,t,e,i),this};var s={lowpass:function(t,e){if(t/=.5*this.samplerate,t>=1)this.b0=1,this.b1=this.b2=this.a1=this.a2=0;else if(0>=t)this.b0=this.b1=this.b2=this.a1=this.a2=0;else{e=0>e?0:e;var i=Math.pow(10,.05*e),s=Math.sqrt(.5*(4-Math.sqrt(16-16/(i*i)))),n=Math.PI*t,r=.5*s*Math.sin(n),a=.5*(1-r)/(1+r),o=(.5+a)*Math.cos(n),h=.25*(.5+a-o);this.b0=2*h,this.b1=4*h,this.b2=this.b0,this.a1=2*-o,this.a2=2*a}},highpass:function(t,e){if(t/=.5*this.samplerate,t>=1)this.b0=this.b1=this.b2=this.a1=this.a2=0;else if(0>=t)this.b0=1,this.b1=this.b2=this.a1=this.a2=0;else{e=0>e?0:e;var i=Math.pow(10,.05*e),s=Math.sqrt((4-Math.sqrt(16-16/(i*i)))/2),n=Math.PI*t,r=.5*s*Math.sin(n),a=.5*(1-r)/(1+r),o=(.5+a)*Math.cos(n),h=.25*(.5+a+o);this.b0=2*h,this.b1=-4*h,this.b2=this.b0,this.a1=2*-o,this.a2=2*a}},bandpass:function(t,e){if(t/=.5*this.samplerate,t>0&&1>t)if(e>0){var i=Math.PI*t,s=Math.sin(i)/(2*e),n=Math.cos(i),r=1/(1+s);this.b0=s*r,this.b1=0,this.b2=-s*r,this.a1=-2*n*r,this.a2=(1-s)*r}else this.b0=this.b1=this.b2=this.a1=this.a2=0;else this.b0=this.b1=this.b2=this.a1=this.a2=0},lowshelf:function(t,e,i){t/=.5*this.samplerate;var s=Math.pow(10,i/40);if(t>=1)this.b0=s*s,this.b1=this.b2=this.a1=this.a2=0;else if(0>=t)this.b0=1,this.b1=this.b2=this.a1=this.a2=0;else{var n=Math.PI*t,r=1,a=.5*Math.sin(n)*Math.sqrt((s+1/s)*(1/r-1)+2),o=Math.cos(n),h=2*Math.sqrt(s)*a,u=s+1,l=s-1,c=1/(u+l*o+h);this.b0=s*(u-l*o+h)*c,this.b1=2*s*(l-u*o)*c,this.b2=s*(u-l*o-h)*c,this.a1=-2*(l+u*o)*c,this.a2=(u+l*o-h)*c}},highshelf:function(t,e,i){t/=.5*this.samplerate;var s=Math.pow(10,i/40);if(t>=1)this.b0=1,this.b1=this.b2=this.a1=this.a2=0;else if(0>=t)this.b0=s*s,this.b1=this.b2=this.a1=this.a2=0;else{var n=Math.PI*t,r=1,a=.5*Math.sin(n)*Math.sqrt((s+1/s)*(1/r-1)+2),o=Math.cos(n),h=2*Math.sqrt(s)*a,u=s+1,l=s-1,c=1/(u-l*o+h);this.b0=s*(u+l*o+h)*c,this.b1=-2*s*(l+u*o)*c,this.b2=s*(u+l*o-h)*c,this.a1=2*(l-u*o)*c,this.a2=(u-l*o-h)*c}},peaking:function(t,e,i){if(t/=.5*this.samplerate,t>0&&1>t){var s=Math.pow(10,i/40);if(e>0){var n=Math.PI*t,r=Math.sin(n)/(2*e),a=Math.cos(n),o=1/(1+r/s);this.b0=(1+r*s)*o,this.b1=-2*a*o,this.b2=(1-r*s)*o,this.a1=this.b1,this.a2=(1-r/s)*o}else this.b0=s*s,this.b1=this.b2=this.a1=this.a2=0}else this.b0=1,this.b1=this.b2=this.a1=this.a2=0},notch:function(t,e){if(t/=.5*this.samplerate,t>0&&1>t)if(e>0){var i=Math.PI*t,s=Math.sin(i)/(2*e),n=Math.cos(i),r=1/(1+s);this.b0=r,this.b1=-2*n*r,this.b2=r,this.a1=this.b1,this.a2=(1-s)*r}else this.b0=this.b1=this.b2=this.a1=this.a2=0;else this.b0=1,this.b1=this.b2=this.a1=this.a2=0},allpass:function(t,e){if(t/=.5*this.samplerate,t>0&&1>t)if(e>0){var i=Math.PI*t,s=Math.sin(i)/(2*e),n=Math.cos(i),r=1/(1+s);this.b0=(1-s)*r,this.b1=-2*n*r,this.b2=(1+s)*r,this.a1=this.b1,this.a2=this.b0}else this.b0=-1,this.b1=this.b2=this.a1=this.a2=0;else this.b0=1,this.b1=this.b2=this.a1=this.a2=0}};s.lpf=s.lowpass,s.hpf=s.highpass,s.bpf=s.bandpass,s.bef=s.notch,s.brf=s.notch,s.apf=s.allpass,t.modules.Biquad=e}(timbre),function(t){"use strict";function e(e){this.samplerate=e;var i=Math.round(Math.log(.1*e)*Math.LOG2E);this.buffersize=1<<i,this.bufferL=new t.fn.SignalArray(this.buffersize+1),this.bufferR=new t.fn.SignalArray(this.buffersize+1),this.wave=null,this._wave=null,this.writeIndex=this.buffersize>>1,this.readIndex=0,this.delayTime=20,this.rate=4,this.depth=20,this.feedback=.2,this.wet=.5,this.phase=0,this.phaseIncr=0,this.phaseStep=4,this.setWaveType("sin"),this.setDelayTime(this.delayTime),this.setRate(this.rate)}var i=e.prototype,s=[];s[0]=function(){for(var t=new Float32Array(512),e=0;512>e;++e)t[e]=Math.sin(2*Math.PI*(e/512));return t}(),s[1]=function(){for(var t,e=new Float32Array(512),i=0;512>i;++i)t=i/512-.25,e[i]=1-4*Math.abs(Math.round(t)-t);return e}(),i.setWaveType=function(t){"sin"===t?(this.wave=t,this._wave=s[0]):"tri"===t&&(this.wave=t,this._wave=s[1])},i.setDelayTime=function(t){this.delayTime=t;for(var e=this.writeIndex-(0|.001*t*this.samplerate);0>e;)e+=this.buffersize;this.readIndex=e},i.setRate=function(t){this.rate=t,this.phaseIncr=512*this.rate/this.samplerate*this.phaseStep},i.process=function(t,e){var i,s,n,r,a,o=this.bufferL,h=this.bufferR,u=this.buffersize,l=u-1,c=this._wave,f=this.phase,p=this.phaseIncr,d=this.writeIndex,m=this.readIndex,v=this.depth,g=this.feedback,b=this.wet,_=1-b,y=t.length,w=this.phaseStep;for(r=0;y>r;){for(n=c[0|f]*v,f+=p;f>512;)f-=512;for(a=0;w>a;++a,++r)s=m+u+n&l,i=.5*(o[s]+o[s+1]),o[d]=t[r]-i*g,t[r]=t[r]*_+i*b,i=.5*(h[s]+h[s+1]),h[d]=e[r]-i*g,e[r]=e[r]*_+i*b,d=d+1&l,m=m+1&l}this.phase=f,this.writeIndex=d,this.readIndex=m},t.modules.Chorus=e}(timbre),function(t){"use strict";function e(e,s){this.samplerate=e,this.channels=s,this.lastPreDelayFrames=0,this.preDelayReadIndex=0,this.preDelayWriteIndex=n,this.ratio=-1,this.slope=-1,this.linearThreshold=-1,this.dbThreshold=-1,this.dbKnee=-1,this.kneeThreshold=-1,this.kneeThresholdDb=-1,this.ykneeThresholdDb=-1,this.K=-1,this.attackTime=.003,this.releaseTime=.25,this.preDelayTime=.006,this.dbPostGain=0,this.effectBlend=1,this.releaseZone1=.09,this.releaseZone2=.16,this.releaseZone3=.42,this.releaseZone4=.98,this.detectorAverage=0,this.compressorGain=1,this.meteringGain=1,this.delayBufferL=new t.fn.SignalArray(i),this.delayBufferR=2===s?new t.fn.SignalArray(i):this.delayBufferL,this.preDelayTime=6,this.preDelayReadIndex=0,this.preDelayWriteIndex=n,this.maxAttackCompressionDiffDb=-1,this.meteringReleaseK=1-Math.exp(-1/(.325*this.samplerate)),this.setAttackTime(this.attackTime),this.setReleaseTime(this.releaseTime),this.setPreDelayTime(this.preDelayTime),this.setParams(-24,30,12)}var i=1024,s=i-1,n=256,r=5,a=e.prototype;a.clone=function(){var t=new e(this.samplerate,this.channels);return t.setAttackTime(this.attackTime),t.setReleaseTime(this.releaseTime),t.setPreDelayTime(this.preDelayTime),t.setParams(this.dbThreshold,this.dbKnee,this.ratio),t},a.setAttackTime=function(t){this.attackTime=Math.max(.001,t),this._attackFrames=this.attackTime*this.samplerate},a.setReleaseTime=function(t){this.releaseTime=Math.max(.001,t);var e=this.releaseTime*this.samplerate,i=.0025;this._satReleaseFrames=i*this.samplerate;var s=e*this.releaseZone1,n=e*this.releaseZone2,r=e*this.releaseZone3,a=e*this.releaseZone4;this._kA=.9999999999999998*s+1.8432219684323923e-16*n-1.9373394351676423e-16*r+8.824516011816245e-18*a,this._kB=-1.5788320352845888*s+2.3305837032074286*n-.9141194204840429*r+.1623677525612032*a,this._kC=.5334142869106424*s-1.272736789213631*n+.9258856042207512*r-.18656310191776226*a,this._kD=.08783463138207234*s-.1694162967925622*n+.08588057951595272*r-.00429891410546283*a,this._kE=-.042416883008123074*s+.1115693827987602*n-.09764676325265872*r+.028494263462021576*a},a.setPreDelayTime=function(t){this.preDelayTime=t;var e=t*this.samplerate;if(e>i-1&&(e=i-1),this.lastPreDelayFrames!==e){this.lastPreDelayFrames=e;for(var s=0,n=this.delayBufferL.length;n>s;++s)this.delayBufferL[s]=this.delayBufferR[s]=0;this.preDelayReadIndex=0,this.preDelayWriteIndex=e}},a.setParams=function(t,e,i){this._k=this.updateStaticCurveParameters(t,e,i);var s=this.saturate(1,this._k),n=1/s;n=Math.pow(n,.6),this._masterLinearGain=Math.pow(10,.05*this.dbPostGain)*n},a.kneeCurve=function(t,e){return this.linearThreshold>t?t:this.linearThreshold+(1-Math.exp(-e*(t-this.linearThreshold)))/e},a.saturate=function(t,e){var i;if(this.kneeThreshold>t)i=this.kneeCurve(t,e);else{var s=t?20*Math.log(t)*Math.LOG10E:-1e3,n=this.ykneeThresholdDb+this.slope*(s-this.kneeThresholdDb);i=Math.pow(10,.05*n)}return i},a.slopeAt=function(t,e){if(this.linearThreshold>t)return 1;var i=1.001*t,s=t?20*Math.log(t)*Math.LOG10E:-1e3,n=i?20*Math.log(i)*Math.LOG10E:-1e3,r=this.kneeCurve(t,e),a=this.kneeCurve(i,e),o=r?20*Math.log(r)*Math.LOG10E:-1e3,h=a?20*Math.log(a)*Math.LOG10E:-1e3;return(h-o)/(n-s)},a.kAtSlope=function(t){for(var e=this.dbThreshold+this.dbKnee,i=Math.pow(10,.05*e),s=.1,n=1e4,r=5,a=0;15>a;++a){var o=this.slopeAt(i,r);t>o?n=r:s=r,r=Math.sqrt(s*n)}return r},a.updateStaticCurveParameters=function(t,e,i){this.dbThreshold=t,this.linearThreshold=Math.pow(10,.05*t),this.dbKnee=e,this.ratio=i,this.slope=1/this.ratio,this.kneeThresholdDb=t+e,this.kneeThreshold=Math.pow(10,.05*this.kneeThresholdDb);var s=this.kAtSlope(1/this.ratio),n=this.kneeCurve(this.kneeThreshold,s);return this.ykneeThresholdDb=n?20*Math.log(n)*Math.LOG10E:-1e3,this._k=s,this._k},a.process=function(t,e){for(var i=1-this.effectBlend,n=this.effectBlend,a=this._k,o=this._masterLinearGain,h=this._satReleaseFrames,u=this._kA,l=this._kB,c=this._kC,f=this._kD,p=this._kE,d=64,m=t.length/d,v=0,g=this.detectorAverage,b=this.compressorGain,_=this.maxAttackCompressionDiffDb,y=1/this._attackFrames,w=this.preDelayReadIndex,x=this.preDelayWriteIndex,k=this.detectorAverage,A=this.delayBufferL,S=this.delayBufferR,T=this.meteringGain,I=this.meteringReleaseK,R=0;m>R;++R){var O,D=Math.asin(g)/(.5*Math.PI),M=D>b,L=b/D,j=L?20*Math.log(L)*Math.LOG10E:-1e3;if((1/0===j||isNaN(j))&&(j=-1),M){_=-1,L=j,L=-12>L?0:L>0?3:.25*(L+12);var P=L*L,F=P*L,q=P*P,E=u+l*L+c*P+f*F+p*q,B=r/E;O=Math.pow(10,.05*B)}else{(-1===_||j>_)&&(_=j);var C=Math.max(.5,_);L=.25/C,O=1-Math.pow(L,y)}for(var z=d;z--;){var N=0,G=.5*(t[v]+e[v]);A[x]=t[v],S[x]=e[v],0>G&&(G*=-1),G>N&&(N=G);var W=N;0>W&&(W*=-1);var V=this.saturate(W,a),K=1e-4>=W?1:V/W,Y=K?-20*Math.log(K)*Math.LOG10E:1e3;2>Y&&(Y=2);var $=Y/h,H=Math.pow(10,.05*$)-1,Q=K>k,U=Q?H:1;k+=(K-k)*U,k>1&&(k=1),1>O?b+=(D-b)*O:(b*=O,b>1&&(b=1));var Z=Math.sin(.5*Math.PI*b),J=i+n*o*Z,X=20*Math.log(Z)*Math.LOG10E;T>X?T=X:T+=(X-T)*I,t[v]=A[w]*J,e[v]=S[w]*J,v++,w=w+1&s,x=x+1&s}1e-6>k&&(k=1e-6),1e-6>b&&(b=1e-6)}this.preDelayReadIndex=w,this.preDelayWriteIndex=x,this.detectorAverage=k,this.compressorGain=b,this.maxAttackCompressionDiffDb=_,this.meteringGain=T},a.reset=function(){this.detectorAverage=0,this.compressorGain=1,this.meteringGain=1;for(var t=0,e=this.delayBufferL.length;e>t;++t)this.delayBufferL[t]=this.delayBufferR[t]=0;this.preDelayReadIndex=0,this.preDelayWriteIndex=n,this.maxAttackCompressionDiffDb=-1},t.modules.Compressor=e}(timbre),function(t){"use strict";function e(){}e.prototype.decode=function(t,i,s){if("string"==typeof t){if(/\.wav$/.test(t))return e.wav_decode(t,i,s);if(e.ogg_decode&&/\.ogg$/.test(t))return e.ogg_decode(t,i,s);if(e.mp3_decode&&/\.mp3$/.test(t))return e.mp3_decode(t,i,s)}else if("object"==typeof t){if("wav"===t.type)return e.wav_decode(t.data,i,s);if(e.ogg_decode&&"ogg"===t.type)return e.ogg_decode(t.data,i,s);if(e.mp3_decode&&"mp3"===t.type)return e.mp3_decode(t.data,i,s)}return e.webkit_decode?"object"==typeof t?e.webkit_decode(t.data||t,i,s):e.webkit_decode(t,i,s):e.moz_decode?e.moz_decode(t,i,s):(i(!1),void 0)},t.modules.Decoder=e,e.getBinaryWithPath="browser"===t.envtype?function(e,i){t.fn.fix_iOS6_1_problem(!0);var s=new XMLHttpRequest;s.open("GET",e),s.responseType="arraybuffer",s.onreadystatechange=function(){4===s.readyState&&(s.response?i(new Uint8Array(s.response)):void 0!==s.responseBody&&i(new Uint8Array(VBArray(s.responseBody).toArray())),t.fn.fix_iOS6_1_problem(!1))},s.send()}:function(t,e){e("no support")};var i=function(t){for(var e,i,s,n,r,a=new Int32Array(t.length/3),o=0,h=t.length,u=0;h>o;)e=t[o++],i=t[o++],s=t[o++],n=e+(i<<8)+(s<<16),r=8388608&n?n-16777216:n,a[u++]=r;return a};e.wav_decode=function(){var t=function(t,e,s){if("RIFF"!==String.fromCharCode(t[0],t[1],t[2],t[3]))return e(!1);var n=t[4]+(t[5]<<8)+(t[6]<<16)+(t[7]<<24);if(n+8!==t.length)return e(!1);if("WAVE"!==String.fromCharCode(t[8],t[9],t[10],t[11]))return e(!1);if("fmt "!==String.fromCharCode(t[12],t[13],t[14],t[15]))return e(!1);for(var r=t[22]+(t[23]<<8),a=t[24]+(t[25]<<8)+(t[26]<<16)+(t[27]<<24),o=t[34]+(t[35]<<8),h=36;t.length>h&&"data"!==String.fromCharCode(t[h],t[h+1],t[h+2],t[h+3]);)h+=1;if(h>=t.length)return e(!1);h+=4;var u=t[h]+(t[h+1]<<8)+(t[h+2]<<16)+(t[h+3]<<24),l=(u/r>>1)/a;if(h+=4,u>t.length-h)return e(!1);var c,f,p;c=new Float32Array(0|l*a),2===r&&(f=new Float32Array(c.length),p=new Float32Array(c.length)),e({samplerate:a,channels:r,buffer:[c,f,p],duration:l}),8===o?t=new Int8Array(t.buffer,h):16===o?t=new Int16Array(t.buffer,h):32===o?t=new Int32Array(t.buffer,h):24===o&&(t=i(new Uint8Array(t.buffer,h)));var d,m,v,g=1/((1<<o-1)-1);if(2===r)for(h=m=0,d=c.length;d>h;++h)v=f[h]=t[m++]*g,v+=p[h]=t[m++]*g,c[h]=.5*v;else for(h=0,d=c.length;d>h;++h)c[h]=t[h]*g;s()};return function(i,s,n){"string"==typeof i?e.getBinaryWithPath(i,function(e){t(e,s,n)}):t(i,s,n)}}(),e.webkit_decode=function(){if("undefined"!=typeof webkitAudioContext){var i=t.fn._audioContext,s=function(t,e,s){var n,r,a,o,h;if("string"==typeof t)return s(!1);var u;try{u=i.createBuffer(t.buffer,!1)}catch(l){return e(!1)}n=i.sampleRate,r=u.numberOfChannels,2===r?(a=u.getChannelData(0),o=u.getChannelData(1)):a=o=u.getChannelData(0),h=a.length/n;for(var c=new Float32Array(a),f=0,p=c.length;p>f;++f)c[f]=.5*(c[f]+o[f]);e({samplerate:n,channels:r,buffer:[c,a,o],duration:h}),s()};return function(t,i,n){if(t instanceof File){var r=new FileReader;r.onload=function(t){s(new Uint8Array(t.target.result),i,n)},r.readAsArrayBuffer(t)}else"string"==typeof t?e.getBinaryWithPath(t,function(t){s(t,i,n)}):s(t,i,n)}}}(),e.moz_decode=function(){return"function"==typeof Audio&&"function"==typeof(new Audio).mozSetup?function(t,e,i){var s,n,r,a,o,h,u=0,l=new Audio(t);l.volume=0,l.addEventListener("loadedmetadata",function(){s=l.mozSampleRate,n=l.mozChannels,h=l.duration,r=new Float32Array(0|l.duration*s),2===n&&(a=new Float32Array(0|l.duration*s),o=new Float32Array(0|l.duration*s)),2===n?l.addEventListener("MozAudioAvailable",function(t){for(var e,i=t.frameBuffer,s=0,n=i.length;n>s;s+=2)e=a[u]=i[s],e+=o[u]=i[s+1],r[u]=.5*e,u+=1},!1):l.addEventListener("MozAudioAvailable",function(t){for(var e=t.frameBuffer,i=0,s=e.length;s>i;++i)r[i]=e[i],u+=1},!1),l.play(),setTimeout(function(){e({samplerate:s,channels:n,buffer:[r,a,o],duration:h})},1e3)},!1),l.addEventListener("ended",function(){i()},!1),l.load()}:void 0}()}(timbre),function(t){"use strict";function e(t){this.samplerate=t||44100,this.value=s,this.status=f,this.curve="linear",this.step=1,this.releaseNode=null,this.loopNode=null,this.emit=null,this._envValue=new i(t),this._table=[],this._initValue=s,this._curveValue=0,this._defaultCurveType=r,this._index=0,this._counter=0}function i(t){this.samplerate=t,this.value=s,this.step=1,this._curveType=r,this._curveValue=0,this._grow=0,this._a2=0,this._b1=0,this._y1=0,this._y2=0}var s=e.ZERO=1e-6,n=e.CurveTypeSet=0,r=e.CurveTypeLin=1,a=e.CurveTypeExp=2,o=e.CurveTypeSin=3,h=e.CurveTypeWel=4,u=e.CurveTypeCurve=5,l=e.CurveTypeSqr=6,c=e.CurveTypeCub=7,f=e.StatusWait=0,p=e.StatusGate=1,d=e.StatusSustain=2,m=e.StatusRelease=3,v=e.StatusEnd=4,g={set:n,lin:r,linear:r,exp:a,exponential:a,sin:o,sine:o,wel:h,welch:h,sqr:l,squared:l,cub:c,cubed:c};e.CurveTypeDict=g;var b=e.prototype;b.clone=function(){var t=new e(this.samplerate);return t._table=this._table,t._initValue=this._initValue,t.setCurve(this.curve),null!==this.releaseNode&&t.setReleaseNode(this.releaseNode+1),null!==this.loopNode&&t.setLoopNode(this.loopNode+1),t.setStep(this.step),t.reset(),t},b.setTable=function(t){this._initValue=t[0],this._table=t.slice(1),this.value=this._envValue.value=this._initValue,this._index=0,this._counter=0,this.status=f},b.setCurve=function(t){"number"==typeof t?(this._defaultCurveType=u,this._curveValue=t,this.curve=t):(this._defaultCurveType=g[t]||null,this.curve=t)},b.setReleaseNode=function(t){"number"==typeof t&&t>0&&(this.releaseNode=t-1)},b.setLoopNode=function(t){"number"==typeof t&&t>0&&(this.loopNode=t-1)},b.setStep=function(t){this.step=this._envValue.step=t},b.reset=function(){this.value=this._envValue.value=this._initValue,this._index=0,this._counter=0,this.status=f},b.release=function(){null!==this.releaseNode&&(this._counter=0,this.status=m)},b.getInfo=function(t){var e,i,s=this._table,n=0,r=1/0,a=1/0,o=!1;for(e=0,i=s.length;i>e;++e){this.loopNode===e&&(r=n),this.releaseNode===e&&(t>n?n+=t:n=t,a=n);var h=s[e];Array.isArray(h)&&(n+=h[1])}return 1/0!==r&&1/0===a&&(n+=t,o=!0),{totalDuration:n,loopBeginTime:r,releaseBeginTime:a,isEndlessLoop:o}},b.calcStatus=function(){var t,e,i,s,a=this.status,o=this._table,h=this._index,l=this._counter,c=this._curveValue,g=this._defaultCurveType,b=this.loopNode,_=this.releaseNode,y=this._envValue,w=null;switch(a){case f:case v:break;case p:case m:for(;0>=l;)if(h>=o.length){if(a===p&&null!==b){h=b;continue}a=v,l=1/0,s=n,w="ended"}else if(a!==p||h!==_)t=o[h++],e=t[0],s=null===t[2]?g:t[2],s===u&&(c=t[3],.001>Math.abs(c)&&(s=r)),i=t[1],l=y.setNext(e,i,s,c);else{if(null!==b&&_>b){h=b;continue}a=d,l=1/0,s=n,w="sustained"}}return this.status=a,this.emit=w,this._index=h,this._counter=l,a},b.next=function(){return 1&this.calcStatus()&&(this.value=this._envValue.next()||s),this._counter-=1,this.value},b.process=function(t){var e,i=this._envValue,n=t.length;if(1&this.calcStatus())for(e=0;n>e;++e)t[e]=i.next()||s;else{var r=this.value||s;for(e=0;n>e;++e)t[e]=r}this.value=t[n-1],this._counter-=t.length},i.prototype.setNext=function(t,e,i,s){var f,p,d,m,v,g,b,y=this.step,w=this.value,x=0|.001*e*this.samplerate/y;switch(1>x&&(x=1,i=n),i){case n:this.value=t;break;case r:f=(t-w)/x;break;case a:f=0!==w?Math.pow(t/w,1/x):0;break;case o:p=Math.PI/x,m=.5*(t+w),v=2*Math.cos(p),g=.5*(t-w),b=g*Math.sin(.5*Math.PI-p),w=m-g;break;case h:p=.5*Math.PI/x,v=2*Math.cos(p),t>=w?(m=w,g=0,b=-Math.sin(p)*(t-w)):(m=t,g=w-t,b=Math.cos(p)*(w-t)),w=m+g;break;case u:d=(t-w)/(1-Math.exp(s)),m=w+d,v=d,f=Math.exp(s/x);break;case l:g=Math.sqrt(w),b=Math.sqrt(t),f=(b-g)/x;break;case c:g=Math.pow(w,.33333333),b=Math.pow(t,.33333333),f=(b-g)/x}return this.next=_[i],this._grow=f,this._a2=m,this._b1=v,this._y1=g,this._y2=b,x};var _=[];_[n]=function(){return this.value},_[r]=function(){return this.value+=this._grow,this.value},_[a]=function(){return this.value*=this._grow,this.value},_[o]=function(){var t=this._b1*this._y1-this._y2;return this.value=this._a2-t,this._y2=this._y1,this._y1=t,this.value},_[h]=function(){var t=this._b1*this._y1-this._y2;return this.value=this._a2+t,this._y2=this._y1,this._y1=t,this.value},_[u]=function(){return this._b1*=this._grow,this.value=this._a2-this._b1,this.value},_[l]=function(){return this._y1+=this._grow,this.value=this._y1*this._y1,this.value},_[c]=function(){return this._y1+=this._grow,this.value=this._y1*this._y1*this._y1,this.value},i.prototype.next=_[n],t.modules.Envelope=e,t.modules.EnvelopeValue=i}(timbre),function(t){"use strict";function e(e){e="number"==typeof e?e:512,e=1<<Math.ceil(Math.log(e)*Math.LOG2E),this.length=e,this.buffer=new t.fn.SignalArray(e),this.real=new t.fn.SignalArray(e),this.imag=new t.fn.SignalArray(e),this._real=new t.fn.SignalArray(e),this._imag=new t.fn.SignalArray(e),this.mag=new t.fn.SignalArray(e>>1),this.minDecibels=-30,this.maxDecibels=-100;var i=s.get(e);this._bitrev=i.bitrev,this._sintable=i.sintable,this._costable=i.costable}var i=e.prototype;i.setWindow=function(e){if("string"==typeof e){var i=/([A-Za-z]+)(?:\(([01]\.?\d*)\))?/.exec(e);if(null!==i){var s=i[1].toLowerCase(),r=void 0!==i[2]?+i[2]:.25,a=n[s];if(a){this._window||(this._window=new t.fn.SignalArray(this.length));var o=this._window,h=0,u=this.length;for(r=0>r?0:r>1?1:r;u>h;++h)o[h]=a(h,u,r);this.windowName=e}}}},i.forward=function(t){var e,i,s,n,r,a,o,h,u,l,c,f=this.buffer,p=this.real,d=this.imag,m=this._window,v=this._bitrev,g=this._sintable,b=this._costable,_=f.length;if(m)for(e=0;_>e;++e)f[e]=t[e]*m[e];else f.set(t);for(e=0;_>e;++e)p[e]=f[v[e]],d[e]=0;for(s=1;_>s;s=n)for(r=0,n=s+s,a=_/n,i=0;s>i;i++){for(o=b[r],h=g[r],e=i;_>e;e+=n)u=e+s,l=h*d[u]+o*p[u],c=o*d[u]-h*p[u],p[u]=p[e]-l,p[e]+=l,d[u]=d[e]-c,d[e]+=c;r+=a}var y,w,x=this.mag;for(e=0;_>e;++e)y=p[e],w=d[e],x[e]=Math.sqrt(y*y+w*w);return{real:p,imag:d}},i.inverse=function(t,e){var i,s,n,r,a,o,h,u,l,c,f,p=this.buffer,d=this._real,m=this._imag,v=this._bitrev,g=this._sintable,b=this._costable,_=p.length;for(i=0;_>i;++i)s=v[i],d[i]=+t[s],m[i]=-e[s];for(n=1;_>n;n=r)for(a=0,r=n+n,o=_/r,s=0;n>s;s++){for(h=b[a],u=g[a],i=s;_>i;i+=r)l=i+n,c=u*m[l]+h*d[l],f=h*m[l]-u*d[l],d[l]=d[i]-c,d[i]+=c,m[l]=m[i]-f,m[i]+=f;a+=o}for(i=0;_>i;++i)p[i]=d[i]/_;return p},i.getFrequencyData=function(t){var e,i=this.minDecibels,s=Math.min(this.mag.length,t.length);if(s){var n,r=this.mag,a=0;for(e=0;s>e;++e)n=r[e],t[e]=n?20*Math.log(n)*Math.LOG10E:i,t[e]>a&&(a=t[e])}return t};var s={get:function(e){return s[e]||function(){var i,n,r=function(){var t,i,s,n,r;for(t=new Int16Array(e),r=e>>1,i=s=0;t[i]=s,!(++i>=e);){for(n=r;s>=n;)s-=n,n>>=1;s+=n}return t}(),a=Math.floor(Math.log(e)/Math.LN2),o=new t.fn.SignalArray((1<<a)-1),h=new t.fn.SignalArray((1<<a)-1),u=2*Math.PI;for(i=0,n=o.length;n>i;++i)o[i]=Math.sin(u*(i/e)),h[i]=Math.cos(u*(i/e));return s[e]={bitrev:r,sintable:o,costable:h},s[e]}()}},n=function(){var t=Math.PI,e=2*Math.PI,i=Math.abs,s=Math.pow,n=Math.cos,r=Math.sin,a=function(e){return r(t*e)/(t*e)},o=Math.E;return{rectangular:function(){return 1},hann:function(t,i){return.5*(1-n(e*t/(i-1)))},hamming:function(t,i){return.54-.46*n(e*t/(i-1))},tukery:function(e,i,s){return s*(i-1)/2>e?.5*(1+n(t*(2*e/(s*(i-1))-1))):e>(i-1)*(1-s/2)?.5*(1+n(t*(2*e/(s*(i-1))-2/s+1))):1},cosine:function(e,i){return r(t*e/(i-1))},lanczos:function(t,e){return a(2*t/(e-1)-1)},triangular:function(t,e){return 2/(e+1)*((e+1)/2-i(t-(e-1)/2))},bartlett:function(t,e){return 2/(e-1)*((e-1)/2-i(t-(e-1)/2))},gaussian:function(t,e,i){return s(o,-.5*s((t-(e-1)/2)/(i*(e-1)/2),2))},bartlettHann:function(t,s){return.62-.48*i(t/(s-1)-.5)-.38*n(e*t/(s-1))},blackman:function(i,s,r){var a=(1-r)/2,o=.5,h=r/2;return a-o*n(e*i/(s-1))+h*n(4*t*i/(s-1))}}}();t.modules.FFT=e}(timbre),function(t){"use strict";function e(t){this.samplerate=t||44100,this.wave=null,this.step=1,this.frequency=0,this.value=0,this.phase=0,this.feedback=!1,this._x=0,this._lastouts=0,this._coeff=r/this.samplerate,this._radtoinc=r/(2*Math.PI)}function i(t,e,i,s){var n,r,a,o,h,u=l[e];if(void 0!==u){switch("function"==typeof u&&(u=u()),i){case"@1":for(r=512;1024>r;++r)u[r]=0;break;case"@2":for(r=512;1024>r;++r)u[r]=Math.abs(u[r]);break;case"@3":for(r=256;512>r;++r)u[r]=0;for(r=512;768>r;++r)u[r]=Math.abs(u[r]);for(r=768;1024>r;++r)u[r]=0;break;case"@4":for(n=new Float32Array(1024),r=0;512>r;++r)n[r]=u[r<<1];u=n;break;case"@5":for(n=new Float32Array(1024),r=0;512>r;++r)n[r]=Math.abs(u[r<<1]);u=n}if(void 0!==s&&50!==s){for(s*=.01,s=0>s?0:s>1?1:s,n=new Float32Array(1024),a=0|1024*s,r=0;a>r;++r)n[r]=u[0|512*(r/a)];for(h=1024-a,o=0;1024>r;++r,++o)n[r]=u[0|512*(o/h)+512];u=n}if("+"===t)for(r=0;1024>r;++r)u[r]=.5*u[r]+.5;else if("-"===t)for(r=0;1024>r;++r)u[r]*=-1;return u}}function s(t){var e=new Float32Array(1024),i=t.length>>1;if(-1!==[2,4,8,16,32,64,128,256,512,1024].indexOf(i))for(var s=0,n=0;i>s;++s){var r=parseInt(t.substr(2*s,2),16);r=128&r?(r-256)/128:r/127;for(var a=0,o=1024/i;o>a;++a)e[n++]=r}return e}function n(t){var e=new Float32Array(1024);if(8===t.length){var i,s,n=parseInt(t,16),r=new Float32Array(8);for(r[0]=1,i=0;7>i;++i)r[i+1]=.0625*(15&n),n>>=4;for(i=0;8>i;++i){var a=0,o=(i+1)/1024;for(s=0;1024>s;++s)e[s]+=Math.sin(2*Math.PI*a)*r[i],a+=o}var h,u=0;for(i=0;1024>i;++i)(h=Math.abs(e[i]))>u&&(u=h);if(u>0)for(i=0;1024>i;++i)e[i]/=u}return e}var r=1024,a=r-1,o=e.prototype;o.setWave=function(e){var i,s,n=this.wave;if(this.wave||(this.wave=new Float32Array(r+1)),"function"==typeof e)for(i=0;r>i;++i)n[i]=e(i/r);else if(t.fn.isSignalArray(e))if(e.length===n.length)n.set(e);else for(s=e.length/r,i=0;r>i;++i)n[i]=e[0|i*s];else"string"==typeof e&&void 0!==(s=h(e))&&this.wave.set(s);this.wave[r]=this.wave[0]},o.clone=function(){var t=new e(this.samplerate);return t.wave=this.wave,t.step=this.step,t.frequency=this.frequency,t.value=this.value,t.phase=this.phase,t.feedback=this.feedback,t},o.reset=function(){this._x=0},o.next=function(){var t=this._x,e=0|t+this.phase*this._radtoinc;return this.value=this.wave[e&a],t+=this.frequency*this._coeff*this.step,t>r&&(t-=r),this._x=t,this.value},o.process=function(t){var e,i,s,n,o,h,u=this.wave,l=this._radtoinc,c=this._x,f=this.frequency*this._coeff,p=this.step;if(this.feedback){var d=this._lastouts;for(l*=this.phase,h=0;p>h;++h)e=c+d*l,i=0|e,s=e-i,i&=a,n=u[i],o=u[i+1],t[h]=d=n+s*(o-n),c+=f;this._lastouts=d}else{var m=this.phase*l;for(h=0;p>h;++h)e=c+m,i=0|e,s=e-i,i&=a,n=u[i],o=u[i+1],t[h]=n+s*(o-n),c+=f}c>r&&(c-=r),this._x=c,this.value=t[t.length-1]},o.processWithFreqArray=function(t,e){var i,s,n,o,h,u,l=this.wave,c=this._radtoinc,f=this._x,p=this._coeff,d=this.step;if(this.feedback){var m=this._lastouts;for(c*=this.phase,u=0;d>u;++u)i=f+m*c,s=0|i,n=i-s,s&=a,o=l[s],h=l[s+1],t[u]=m=o+n*(h-o),f+=e[u]*p;this._lastouts=m}else{var v=this.phase*this._radtoinc;for(u=0;d>u;++u)i=f+v,s=0|i,n=i-s,s&=a,o=l[s],h=l[s+1],t[u]=o+n*(h-o),f+=e[u]*p}f>r&&(f-=r),this._x=f,this.value=t[t.length-1]},o.processWithPhaseArray=function(t,e){var i,s,n,o,h,u,l=this.wave,c=this._radtoinc,f=this._x,p=this.frequency*this._coeff,d=this.step;if(this.feedback){var m=this._lastouts;for(c*=this.phase,u=0;d>u;++u)i=f+m*c,s=0|i,n=i-s,s&=a,o=l[s],h=l[s+1],t[u]=m=o+n*(h-o),f+=p;this._lastouts=m}else for(u=0;d>u;++u)i=f+e[u]*c,s=0|i,n=i-s,s&=a,o=l[s],h=l[s+1],t[u]=o+n*(h-o),f+=p;f>r&&(f-=r),this._x=f,this.value=t[t.length-1]},o.processWithFreqAndPhaseArray=function(t,e,i){var s,n,o,h,u,l,c=this.wave,f=this._radtoinc,p=this._x,d=this._coeff,m=this.step;if(this.feedback){var v=this._lastouts;for(f*=this.phase,l=0;m>l;++l)s=p+v*f,n=0|s,o=s-n,n&=a,h=c[n],u=c[n+1],t[l]=v=h+o*(u-h),p+=e[l]*d;this._lastouts=v}else for(l=0;m>l;++l)s=p+i[l]*r,n=0|s,o=s-n,n&=a,h=c[n],u=c[n+1],t[l]=h+o*(u-h),p+=e[l]*d;p>r&&(p-=r),this._x=p,this.value=t[t.length-1]};var h=function(t){var e=l[t];if(void 0!==e)return"function"==typeof e&&(e=e()),e;var r;if(r=/^([\-+]?)(\w+)(?:\((@[0-7])?:?(\d+)?\))?$/.exec(t),null!==r){var a=r[1],o=r[2],h=r[3],u=r[4];if(e=i(a,o,h,u),void 0!==e)return l[t]=e,e}return r=/^wavb\(((?:[0-9a-fA-F][0-9a-fA-F])+)\)$/.exec(t),null!==r?s(r[1]):(r=/^wavc\(([0-9a-fA-F]{8})\)$/.exec(t),null!==r?n(r[1]):void 0)};e.getWavetable=h;var u=function(e,i){var s,n,r=new Float32Array(1024);if("function"==typeof i)for(n=0;1024>n;++n)r[n]=i(n/1024);else if(t.fn.isSignalArray(i))if(i.length===r.length)r.set(i);else for(s=i.length/1024,n=0;1024>n;++n)r[n]=i[0|n*s];l[e]=r};e.setWavetable=u;var l={sin:function(){for(var t=new Float32Array(1024),e=0;1024>e;++e)t[e]=Math.sin(2*Math.PI*(e/1024));return t},cos:function(){for(var t=new Float32Array(1024),e=0;1024>e;++e)t[e]=Math.cos(2*Math.PI*(e/1024));return t},pulse:function(){for(var t=new Float32Array(1024),e=0;1024>e;++e)t[e]=512>e?1:-1;return t},tri:function(){for(var t,e=new Float32Array(1024),i=0;1024>i;++i)t=i/1024-.25,e[i]=1-4*Math.abs(Math.round(t)-t);return e},saw:function(){for(var t,e=new Float32Array(1024),i=0;1024>i;++i)t=i/1024,e[i]=2*(t-Math.round(t));return e},fami:function(){for(var t=[0,.125,.25,.375,.5,.625,.75,.875,.875,.75,.625,.5,.375,.25,.125,0,-.125,-.25,-.375,-.5,-.625,-.75,-.875,-1,-1,-.875,-.75,-.625,-.5,-.375,-.25,-.125],e=new Float32Array(1024),i=0;1024>i;++i)e[i]=t[0|i/1024*t.length];return e},konami:function(){for(var t=[-.625,-.875,-.125,.75,.5,.125,.5,.75,.25,-.125,.5,.875,.625,0,.25,.375,-.125,-.75,0,.625,.125,-.5,-.375,-.125,-.75,-1,-.625,0,-.375,-.875,-.625,-.25],e=new Float32Array(1024),i=0;1024>i;++i)e[i]=t[0|i/1024*t.length];return e}};t.modules.Oscillator=e}(timbre),function(t){"use strict";function e(e,a){this.samplerate=e;var o,h,u=e/44100;for(h=2*n.length,this.comb=Array(h),this.combout=Array(h),o=0;h>o;++o)this.comb[o]=new i(n[o%n.length]*u),this.combout[o]=new t.fn.SignalArray(a);for(h=2*r.length,this.allpass=Array(h),o=0;h>o;++o)this.allpass[o]=new s(r[o%r.length]*u);this.outputs=[new t.fn.SignalArray(a),new t.fn.SignalArray(a)],this.damp=0,this.wet=.33,this.setRoomSize(.5),this.setDamp(.5)}function i(e){this.buffer=new t.fn.SignalArray(0|e),this.buffersize=this.buffer.length,this.bufidx=0,this.feedback=0,this.filterstore=0,this.damp=0}function s(e){this.buffer=new t.fn.SignalArray(0|e),this.buffersize=this.buffer.length,this.bufidx=0}var n=[1116,1188,1277,1356,1422,1491,1557,1617],r=[225,556,441,341],a=e.prototype;a.setRoomSize=function(t){var e=this.comb,i=.28*t+.7;this.roomsize=t,e[0].feedback=e[1].feedback=e[2].feedback=e[3].feedback=e[4].feedback=e[5].feedback=e[6].feedback=e[7].feedback=e[8].feedback=e[9].feedback=e[10].feedback=e[11].feedback=e[12].feedback=e[13].feedback=e[14].feedback=e[15].feedback=i},a.setDamp=function(t){var e=this.comb,i=.4*t;
this.damp=t,e[0].damp=e[1].damp=e[2].damp=e[3].damp=e[4].damp=e[5].damp=e[6].damp=e[7].damp=e[8].damp=e[9].damp=e[10].damp=e[11].damp=e[12].damp=e[13].damp=e[14].damp=e[15].damp=i},a.process=function(t,e){var i,s=this.comb,n=this.combout,r=this.allpass,a=this.outputs[0],o=this.outputs[1],h=this.wet,u=1-h,l=t.length;for(s[0].process(t,n[0]),s[1].process(t,n[1]),s[2].process(t,n[2]),s[3].process(t,n[3]),s[4].process(t,n[4]),s[5].process(t,n[5]),s[6].process(t,n[6]),s[7].process(t,n[7]),s[8].process(e,n[8]),s[9].process(e,n[9]),s[10].process(e,n[10]),s[11].process(e,n[11]),s[12].process(e,n[12]),s[13].process(e,n[13]),s[14].process(e,n[14]),s[15].process(e,n[15]),i=0;l>i;++i)a[i]=n[0][i]+n[1][i]+n[2][i]+n[3][i]+n[4][i]+n[5][i]+n[6][i]+n[7][i],o[i]=n[8][i]+n[9][i]+n[10][i]+n[11][i]+n[12][i]+n[13][i]+n[14][i]+n[15][i];for(r[0].process(a,a),r[1].process(a,a),r[2].process(a,a),r[3].process(a,a),r[4].process(o,o),r[5].process(o,o),r[6].process(o,o),r[7].process(o,o),i=0;l>i;++i)t[i]=a[i]*h+t[i]*u,e[i]=o[i]*h+e[i]*u},i.prototype.process=function(t,e){var i,s,n,r=this.buffer,a=this.buffersize,o=this.bufidx,h=this.filterstore,u=this.feedback,l=this.damp,c=1-l,f=t.length;for(n=0;f>n;++n)i=.015*t[n],s=r[o],h=s*c+h*l,r[o]=i+h*u,++o>=a&&(o=0),e[n]=s;this.bufidx=o,this.filterstore=h},s.prototype.process=function(t,e){var i,s,n,r,a=this.buffer,o=this.buffersize,h=this.bufidx,u=t.length;for(r=0;u>r;++r)i=t[r],n=a[h],s=-i+n,a[h]=i+.5*n,++h>=o&&(h=0),e[r]=s;this.bufidx=h},t.modules.Reverb=e}(timbre),function(t){"use strict";function e(t){return new i(t)}function i(t){if(this.fragments=[],t){var e=t.samplerate||44100,i=t.buffer[0].length/e;this.fragments.push(new s(t,0,i))}}function s(t,e,i,s,n,r,o){t||(t=a),this.buffer=t.buffer[0],this.samplerate=t.samplerate||44100,this.start=e,this._duration=i,this.reverse=s||!1,this.pitch=n||100,this.stretch=r||!1,this.pan=o||50}function n(t,e){this.tape=t,this.fragments=t.fragments,this.samplerate=e||44100,this.isEnded=!1,this.buffer=null,this.bufferIndex=0,this.bufferIndexIncr=0,this.bufferBeginIndex=0,this.bufferEndIndex=0,this.fragment=null,this.fragmentIndex=0,this.panL=.5,this.panR=.5}var r=new Float32Array(60),a={buffer:r,samplerate:1};e.silence=function(t){return new e(a).slice(0,1).fill(t)},e.join=function(t){for(var e=new i,s=0;t.length>s;s++)t[s]instanceof i&&e.add_fragments(t[s].fragments);return e},e.Tape=i,i.prototype.add_fragment=function(t){return this.fragments.push(t),this},i.prototype.add_fragments=function(t){for(var e=0;t.length>e;e++)this.fragments.push(t[e]);return this},i.prototype.duration=function(){for(var t=0,e=0;this.fragments.length>e;e++)t+=this.fragments[e].duration();return t},i.prototype.slice=function(t,e){var s=this.duration();t+e>s&&(e=s-t);for(var n=new i,r=t,a=e,o=0;this.fragments.length>o;o++){var h=this.fragments[o],u=h.create(r,a),l=u[0];if(r=u[1],a=u[2],l&&n.add_fragment(l),0===a)break}return n},i.prototype.cut=i.prototype.slice,i.prototype.concat=function(t){var e=new i;return e.add_fragments(this.fragments),e.add_fragments(t.fragments),e},i.prototype.loop=function(t){var e,s=[];for(e=0;this.fragments.length>e;e++)s.push(this.fragments[e].clone());var n=new i;for(e=0;t>e;e++)n.add_fragments(s);return n},i.prototype.times=i.prototype.loop,i.prototype.split=function(t){for(var e=this.duration()/t,i=[],s=0;t>s;s++)i.push(this.slice(s*e,e));return i},i.prototype.fill=function(t){var e=this.duration();if(0===e)throw"EmptyFragment";var i=0|t/e,s=t%e;return this.loop(i).plus(this.slice(0,s))},i.prototype.replace=function(t,s,n){var r=new i,a=t+s;r=r.plus(this.slice(0,t));var o=r.duration();t>o&&(r=r.plus(e.silence(t-o))),r=r.plus(n);var h=this.duration();return h>a&&(r=r.plus(this.slice(a,h-a))),r},i.prototype.reverse=function(){for(var t=new i,e=this.fragments.length;e--;){var s=this.fragments[e].clone();s.reverse=!s.isReversed(),t.add_fragment(s)}return t},i.prototype.pitch=function(t,e){var s=new i;e=e||!1;for(var n=0;this.fragments.length>n;n++){var r=this.fragments[n].clone();r.pitch*=.01*t,r.stretch=e,s.add_fragment(r)}return s},i.prototype.stretch=function(t){var e=100*(1/(.01*t));return this.pitch(e,!0)},i.prototype.pan=function(t){var e=new i;t>100?t=100:0>t&&(t=0);for(var s=0;this.fragments.length>s;s++){var n=this.fragments[s].clone();n.pan=t,e.add_fragment(n)}return e},i.prototype.silence=function(){return e.silence(this.duration())},i.prototype.join=function(t){for(var e=new i,s=0;t.length>s;s++)t[s]instanceof i&&e.add_fragments(t[s].fragments);return e},i.prototype.getBuffer=function(){var t=44100;this.fragments.length>0&&(t=this.fragments[0].samplerate);var e=new n(this,t),i=0|this.duration()*t;return{samplerate:t,buffer:e.fetch(i)}},s.prototype.duration=function(){return this._duration*(100/this.pitch)},s.prototype.original_duration=function(){return this._duration},s.prototype.isReversed=function(){return this.reverse},s.prototype.isStretched=function(){return this.stretched},s.prototype.create=function(t,e){var i=this.duration();if(t>=i)return[null,t-i,e];var s,n=t+e>=i;n?(s=i-t,e-=s):(s=e,e=0);var r=this.clone();return r.start=this.start+.01*t*this.pitch,r._duration=.01*s*this.pitch,r.reverse=!1,[r,0,e]},s.prototype.clone=function(){var t=new s;return t.buffer=this.buffer,t.samplerate=this.samplerate,t.start=this.start,t._duration=this._duration,t.reverse=this.reverse,t.pitch=this.pitch,t.stretch=this.stretch,t.pan=this.pan,t},e.Fragment=s,e.TapeStream=n,n.prototype.reset=function(){return this.isEnded=!1,this.buffer=null,this.bufferIndex=0,this.bufferIndexIncr=0,this.bufferBeginIndex=0,this.bufferEndIndex=0,this.fragment=null,this.fragmentIndex=0,this.panL=.5,this.panR=.5,this.isLooped=!1,this},n.prototype.fetch=function(e){var i=new t.fn.SignalArray(e),s=new t.fn.SignalArray(e),n=this.fragments;if(0===n.length)return[i,s];for(var a,o=100*this.samplerate,h=this.buffer,u=this.bufferIndex,l=this.bufferIndexIncr,c=this.bufferBeginIndex,f=this.bufferEndIndex,p=this.fragment,d=this.fragmentIndex,m=this.panL,v=this.panR,g=0;e>g;g++){for(;!h||c>u||u>=f;)if(!p||n.length>d)p=n[d++],h=p.buffer,l=p.samplerate/o*p.pitch,c=p.start*p.samplerate,f=c+p.original_duration()*p.samplerate,a=.01*p.pan,m=1-a,v=a,p.reverse?(l*=-1,u=f+l):u=c;else{if(!this.isLooped){this.isEnded=!0,h=r,l=0,u=0;break}h=null,u=0,l=0,c=0,f=0,p=null,d=0}i[g]=h[0|u]*m,s[g]=h[0|u]*v,u+=l}return this.buffer=h,this.bufferIndex=u,this.bufferIndexIncr=l,this.bufferBeginIndex=c,this.bufferEndIndex=f,this.fragment=p,this.fragmentIndex=d,this.panL=m,this.panR=v,[i,s]},t.modules.Scissor=e}(timbre),function(t){"use strict";function e(e){this.samplerate=e;var i=Math.ceil(Math.log(1.5*e)*Math.LOG2E);this.buffersize=1<<i,this.buffermask=this.buffersize-1,this.writeBufferL=new t.fn.SignalArray(this.buffersize),this.writeBufferR=new t.fn.SignalArray(this.buffersize),this.readBufferL=this.writeBufferL,this.readBufferR=this.writeBufferR,this.delaytime=null,this.feedback=null,this.cross=null,this.mix=null,this.prevL=0,this.prevR=0,this.readIndex=0,this.writeIndex=0,this.setParams(125,.25,!1,.45)}var i=e.prototype;i.setParams=function(t,e,i,s){if(this.delaytime!==t){this.delaytime=t;var n=0|.001*t*this.samplerate;n>this.buffermask&&(n=this.buffermask),this.writeIndex=this.readIndex+n&this.buffermask}this.feedback!==e&&(this.feedback=e),this.cross!==i&&(this.cross=i,i?(this.readBufferL=this.writeBufferR,this.readBufferR=this.writeBufferL):(this.readBufferL=this.writeBufferL,this.readBufferR=this.writeBufferR)),this.mix!==s&&(this.mix=s)},i.process=function(t,e){var i,s,n=this.readBufferL,r=this.readBufferR,a=this.writeBufferL,o=this.writeBufferR,h=this.readIndex,u=this.writeIndex,l=this.buffermask,c=this.feedback,f=this.mix,p=1-f,d=this.prevL,m=this.prevR,v=t.length;for(s=0;v>s;++s)i=n[h],a[u]=t[s]-i*c,t[s]=d=.5*(t[s]*p+i*f+d),i=r[h],o[u]=e[s]-i*c,e[s]=m=.5*(e[s]*p+i*f+m),h+=1,u=u+1&l;this.readIndex=h&this.buffermask,this.writeIndex=u,this.prevL=d,this.prevR=m},t.modules.StereoDelay=e}(timbre),function(t){"use strict";var e=t.fn,i=t.modules;e.register("audio",function(t){var i=e.getClass("buffer"),r=new i(t);return r.playbackState=e.FINISHED_STATE,r._.isLoaded=!1,Object.defineProperties(r,{isLoaded:{get:function(){return this._.isLoaded}}}),r.load=s,r.loadthis=n,r});var s=function(s){var n=this,r=this._,a=new i.Deferred(this),o=arguments,h=1;a.done(function(){n._.emit("done")}),"function"==typeof o[h]&&(a.done(o[h++]),"function"==typeof o[h]&&a.fail(o[h++])),r.loadedTime=0;var u=function(i,s){var r=n._;i?(n.playbackState=e.PLAYING_STATE,r.samplerate=i.samplerate,r.channels=i.channels,r.bufferMix=null,r.buffer=i.buffer,r.phase=0,r.phaseIncr=i.samplerate/t.samplerate,r.duration=1e3*i.duration,r.currentTime=0,r.isReversed&&(r.phaseIncr*=-1,r.phase=i.buffer[0].length+r.phaseIncr),n._.emit("loadedmetadata")):a.reject(s)},l=function(){n._.isLoaded=!0,n._.plotFlush=!0,n._.emit("loadeddata"),a.resolveWith(n)};return(new i.Decoder).decode(s,u,l),a.promise()},n=function(){return s.apply(this,arguments),this}}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.biquad=new n(s.samplerate),s.freq=t(340),s.band=t(1),s.gain=t(0),s.plotBefore=a,s.plotRange=[-18,18],s.plotFlush=!0}var i=t.fn,s=t.modules.FFT,n=t.modules.Biquad,r=20;i.extend(e);var a=function(t,e,i,s,n){t.lineWidth=1,t.strokeStyle="rgb(192, 192, 192)";for(var a=.5*this._.samplerate,o=1;10>=o;++o)for(var h=1;4>=h;h++){var u=o*Math.pow(10,h);if(!(r>=u||u>=a)){t.beginPath();var l=Math.log(u/r)/Math.log(a/r);l=(0|l*s+e)+.5,t.moveTo(l,i),t.lineTo(l,i+n),t.stroke()}}var c=n/6;for(o=1;6>o;o++){t.beginPath();var f=(0|i+o*c)+.5;t.moveTo(e,f),t.lineTo(e+s,f),t.stroke()}},o=e.prototype;Object.defineProperties(o,{type:{set:function(t){var e=this._;t!==e.biquad.type&&(e.biquad.setType(t),e.plotFlush=!0)},get:function(){return this._.biquad.type}},freq:{set:function(e){this._.freq=t(e)},get:function(){return this._.freq}},cutoff:{set:function(e){this._.freq=t(e)},get:function(){return this._.freq}},res:{set:function(e){this._.band=t(e)},get:function(){return this._.band}},Q:{set:function(e){this._.band=t(e)},get:function(){return this._.band}},band:{set:function(e){this._.band=t(e)},get:function(){return this._.band}},gain:{set:function(e){this._.gain=t(e)},get:function(){return this._.gain}}}),o.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this);var s=e.freq.process(t).cells[0][0],n=e.band.process(t).cells[0][0],r=e.gain.process(t).cells[0][0];(e.prevFreq!==s||e.prevband!==n||e.prevGain!==r)&&(e.prevFreq=s,e.prevband=n,e.prevGain=r,e.biquad.setParams(s,n,r),e.plotFlush=!0),e.bypassed||e.biquad.process(this.cells[1],this.cells[2]),i.outputSignalAR(this)}return this};var h=new s(2048),u=t.Object.prototype.plot;o.plot=function(t){if(this._.plotFlush){var e=new n(this._.samplerate);e.setType(this.type),e.setParams(this.freq.valueOf(),this.band.valueOf(),this.gain.valueOf());var i=new Float32Array(h.length);i[0]=1,e.process(i,i),h.forward(i);var s,a,o,l,c,f,p,d,m=512,v=new Float32Array(m),g=.5*this._.samplerate,b=new Float32Array(m);for(h.getFrequencyData(b),s=0;m>s;++s)o=Math.pow(g/r,s/m)*r,a=o/(g/b.length),l=0|a,c=a-l,0===l?p=f=d=b[l]:(f=b[l-1],p=b[l],d=(1-c)*f+c*p),v[s]=d;this._.plotData=v,this._.plotFlush=null}return u.call(this,t)},i.register("biquad",e),i.register("lowpass",function(t){return new e(t).set("type","lowpass")}),i.register("highpass",function(t){return new e(t).set("type","highpass")}),i.register("bandpass",function(t){return new e(t).set("type","bandpass")}),i.register("lowshelf",function(t){return new e(t).set("type","lowshelf")}),i.register("highshelf",function(t){return new e(t).set("type","highshelf")}),i.register("peaking",function(t){return new e(t).set("type","peaking")}),i.register("notch",function(t){return new e(t).set("type","notch")}),i.register("allpass",function(t){return new e(t).set("type","allpass")}),i.alias("lpf","lowpass"),i.alias("hpf","highpass"),i.alias("bpf","bandpass"),i.alias("bef","notch"),i.alias("brf","notch"),i.alias("apf","allpass")}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.fixAR(this);var s=this._;s.pitch=t(1),s.samplerate=44100,s.channels=0,s.bufferMix=null,s.buffer=[],s.isLooped=!1,s.isReversed=!1,s.duration=0,s.currentTime=0,s.currentTimeObj=null,s.phase=0,s.phaseIncr=0,s.onended=i.make_onended(this,0),s.onlooped=r(this)}var i=t.fn,s=t.modules.Scissor.Tape,n=function(t){return i.isSignalArray(t)||t instanceof Float32Array};i.extend(e);var r=function(t){return function(){var e=t._;e.phase>=e.buffer[0].length?e.phase=0:0>e.phase&&(e.phase=e.buffer[0].length+e.phaseIncr),t._.emit("looped")}},a=e.prototype,o=function(e){var i=this._;if("object"==typeof e){var r,a,o=[];n(e)?(o[0]=e,a=1):"object"==typeof e&&(e instanceof t.Object?e=e.buffer:e instanceof s&&(e=e.getBuffer()),Array.isArray(e.buffer)?n(e.buffer[0])&&(n(e.buffer[1])&&n(e.buffer[2])?(a=2,o=e.buffer):(a=1,o=[e.buffer[0]])):n(e.buffer)&&(a=1,o=[e.buffer]),"number"==typeof e.samplerate&&(r=e.samplerate)),o.length&&(r>0&&(i.samplerate=e.samplerate),i.bufferMix=null,i.buffer=o,i.phase=0,i.phaseIncr=i.samplerate/t.samplerate,i.duration=1e3*i.buffer[0].length/i.samplerate,i.currentTime=0,i.plotFlush=!0,this.reverse(i.isReversed))}};Object.defineProperties(a,{buffer:{set:o,get:function(){var t=this._;return{samplerate:t.samplerate,channels:t.channels,buffer:t.buffer}}},pitch:{set:function(e){this._.pitch=t(e)},get:function(){return this._.pitch}},isLooped:{get:function(){return this._.isLooped}},isReversed:{get:function(){return this._.isReversed}},samplerate:{get:function(){return this._.samplerate}},duration:{get:function(){return this._.duration}},currentTime:{set:function(e){if("number"==typeof e){var i=this._;e>=0&&i.duration>=e&&(i.phase=e/1e3*i.samplerate,i.currentTime=e)}else e instanceof t.Object?this._.currentTimeObj=e:null===e&&(this._.currentTimeObj=null)},get:function(){return this._.currentTimeObj?this._.currentTimeObj:this._.currentTime}}}),a.clone=function(){var t=this._,e=i.clone(this);return t.buffer.length&&o.call(e,{buffer:t.buffer,samplerate:t.samplerate,channels:t.channels}),e.loop(t.isLooped),e.reverse(t.isReversed),e},a.slice=function(e,s){var n=this._,r=t(n.originkey),a=n.isReversed;if(n.buffer.length){if(e="number"==typeof e?0|.001*e*n.samplerate:0,s="number"==typeof s?0|.001*s*n.samplerate:n.buffer[0].length,e>s){var h=e;e=s,s=h,a=!a}2===n.channels?o.call(r,{buffer:[i.pointer(n.buffer[0],e,s-e),i.pointer(n.buffer[1],e,s-e),i.pointer(n.buffer[2],e,s-e)],samplerate:n.samplerate}):o.call(r,{buffer:i.pointer(n.buffer[0],e,s-e),samplerate:n.samplerate}),r.playbackState=i.PLAYING_STATE}return r.loop(n.isLooped),r.reverse(n.isReversed),r},a.reverse=function(t){var e=this._;return e.isReversed=!!t,e.isReversed?(e.phaseIncr>0&&(e.phaseIncr*=-1),0===e.phase&&e.buffer.length&&(e.phase=e.buffer[0].length+e.phaseIncr)):0>e.phaseIncr&&(e.phaseIncr*=-1),this},a.loop=function(t){return this._.isLooped=!!t,this},a.bang=function(t){return this.playbackState=t===!1?i.FINISHED_STATE:i.PLAYING_STATE,this._.phase=0,this._.emit("bang"),this},a.process=function(t){var e=this._;if(!e.buffer.length)return this;if(this.tickID!==t){this.tickID=t;var s,n,r,a=this.cells[1],o=this.cells[2],h=e.phase,u=e.cellsize;if(2===e.channels?(n=e.buffer[1],r=e.buffer[2]):n=r=e.buffer[0],e.currentTimeObj){var l,c=e.currentTimeObj.process(t).cells[0],f=.001*e.samplerate;for(s=0;u>s;++s)l=c[s],h=l*f,a[s]=n[0|h]||0,o[s]=r[0|h]||0;e.phase=h,e.currentTime=l}else{var p=e.pitch.process(t).cells[0][0],d=e.phaseIncr*p;for(s=0;u>s;++s)a[s]=n[0|h]||0,o[s]=r[0|h]||0,h+=d;h>=n.length?e.isLooped?i.nextTick(e.onlooped):i.nextTick(e.onended):0>h&&(e.isLooped?i.nextTick(e.onlooped):i.nextTick(e.onended)),e.phase=h,e.currentTime+=i.currentTimeIncr}i.outputSignalAR(this)}return this};var h=t.Object.prototype.plot;a.plot=function(t){var e,i,s=this._;if(s.plotFlush){2===s.channels?(e=s.buffer[1],i=s.buffer[2]):e=i=s.buffer[0];for(var n=new Float32Array(2048),r=0,a=e.length/2048,o=0;2048>o;o++)n[o]=.5*(e[0|r]+i[0|r]),r+=a;s.plotData=n,s.plotFlush=null}return h.call(this,t)},i.register("buffer",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var n=new s(this._.samplerate);n.setDelayTime(20),n.setRate(4),n.depth=20,n.feedback=.2,n.mix=.33,this._.chorus=n}var i=t.fn,s=t.modules.Chorus;i.extend(e);var n=e.prototype;Object.defineProperties(n,{type:{set:function(t){this._.chorus.setDelayTime(t)},get:function(){return this._.chorus.wave}},delay:{set:function(t){t>=.5&&80>=t&&this._.chorus.setDelayTime(t)},get:function(){return this._.chorus.delayTime}},rate:{set:function(t){"number"==typeof t&&t>0&&this._.chorus.setRate(t)},get:function(){return this._.chorus.rate}},depth:{set:function(t){"number"==typeof t&&t>=0&&100>=t&&(t*=this._.samplerate/44100,this._.chorus.depth=t)},get:function(){return this._.chorus.depth}},fb:{set:function(t){"number"==typeof t&&t>=-1&&1>=t&&(this._.chorus.feedback=.99996*t)},get:function(){return this._.chorus.feedback}},mix:{set:function(e){this._.mix=t(e)},get:function(){return this._.mix}}}),n.process=function(t){var e=this._;return this.tickID!==t&&(this.tickID=t,i.inputSignalAR(this),e.bypassed||e.chorus.process(this.cells[1],this.cells[2]),i.outputSignalAR(this)),this},i.register("chorus",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e);var i=this._;i.min=-.8,i.max=.8}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{minmax:{set:function(t){var e=this._;"number"==typeof t&&(e.min=-Math.abs(t),e.max=-e.min)},get:function(){return this._.max}},min:{set:function(t){var e=this._;"number"==typeof t&&(t>e.max?e.max=t:e.min=t)},get:function(){return this._.min}},max:{set:function(t){var e=this._;"number"==typeof t&&(e.min>t?e.min=t:e.max=t)},get:function(){return this._.max}}}),s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n,r=this.cells[1],a=this.cells[2],o=r.length,h=e.min,u=e.max;if(e.ar){for(i.inputSignalAR(this),s=0;o>s;++s)n=r[s],h>n?n=h:n>u&&(n=u),r[s]=n,n=a[s],h>n?n=h:n>u&&(n=u),a[s]=n;i.outputSignalAR(this)}else n=i.inputSignalKR(this),h>n?n=h:n>u&&(n=u),this.cells[0][0]=n,i.outputSignalKR(this)}return this},i.register("clip",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.prevThresh=-24,s.prevKnee=30,s.prevRatio=12,s.thresh=t(s.prevThresh),s.knee=t(s.prevKnee),s.ratio=t(s.prevRatio),s.postGain=6,s.reduction=0,s.attack=3,s.release=25,s.comp=new n(s.samplerate),s.comp.dbPostGain=s.postGain,s.comp.setAttackTime(.001*s.attack),s.comp.setReleaseTime(.001*s.release),s.comp.setPreDelayTime(6),s.comp.setParams(s.prevThresh,s.prevKnee,s.prevRatio)}var i=t.fn,s=t.timevalue,n=t.modules.Compressor;i.extend(e);var r=e.prototype;Object.defineProperties(r,{thresh:{set:function(e){this._.thresh=t(e)},get:function(){return this._.thresh}},thre:{set:function(e){this._.thresh=t(e)},get:function(){return this._.thre}},knee:{set:function(e){this._.kne=t(e)},get:function(){return this._.knee}},ratio:{set:function(e){this._.ratio=t(e)},get:function(){return this._.ratio}},gain:{set:function(t){"number"==typeof t&&(this._.comp.dbPostGain=t)},get:function(){return this._.comp.dbPostGain}},attack:{set:function(t){"string"==typeof t&&(t=s(t)),"number"==typeof t&&(t=0>t?0:t>1e3?1e3:t,this._.attack=t,this._.comp.setAttackTime(.001*t))},get:function(){return this._.attack}},release:{set:function(t){"string"==typeof t&&(t=s(t)),"number"==typeof t&&(t=0>t?0:t>1e3?1e3:t,this._.release=t,this._.comp.setReleaseTime(.001*t))},get:function(){return this._.release}},reduction:{get:function(){return this._.reduction}}}),r.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this);var s=e.thresh.process(t).cells[0][0],n=e.knee.process(t).cells[0][0],r=e.ratio.process(t).cells[0][0];(e.prevThresh!==s||e.prevKnee!==n||e.prevRatio!==r)&&(e.prevThresh=s,e.prevKnee=n,e.prevRatio=r,e.comp.setParams(s,n,r)),e.bypassed||(e.comp.process(this.cells[1],this.cells[2]),e.reduction=e.comp.meteringGain),i.outputSignalAR(this)}return this},i.register("comp",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.time=t(100),s.fb=t(.2),s.cross=t(!1),s.mix=.33,s.delay=new n(s.samplerate)}var i=t.fn,s=t.timevalue,n=t.modules.StereoDelay;i.extend(e);var r=e.prototype;Object.defineProperties(r,{time:{set:function(e){"string"==typeof e&&(e=s(e)),this._.time=t(e)},get:function(){return this._.time}},fb:{set:function(e){this._.fb=t(e)},get:function(){return this._.fb}},cross:{set:function(e){this._.cross=t(e)},get:function(){return this._.cross}},mix:{set:function(t){"number"==typeof t&&(t=t>1?1:0>t?0:t,this._.mix=t)},get:function(){return this._.mix}}}),r.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s=e.time.process(t).cells[0][0],n=e.fb.process(t).cells[0][0],r=0!==e.cross.process(t).cells[0][0],a=e.mix;(e.prevTime!==s||e.prevFb!==n||e.prevCross!==r||e.prevMix!==a)&&(e.prevTime=s,e.prevFb=n,e.prevCross=r,e.prevMix=a,e.delay.setParams(s,n,r,a)),i.inputSignalAR(this),e.bypassed||e.delay.process(this.cells[1],this.cells[2]),i.outputSignalAR(this)}return this},i.register("delay",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.pre=t(60),s.post=t(-18),s.x1L=s.x2L=s.y1L=s.y2L=0,s.x1R=s.x2R=s.y1R=s.y2R=0,s.b0=s.b1=s.b2=s.a1=s.a2=0,s.cutoff=0,s.Q=1,s.preScale=0,s.postScale=0}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{cutoff:{set:function(t){"number"==typeof t&&t>0&&(this._.cutoff=t)},get:function(){return this._.cutoff}},pre:{set:function(e){this._.pre=t(e)},get:function(){return this._.pre}},post:{set:function(e){this._.post=t(e)},get:function(){return this._.post}}}),s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this);var s=-e.pre.process(t).cells[0][0],r=-e.post.process(t).cells[0][0];if((e.prevPreGain!==s||e.prevPostGain!==r)&&(e.prevPreGain=s,e.prevPostGain=r,e.preScale=Math.pow(10,.05*-s),e.postScale=Math.pow(10,.05*-r)),!e.bypassed){var a,o,h,u,l,c=this.cells[1],f=this.cells[2],p=e.preScale,d=e.postScale;if(e.cutoff){e.prevCutoff!==e.cutoff&&(e.prevCutoff=e.cutoff,n(e));var m=e.x1L,v=e.x2L,g=e.y1L,b=e.y2L,_=e.x1R,y=e.x2R,w=e.y1R,x=e.y2R,k=e.b0,A=e.b1,S=e.b2,T=e.a1,I=e.a2;for(a=0,o=c.length;o>a;++a)u=c[a]*p,l=k*u+A*m+S*v-T*g-I*b,h=l*d,-1>h?h=-1:h>1&&(h=1),c[a]=h,v=m,m=u,b=g,g=l,u=f[a]*p,l=k*u+A*_+S*y-T*w-I*x,h=l*d,-1>h?h=-1:h>1&&(h=1),f[a]=h,y=_,_=u,x=w,w=l;e.x1L=m,e.x2L=v,e.y1L=g,e.y2L=b,e.x1R=_,e.x2R=y,e.y1R=w,e.y2R=x}else for(a=0,o=c.length;o>a;++a)h=c[a]*p*d,-1>h?h=-1:h>1&&(h=1),c[a]=h,h=f[a]*p*d,-1>h?h=-1:h>1&&(h=1),f[a]=h}i.outputSignalAR(this)}return this};var n=function(t){var e=2*Math.PI*t.cutoff/t.samplerate,i=Math.cos(e),s=Math.sin(e),n=s/(2*t.Q),r=1/(1+n);t.b0=.5*(1-i)*r,t.b1=1-i*r,t.b2=.5*(1-i)*r,t.a1=-2*i*r,t.a2=1-n*r};i.register("dist",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),this._.ar=!1}var i=t.fn;i.extend(e);var s=e.prototype;s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n,r,a,o,h,u=this.nodes,l=this.cells[0],c=this.cells[1],f=this.cells[2],p=u.length,d=l.length;if(e.ar){if(u.length>0)for(u[0].process(t),a=u[0].cells[1],o=u[0].cells[2],c.set(a),f.set(o),s=1;p>s;++s)for(u[s].process(t),a=u[s].cells[1],o=u[s].cells[2],n=0;d>n;++n)h=a[n],c[n]=0===h?0:c[n]/h,h=o[n],f[n]=0===h?0:f[n]/h;else for(n=0;d>n;++n)c[n]=f[s]=0;i.outputSignalAR(this)}else{if(u.length>0)for(r=u[0].process(t).cells[0][0],s=1;p>s;++s)h=u[s].process(t).cells[0][0],r=0===h?0:r/h;else r=0;l[0]=r,i.outputSignalKR(this)}}return this},i.register("/",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e);var i=this._;i.env=new r(i.samplerate),i.env.setStep(i.cellsize),i.tmp=new s.SignalArray(i.cellsize),i.ar=!1,i.plotFlush=!0,i.onended=h(this),this.on("ar",o)}function i(t,e,i,s,n,r){var a=i;return"number"==typeof t[s]?a=t[s]:"number"==typeof t[n]?a=t[n]:r&&("string"==typeof t[s]?a=r(t[s]):"string"==typeof t[n]&&(a=r(t[n]))),e>a&&(a=e),a}var s=t.fn,n=t.timevalue,r=t.modules.Envelope,a=s.isDictionary;s.extend(e);var o=function(t){this._.env.setStep(t?1:this._.cellsize)},h=function(t){return function(){t._.emit("ended")}},u=e.prototype;Object.defineProperties(u,{table:{set:function(t){Array.isArray(t)&&(l.call(this,t),this._.plotFlush=!0)},get:function(){return this._.env.table}},curve:{set:function(t){this._.env.setCurve(t)},get:function(){return this._.env.curve}},releaseNode:{set:function(t){this._.env.setReleaseNode(t),this._.plotFlush=!0},get:function(){return this._.env.releaseNode+1}},loopNode:{set:function(t){this._.env.setLoopNode(t),this._.plotFlush=!0},get:function(){return this._.env.loopNode+1}}}),u.clone=function(){var t=s.clone(this);return t._.env=this._.env.clone(),t},u.reset=function(){return this._.env.reset(),this},u.release=function(){var t=this._;return t.env.release(),t.emit("released"),this},u.bang=function(){var t=this._;return t.env.reset(),t.env.status=r.StatusGate,t.emit("bang"),this},u.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var i,n=this.cells[1],r=this.cells[2],a=e.cellsize;if(this.nodes.length)s.inputSignalAR(this);else for(i=0;a>i;++i)n[i]=r[i]=1;var o,h=null;if(e.ar){var u=e.tmp;for(e.env.process(u),i=0;a>i;++i)n[i]*=u[i],r[i]*=u[i];h=e.env.emit}else{for(o=e.env.next(),i=0;a>i;++i)n[i]*=o,r[i]*=o;h=e.env.emit}s.outputSignalAR(this),h&&("ended"===h?s.nextTick(e.onended):this._.emit(h,e.value))}return this};var l=function(t){for(var e,i,s,a,o=this._.env,h=[t[0]||f],u=1,l=t.length;l>u;++u)e=t[u][0]||f,i=t[u][1],s=t[u][2],"number"!=typeof i&&(i="string"==typeof i?n(i):10),10>i&&(i=10),"number"==typeof s?(a=s,s=r.CurveTypeCurve):(s=r.CurveTypeDict[s]||null,a=0),h.push([e,i,s,a]);o.setTable(h)},c=t.Object.prototype.plot;u.plot=function(t){if(this._.plotFlush){var e,i,s=this._.env.clone(),n=s.getInfo(1e3),a=n.totalDuration,o=n.loopBeginTime,h=n.releaseBeginTime,u=new Float32Array(256),l=0,f=a/u.length,p=!1,d=0|.001*a*this._.samplerate;for(d/=u.length,s.setStep(d),s.status=r.StatusGate,e=0,i=u.length;i>e;++e)u[e]=s.next(),l+=f,!p&&l>=h&&(s.release(),p=!0);this._.plotData=u,this._.plotBefore=function(t,e,i,s,n){var r,u;1/0!==o&&1/0!==h&&(r=e+s*(o/a),u=e+s*(h/a),u-=r,t.fillStyle="rgba(224, 224, 224, 0.8)",t.fillRect(r,0,u,n)),1/0!==h&&(r=e+s*(h/a),u=s-r,t.fillStyle="rgba(212, 212, 212, 0.8)",t.fillRect(r,0,u,n))};var m=1/0,v=-1/0;for(e=0;i>e;++e)m>u[e]?m=u[e]:u[e]>v&&(v=u[e]);1>v&&(v=1),this._.plotRange=[m,v],this._.plotData=u,this._.plotFlush=null}return c.call(this,t)},s.register("env",e);var f=r.ZERO;s.register("perc",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,10,"a","attackTime",n),o=i(s,10,1e3,"r","releaseTime",n),h=i(s,f,1,"lv","level");return s.table=[f,[h,r],[f,o]],new e(t)}),s.register("adsr",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,10,"a","attackTime",n),o=i(s,10,300,"d","decayTime",n),h=i(s,f,.5,"s","sustainLevel"),u=i(s,10,1e3,"r","decayTime",n),l=i(s,f,1,"lv","level");return s.table=[f,[l,r],[h,o],[f,u]],s.releaseNode=3,new e(t)}),s.register("adshr",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,10,"a","attackTime",n),o=i(s,10,300,"d","decayTime",n),h=i(s,f,.5,"s","sustainLevel"),u=i(s,10,500,"h","holdTime",n),l=i(s,10,1e3,"r","decayTime",n),c=i(s,f,1,"lv","level");return s.table=[f,[c,r],[h,o],[h,u],[f,l]],new e(t)}),s.register("asr",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,10,"a","attackTime",n),o=i(s,f,.5,"s","sustainLevel"),h=i(s,10,1e3,"r","releaseTime",n);return s.table=[f,[o,r],[f,h]],s.releaseNode=2,new e(t)}),s.register("dadsr",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,100,"dl","delayTime",n),o=i(s,10,10,"a","attackTime",n),h=i(s,10,300,"d","decayTime",n),u=i(s,f,.5,"s","sustainLevel"),l=i(s,10,1e3,"r","relaseTime",n),c=i(s,f,1,"lv","level");return s.table=[f,[f,r],[c,o],[u,h],[f,l]],s.releaseNode=4,new e(t)}),s.register("ahdsfr",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,10,"a","attackTime",n),o=i(s,10,10,"h","holdTime",n),h=i(s,10,300,"d","decayTime",n),u=i(s,f,.5,"s","sustainLevel"),l=i(s,10,5e3,"f","fadeTime",n),c=i(s,10,1e3,"r","relaseTime",n),p=i(s,f,1,"lv","level");return s.table=[f,[p,r],[p,o],[u,h],[f,l],[f,c]],s.releaseNode=5,new e(t)}),s.register("linen",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,10,"a","attackTime",n),o=i(s,10,1e3,"s","sustainTime",n),h=i(s,10,1e3,"r","releaseTime",n),u=i(s,f,1,"lv","level");return s.table=[f,[u,r],[u,o],[f,h]],new e(t)}),s.register("env.tri",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,20,1e3,"dur","duration",n),o=i(s,f,1,"lv","level");return r*=.5,s.table=[f,[o,r],[f,r]],new e(t)}),s.register("env.cutoff",function(t){a(t[0])||t.unshift({});var s=t[0],r=i(s,10,100,"r","relaseTime",n),o=i(s,f,1,"lv","level");return s.table=[o,[f,r]],new e(t)})}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.biquads=Array(7),s.plotBefore=o,s.plotRange=[-18,18],s.plotFlush=!0}var i=t.fn,s=t.modules.FFT,n=t.modules.Biquad,r=20,a={hpf:0,lf:1,lmf:2,mf:3,hmf:4,hf:5,lpf:6};i.extend(e);var o=function(t,e,i,s,n){t.lineWidth=1,t.strokeStyle="rgb(192, 192, 192)";for(var a=.5*this._.samplerate,o=1;10>=o;++o)for(var h=1;4>=h;h++){var u=o*Math.pow(10,h);if(!(r>=u||u>=a)){t.beginPath();var l=Math.log(u/r)/Math.log(a/r);l=(0|l*s+e)+.5,t.moveTo(l,i),t.lineTo(l,i+n),t.stroke()}}var c=n/6;for(o=1;6>o;o++){t.beginPath();var f=(0|i+o*c)+.5;t.moveTo(e,f),t.lineTo(e+s,f),t.stroke()}},h=e.prototype;Object.defineProperties(h,{params:{set:function(t){if("object"==typeof t)for(var e=Object.keys(t),i=0,s=e.length;s>i;++i){var n=t[e[i]];Array.isArray(n)?this.setParams(e[i],n[0],n[1],n[2]):this.setParams(e[i])}}}}),h.setParams=function(t,e,i,s){var r=this._;if("string"==typeof t&&(t=a[t]),t>=0&&r.biquads.length>t){if(t|=0,"number"==typeof e&&"number"==typeof i){"number"!=typeof s&&(s=0);var o=r.biquads[t];if(!o)switch(o=r.biquads[t]=new n(r.samplerate),t){case 0:o.setType("highpass");break;case r.biquads.length-1:o.setType("lowpass");break;default:o.setType("peaking")}o.setParams(e,i,s)}else r.biquads[t]=void 0;r.plotFlush=!0}return this},h.getParams=function(t){var e=this._,i=e.biquads[0|t];return i?{freq:i.frequency,Q:i.Q,gain:i.gain}:void 0},h.process=function(t){var e=this._;if(this.tickID!==t){if(this.tickID=t,i.inputSignalAR(this),!e.bypassed)for(var s=this.cells[1],n=this.cells[2],r=e.biquads,a=0,o=r.length;o>a;++a)r[a]&&r[a].process(s,n);i.outputSignalAR(this)}return this};var u=new s(2048),l=t.Object.prototype.plot;h.plot=function(t){if(this._.plotFlush){var e=this._,i=new Float32Array(u.length);i[0]=1;for(var s=0,a=e.biquads.length;a>s;++s){var o=this.getParams(s);if(o){var h=new n(e.samplerate);0===s?h.setType("highpass"):s===a-1?h.setType("lowpass"):h.setType("peaking"),h.setParams(o.freq,o.Q,o.gain),h.process(i,i)}}u.forward(i);var c,f,p,d,m,v,g,b=512,_=new Float32Array(b),y=.5*e.samplerate,w=new Float32Array(b);for(u.getFrequencyData(w),s=0;b>s;++s)f=Math.pow(y/r,s/b)*r,c=f/(y/w.length),p=0|c,d=c-p,0===p?v=m=g=w[p]:(m=w[p-1],v=w[p],g=(1-d)*m+d*v),_[s]=g;this._.plotData=_,this._.plotFlush=null}return l.call(this,t)},i.register("eq",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.listener(this),i.fixAR(this),this.real=new t.ChannelObject(this),this.imag=new t.ChannelObject(this),this.cells[3]=this.real.cell,this.cells[4]=this.imag.cell;var n=this._;n.fft=new s(2*n.cellsize),n.fftCell=new i.SignalArray(n.fft.length),n.prevCell=new i.SignalArray(n.cellsize),n.freqs=new i.SignalArray(n.fft.length>>1),n.plotFlush=!0,n.plotRange=[0,32],n.plotBarStyle=!0}var i=t.fn,s=t.modules.FFT;i.extend(e);var n=e.prototype;Object.defineProperties(n,{window:{set:function(t){this._.fft.setWindow(t)},get:function(){return this._.fft.windowName}},spectrum:{get:function(){return this._.fft.getFrequencyData(this._.freqs)}}}),n.process=function(t){var e=this._;
if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this),i.outputSignalAR(this);var s=this.cells[0],n=e.cellsize;e.fftCell.set(e.prevCell),e.fftCell.set(s,n),e.fft.forward(e.fftCell),e.prevCell.set(s),e.plotFlush=!0,this.cells[3].set(e.fft.real.subarray(0,n)),this.cells[4].set(e.fft.imag.subarray(0,n))}return this};var r=t.Object.prototype.plot;n.plot=function(t){return this._.plotFlush&&(this._.plotData=this.spectrum,this._.plotFlush=null),r.call(this,t)},i.register("fft",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.fixAR(this);var s=this._;s.freq=t(440),s.reg=32768,s.shortFlag=!1,s.phase=0,s.lastValue=0}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{shortFlag:{set:function(t){this._.shortFlag=!!t},get:function(){return this._.shortFlag}},freq:{set:function(e){this._.freq=t(e)},get:function(){return this._.freq}}}),s.process=function(t){var e=this._,i=this.cells[0];if(this.tickID!==t){this.tickID=t;var s,n,r=e.lastValue,a=e.phase,o=e.freq.process(t).cells[0][0]/e.samplerate,h=e.reg,u=e.mul,l=e.add;if(e.shortFlag)for(s=0,n=i.length;n>s;++s)a>=1&&(h>>=1,h|=(1&(h^h>>6))<<15,r=(1&h)-.5,a-=1),i[s]=r*u+l,a+=o;else for(s=0,n=i.length;n>s;++s)a>=1&&(h>>=1,h|=(1&(h^h>>1))<<15,r=(1&h)-.5,a-=1),i[s]=r*u+l,a+=o;e.reg=h,e.phase=a,e.lastValue=r}return this},i.register("fnoise",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this),this._.selected=0,this._.outputs=[]}var i=t.fn,s=function(){function e(e){t.Object.call(this,2,[]),i.fixAR(this),this._.parent=e}return i.extend(e),e.prototype.process=function(t){return this.tickID!==t&&(this.tickID=t,this._.parent.process(t)),this},e}();i.extend(e);var n=e.prototype;Object.defineProperties(n,{selected:{set:function(t){var e=this._;if("number"==typeof t){e.selected=t;for(var s=e.outputs,n=0,r=s.length;r>n;++n)s[n]&&(s[n].cells[0].set(i.emptycell),s[n].cells[1].set(i.emptycell),s[n].cells[2].set(i.emptycell))}},get:function(){return this._.selected}}}),n.at=function(t){var e=this._,i=e.outputs[t];return i||(e.outputs[t]=i=new s(this)),i},n.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this),i.outputSignalAR(this);var s=e.outputs[e.selected];s&&(s.cells[0].set(this.cells[0]),s.cells[1].set(this.cells[1]),s.cells[2].set(this.cells[2]))}return this},i.register("gate",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.fixAR(this);var n=this._;n.fft=new s(2*n.cellsize),n.fftCell=new i.SignalArray(this._.fft.length),n.realBuffer=new i.SignalArray(this._.fft.length),n.imagBuffer=new i.SignalArray(this._.fft.length)}var i=t.fn,s=t.modules.FFT;i.extend(e);var n=e.prototype;Object.defineProperties(n,{real:{set:function(e){this._.real=t(e)},get:function(){return this._.real}},imag:{set:function(e){this._.imag=t(e)},get:function(){return this._.imag}}}),n.process=function(t){var e=this._;if(this.tickID!==t&&(this.tickID=t,e.real&&e.imag)){var s=this.cells[0],n=e.realBuffer,r=e.imagBuffer,a=e.real.process(t).cells[0],o=e.imag.process(t).cells[0];n.set(a),r.set(o),s.set(e.fft.inverse(n,r).subarray(0,e.cellsize)),i.outputSignalAR(this)}return this},i.register("ifft",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.timer(this),i.fixKR(this);var s=this._;s.interval=t(1e3),s.count=0,s.delay=0,s.timeout=1/0,s.currentTime=0,s.delaySamples=0,s.countSamples=0,s.onended=i.make_onended(this),this.on("start",n)}var i=t.fn,s=t.timevalue;i.extend(e);var n=function(){var t=this._;this.playbackState=i.PLAYING_STATE,t.delaySamples=0|t.samplerate*.001*t.delay,t.countSamples=t.count=t.currentTime=0};Object.defineProperty(n,"unremovable",{value:!0,writable:!1});var r=e.prototype;Object.defineProperties(r,{interval:{set:function(e){"string"==typeof e&&(e=s(e),0>=e&&(e=0)),this._.interval=t(e)},get:function(){return this._.interval}},delay:{set:function(t){"string"==typeof t&&(t=s(t)),"number"==typeof t&&t>=0&&(this._.delay=t,this._.delaySamples=0|this._.samplerate*.001*t)},get:function(){return this._.delay}},count:{set:function(t){"number"==typeof t&&(this._.count=t)},get:function(){return this._.count}},timeout:{set:function(t){"string"==typeof t&&(t=s(t)),"number"==typeof t&&t>=0&&(this._.timeout=t)},get:function(){return this._.timeout}},currentTime:{get:function(){return this._.currentTime}}}),r.bang=function(){var t=this._;return this.playbackState=i.PLAYING_STATE,t.delaySamples=0|t.samplerate*.001*t.delay,t.countSamples=t.count=t.currentTime=0,t.emit("bang"),this},r.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){this.tickID=t,s.delaySamples>0&&(s.delaySamples-=e.length);var n=s.interval.process(t).cells[0][0];if(0>=s.delaySamples&&(s.countSamples-=e.length,0>=s.countSamples)){s.countSamples+=0|.001*s.samplerate*n;for(var r=this.nodes,a=s.count,o=a*s.mul+s.add,h=0,u=e.length;u>h;++h)e[h]=o;for(var l=0,c=r.length;c>l;++l)r[l].bang(a);s.count+=1}s.currentTime+=i.currentTimeIncr,s.currentTime>=s.timeout&&i.nextTick(s.onended)}return this},i.register("interval",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.fixAR(this);var s=this._,n=Math.ceil(Math.log(s.samplerate)*Math.LOG2E);s.buffersize=1<<n,s.buffermask=s.buffersize-1,s.buffer=new i.SignalArray(s.buffersize),s.time=0,s.readIndex=0,s.writeIndex=0}var i=t.fn,s=t.timevalue;i.extend(e);var n=e.prototype;Object.defineProperties(n,{time:{set:function(t){if("string"==typeof t&&(t=s(t)),"number"==typeof t&&t>0){var e=this._;e.time=t;var i=0|.001*t*e.samplerate;i>e.buffermask&&(i=e.buffermask),e.writeIndex=e.readIndex+i&e.buffermask}},get:function(){return this._.time}}}),n.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this);var s,n=this.cells[0],r=e.buffer,a=e.buffermask,o=e.readIndex,h=e.writeIndex,u=n.length;for(s=0;u>s;++s)r[h]=n[s],n[s]=r[o],o+=1,h=h+1&a;e.readIndex=o&a,e.writeIndex=h,i.outputSignalAR(this)}return this},i.register("lag",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e);var i=this._;i.input=0,i.value=0,i.prev=null,i.ar=!1,i.map=s}var i=t.fn;i.extend(e);var s=function(t){return t},n=e.prototype;Object.defineProperties(n,{input:{set:function(t){"number"==typeof t&&(this._.input=t)},get:function(){return this._.input}},map:{set:function(t){"function"==typeof t&&(this._.map=t)},get:function(){return this._.map}}}),n.bang=function(){return this._.prev=null,this._.emit("bang"),this},n.at=function(t){return this._.map?this._.map(t):0},n.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){this.tickID=t;var n,r=this.nodes.length,a=e.length;if(s.ar&&r){i.inputSignalAR(this);var o=s.map;if(o)for(n=0;a>n;++n)e[n]=o(e[n]);s.value=e[a-1],i.outputSignalAR(this)}else{var h=r?i.inputSignalKR(this):s.input;s.map&&s.prev!==h&&(s.prev=h,s.value=s.map(h));var u=s.value*s.mul+s.add;for(n=0;a>n;++n)e[n]=u}}return this},i.register("map",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e)}var i=t.fn;i.extend(e);var s=e.prototype;s.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){this.tickID=t;var n,r,a,o,h=this.nodes,u=h.length,l=e.length;if(s.ar){if(h.length>0)for(a=h[0].process(t).cells[0],e.set(a),n=1;u>n;++n)for(a=h[n].process(t).cells[0],r=0;l>r;++r)o=a[r],o>e[r]&&(e[r]=o);else for(r=0;l>r;++r)e[r]=0;i.outputSignalAR(this)}else{if(h.length>0)for(a=h[0].process(t).cells[0][0],n=1;u>n;++n)o=h[n].process(t).cells[0][0],o>a&&(a=o);else a=0;e[0]=a,i.outputSignalKR(this)}}return this},i.register("max",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var n=this._;n.src=n.func=null,n.bufferL=new i.SignalArray(s),n.bufferR=new i.SignalArray(s),n.readIndex=0,n.writeIndex=0,n.totalRead=0,n.totalWrite=0}if("browser"===t.envtype){var i=t.fn,s=4096,n=s-1;i.extend(e);var r=e.prototype;r.listen=function(e){var i=a[t.env];i&&(i.set.call(this,e),i.listen.call(this))},r.unlisten=function(){var e=a[t.env];e&&e.unlisten.call(this),this.cells[0].set(i.emptycell),this.cells[1].set(i.emptycell),this.cells[2].set(i.emptycell);for(var s=this._,n=s.bufferL,r=s.bufferR,o=0,h=n.length;h>o;++o)n[o]=r[o]=0},r.process=function(t){var e=this._;if(null===e.src)return this;if(this.tickID!==t){this.tickID=t;var s=e.cellsize;if(e.totalWrite>e.totalRead+s){var r=e.readIndex,a=r+s;this.cells[1].set(e.bufferL.subarray(r,a)),this.cells[2].set(e.bufferR.subarray(r,a)),e.readIndex=a&n,e.totalRead+=s}i.outputSignalAR(this)}return this};var a={};a.webkit={set:function(t){var e=this._;if(t instanceof HTMLMediaElement){var s=i._audioContext;e.src=s.createMediaElementSource(t)}},listen:function(){var t=this._,e=i._audioContext;t.gain=e.createGainNode(),t.gain.gain.value=0,t.node=e.createJavaScriptNode(1024,2,2),t.node.onaudioprocess=o(this),t.src.connect(t.node),t.node.connect(t.gain),t.gain.connect(e.destination)},unlisten:function(){var t=this._;t.src&&t.src.disconnect(),t.gain&&t.gain.disconnect(),t.node&&t.node.disconnect()}};var o=function(t){return function(e){var i=t._,s=e.inputBuffer,r=s.length,a=i.writeIndex;i.bufferL.set(s.getChannelData(0),a),i.bufferR.set(s.getChannelData(1),a),i.writeIndex=a+r&n,i.totalWrite+=r}};a.moz={set:function(t){var e=this._;t instanceof HTMLAudioElement&&(e.src=t,e.istep=e.samplerate/t.mozSampleRate)},listen:function(){var t=this._,e=t.bufferL,i=t.bufferR,s=0,r=0;2===t.src.mozChannels?(t.x=0,t.func=function(a){var o,h,u=t.writeIndex,l=t.totalWrite,c=a.frameBuffer,f=t.istep,p=c.length;for(o=t.x,h=0;p>h;h+=2){for(o+=f;o>0;)e[u]=.5*(c[h]+s),i[u]=.5*(c[h+1]+r),u=u+1&n,++l,o-=1;s=c[h],r=c[h+1]}t.x=o,t.writeIndex=u,t.totalWrite=l}):(t.x=0,t.func=function(r){var a,o,h=t.writeIndex,u=t.totalWrite,l=r.frameBuffer,c=t.istep,f=l.length;for(a=t.x,o=0;f>o;++o){for(a+=c;a>=0;)e[h]=i[h]=.5*(l[o]+s),h=h+1&n,++u,a-=1;s=l[o]}t.x=a,t.writeIndex=h,t.totalWrite=u}),t.src.addEventListener("MozAudioAvailable",t.func)},unlisten:function(){var t=this._;t.func&&(t.src.removeEventListener("MozAudioAvailable",t.func),t.func=null)}},i.register("mediastream",e)}}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e);var i=this._;i.midi=0,i.value=0,i.prev=null,i.a4=440,i.ar=!1}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{midi:{set:function(t){"number"==typeof t&&(this._.midi=t)},get:function(){return this._.midi}},a4:{set:function(t){"number"==typeof t&&(this._.a4=t,this._.prev=null)},get:function(){return this._.a4}}}),s.bang=function(){return this._.prev=null,this._.emit("bang"),this},s.at=function(t){var e=this._;return e.a4*Math.pow(2,(t-69)/12)},s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n=this.cells[0],r=this.nodes.length,a=n.length;if(e.ar&&r){i.inputSignalAR(this);var o=e.a4;for(s=0;a>s;++s)n[s]=o*Math.pow(2,(n[s]-69)/12);e.value=n[a-1],i.outputSignalAR(this)}else{var h=r?i.inputSignalKR(this):e.midi;e.prev!==h&&(e.prev=h,e.value=e.a4*Math.pow(2,(h-69)/12)),n[0]=e.value,i.outputSignalKR(this)}}return this},i.register("midicps",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e);var i=this._;i.midi=0,i.value=0,i.prev=null,i.range=12,i.ar=!1}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{midi:{set:function(t){"number"==typeof t&&(this._.midi=t)},get:function(){return this._.midi}},range:{set:function(t){"number"==typeof t&&t>0&&(this._.range=t)},get:function(){return this._.range}}}),s.bang=function(){return this._.prev=null,this._.emit("bang"),this},s.at=function(t){var e=this._;return Math.pow(2,t/e.range)},s.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){this.tickID=t;var n,r=this.nodes.length,a=e.length;if(s.ar&&r){i.inputSignalAR(this);var o=s.range;for(n=0;a>n;++n)e[n]=Math.pow(2,e[n]/o);s.value=e[a-1],i.outputSignalAR(this)}else{var h=this.nodes.length?i.inputSignalKR(this):s.midi;s.prev!==h&&(s.prev=h,s.value=Math.pow(2,h/s.range));var u=s.value*s.mul+s.add;for(n=0;a>n;++n)e[n]=u}}return this},i.register("midiratio",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e)}var i=t.fn;i.extend(e);var s=e.prototype;s.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){this.tickID=t;var n,r,a,o,h=this.nodes,u=h.length,l=e.length;if(s.ar){if(h.length>0)for(a=h[0].process(t).cells[0],e.set(a),n=1;u>n;++n)for(a=h[n].process(t).cells[0],r=0;l>r;++r)o=a[r],e[r]>o&&(e[r]=o);else for(r=0;l>r;++r)e[r]=0;i.outputSignalAR(this)}else{if(h.length>0)for(a=h[0].process(t).cells[0][0],n=1;u>n;++n)o=h[n].process(t).cells[0][0],a>o&&(a=o);else a=0;e[0]=a,i.outputSignalKR(this)}}return this},i.register("min",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,0,e),i.timer(this),i.fixKR(this);var n=this._;n.tracks=[],n.onended=i.make_onended(this),n.currentTime=0,this.on("start",s)}var i=t.fn;i.extend(e);var s=function(){var t=this,e=this._,s=e.mml;"string"==typeof s&&(s=[s]),e.tracks=s.map(function(e,i){return new r(t,i,e)}),e.currentTime=0,this.playbackState=i.PLAYING_STATE};Object.defineProperty(s,"unremoved",{value:!0,writable:!1});var n=e.prototype;Object.defineProperties(n,{mml:{set:function(t){var e=this._;("string"==typeof t||Array.isArray(t))&&(e.mml=t)},get:function(){return this._.mml}},currentTime:{get:function(){return this._.currentTime}}}),n.on=n.addListener=function(t,e){return"mml"===t&&(t="data",console.warn("A 'mml' event listener was deprecated in ~v13.03.01. use 'data' event listener.")),this._.events.on(t,e),this},n.once=function(t,e){return"mml"===t&&(t="data",console.warn("A 'mml' event listener was deprecated in ~v13.03.01. use 'data' event listener.")),this._.events.once(t,e),this},n.off=n.removeListener=function(t,e){return"mml"===t&&(t="data",console.warn("A 'mml' event listener was deprecated in ~v13.03.01. use 'data' event listener.")),this._.events.off(t,e),this},n.removeAllListeners=function(t){return"mml"===t&&(console.warn("A 'mml' event listener was deprecated in ~v13.03.01. use 'data' event listener."),t="data"),this._.events.removeAllListeners(t),this},n.listeners=function(t){return"mml"===t&&(console.warn("A 'mml' event listener was deprecated in ~v13.03.01. use 'data' event listener."),t="data"),this._.events.listeners(t)},n.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n,r=e.tracks;for(s=0,n=r.length;n>s;++s)r[s].process();for(;s--;)r[s].ended&&r.splice(s,1);0===r.length&&i.nextTick(e.onended),e.currentTime+=i.currentTimeIncr}return this},i.register("mml",e);var r=function(){function t(t,e,i){var s=this._={};s.sequencer=t,s.trackNum=e,s.commands=l(i),s.status={t:120,l:4,o:4,v:12,q:6,dot:0,tie:!1},s.index=0,s.queue=[],s.currentTime=0,s.queueTime=0,s.segnoIndex=-1,s.loopStack=[],s.prevNote=0,s.remain=1/0,this.ended=!1,u(this)}var e=0,s=1,n=2,r=3;t.prototype.process=function(){var t=this._,l=t.sequencer,c=t.trackNum,f=t.queue,p=!1;if(f.length)for(;f[0][0]<=t.currentTime;){var d=t.queue.shift();switch(d[1]){case s:a(l,c,d[2],d[3]),t.remain=d[4],u(this);break;case n:o(l,c,d[2],d[3]);break;case r:h(l,d[2]);break;case e:p=!0}if(0===f.length)break}t.remain-=i.currentTimeIncr,p&&(this.ended=!0),t.currentTime+=i.currentTimeIncr};var a=function(t,e,i,s){var n,r,a,o=t.nodes;for(r=0,a=o.length;a>r;++r)n=o[r],n.noteOn?n.noteOn(i,s):n.bang();t._.emit("data","noteOn",{trackNum:e,noteNum:i,velocity:s})},o=function(t,e,i,s){var n,r,a,o=t.nodes;for(r=0,a=o.length;a>r;++r)n=o[r],n.noteOff?n.noteOff(i,s):n.release&&n.release();t._.emit("data","noteOff",{trackNum:e,noteNum:i,velocity:s})},h=function(t,e){t._.emit("data","command",{command:e})},u=function(t){var i=t._;i.sequencer;var a,o,h,u,l,c,f,p,d,m,v,g,b,_=i.commands,y=i.queue,w=i.index,x=i.status,k=i.queueTime,A=i.loopStack;d=[];t:for(;;){if(w>=_.length){if(!(i.segnoIndex>=0))break;w=i.segnoIndex}switch(a=_[w++],a.name){case"@":y.push([k,r,a.val]);break;case"n":if(o=x.t||120,null!==a.len?(u=a.len,l=a.dot||0):(u=x.l,l=a.dot||x.dot),f=1e3*60/o*(4/u),f*=[1,1.5,1.75,1.875][l]||1,c=x.v<<3,x.tie){for(g=y.length;g--;)if(y[g][2]){y.splice(g,1);break}h=i.prevNote}else h=i.prevNote=a.val+12*(x.o+1),y.push([k,s,h,c,f]);if(u>0){if(p=x.q/8,1>p)for(m=k+f*p,y.push([m,n,h,c]),g=0,b=d.length;b>g;++g)y.push([m,n,d[g],c]);if(d=[],k+=f,!x.tie)break t}else d.push(h);x.tie=!1;break;case"r":o=x.t||120,null!==a.len?(u=a.len,l=a.dot||0):(u=x.l,l=a.dot||x.dot),u>0&&(f=1e3*60/o*(4/u),f*=[1,1.5,1.75,1.875][l]||1,k+=f);break;case"l":x.l=a.val,x.dot=a.dot;break;case"o":x.o=a.val;break;case"<":9>x.o&&(x.o+=1);break;case">":x.o>0&&(x.o-=1);break;case"v":x.v=a.val;break;case"(":15>x.v&&(x.v+=1);break;case")":x.v>0&&(x.v-=1);break;case"q":x.q=a.val;break;case"&":x.tie=!0;break;case"$":i.segnoIndex=w;break;case"[":A.push([w,null,null]);break;case"|":v=A[A.length-1],v&&1===v[1]&&(A.pop(),w=v[2]);break;case"]":v=A[A.length-1],v&&(null===v[1]&&(v[1]=a.count,v[2]=w),v[1]-=1,0===v[1]?A.pop():w=v[0]);break;case"t":x.t=null===a.val?120:a.val;break;case"EOF":y.push([k,e])}}i.index=w,i.queueTime=k},l=function(t){var e,i,s,n,r,a,o,h,u=Array(t.length),l=[];for(r=0,a=c.length;a>r;++r)for(e=c[r],i=e.re;s=i.exec(t);){if(!u[s.index]){for(o=0,h=s[0].length;h>o;++o)u[s.index+o]=!0;n=e.func?e.func(s):{name:s[0]},n&&(n.index=s.index,n.origin=s[0],l.push(n))}for(;i.lastIndex<t.length&&u[i.lastIndex];)++i.lastIndex}return l.sort(function(t,e){return t.index-e.index}),l.push({name:"EOF"}),l},c=[{re:/@(\d*)/g,func:function(t){return{name:"@",val:t[1]||null}}},{re:/([cdefgab])([\-+]?)(\d*)(\.*)/g,func:function(t){return{name:"n",val:{c:0,d:2,e:4,f:5,g:7,a:9,b:11}[t[1]]+({"-":-1,"+":1}[t[2]]||0),len:""===t[3]?null:Math.min(0|t[3],64),dot:t[4].length}}},{re:/r(\d*)(\.*)/g,func:function(t){return{name:"r",len:""===t[1]?null:Math.max(1,Math.min(0|t[1],64)),dot:t[2].length}}},{re:/&/g},{re:/l(\d*)(\.*)/g,func:function(t){return{name:"l",val:""===t[1]?4:Math.min(0|t[1],64),dot:t[2].length}}},{re:/o([0-9])/g,func:function(t){return{name:"o",val:""===t[1]?4:0|t[1]}}},{re:/[<>]/g},{re:/v(\d*)/g,func:function(t){return{name:"v",val:""===t[1]?12:Math.min(0|t[1],15)}}},{re:/[()]/g},{re:/q([0-8])/g,func:function(t){return{name:"q",val:""===t[1]?6:Math.min(0|t[1],8)}}},{re:/\[/g},{re:/\|/g},{re:/\](\d*)/g,func:function(t){return{name:"]",count:0|t[1]||2}}},{re:/t(\d*)/g,func:function(t){return{name:"t",val:""===t[1]?null:Math.max(5,Math.min(0|t[1],300))}}},{re:/\$/g}];return t}()}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e)}var i=t.fn;i.extend(e),e.prototype.process=function(t){var e=this._;return this.tickID!==t&&(this.tickID=t,e.ar?(i.inputSignalAR(this),i.outputSignalAR(this)):(this.cells[0][0]=i.inputSignalKR(this),i.outputSignalKR(this))),this},i.register("mono",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e)}var i=t.fn;i.extend(e);var s=e.prototype;s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n,r,a,o,h=this.nodes,u=this.cells[0],l=this.cells[1],c=this.cells[2],f=h.length,p=u.length;if(e.ar){if(h.length>0)for(h[0].process(t),a=h[0].cells[1],o=h[0].cells[2],l.set(a),c.set(o),s=1;f>s;++s)for(h[s].process(t),a=h[s].cells[1],o=h[s].cells[2],n=0;p>n;++n)l[n]*=a[n],c[n]*=o[n];else for(n=0;p>n;++n)l[n]=c[n]=0;i.outputSignalAR(this)}else{if(h.length>0)for(r=h[0].process(t).cells[0][0],s=1;f>s;++s)r*=h[s].process(t).cells[0][0];else r=0;u[0]=r,i.outputSignalKR(this)}}return this},i.register("*",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e);var i=this._;i.defaultValue=0,i.index=0,i.dict={},i.ar=!1}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{dict:{set:function(t){if("object"==typeof t)this._.dict=t;else if("function"==typeof t){for(var e={},i=0;128>i;++i)e[i]=t(i);this._.dict=e}},get:function(){return this._.dict}},defaultValue:{set:function(t){"number"==typeof t&&(this._.defaultValue=t)},get:function(){return this._.defaultValue}},index:{set:function(t){"number"==typeof t&&(this._.index=t)},get:function(){return this._.index}}}),s.at=function(t){var e=this._;return(e.dict[0|t]||e.defaultValue)*e.mul+e.add},s.clear=function(){return this._.dict={},this},s.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){this.tickID=t;var n,r,a,o=this.nodes.length,h=s.dict,u=s.defaultValue,l=s.mul,c=s.add,f=e.length;if(s.ar&&o){for(i.inputSignalAR(this),a=0;f>a;++a)n=e[a],n=0>n?0|n-.5:0|n+.5,e[a]=(h[n]||u)*l+c;i.outputSignalAR(this)}else for(n=this.nodes.length?i.inputSignalKR(this):s.index,n=0>n?0|n-.5:0|n+.5,r=(h[n]||u)*l+c,a=0;f>a;++a)e[a]=r}return this},i.register("ndict",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e)}var i=t.fn;i.extend(e);var s=e.prototype;s.process=function(t){var e=this.cells[0],i=this._;if(this.tickID!==t){this.tickID=t;var s,n,r,a=i.mul,o=i.add;if(i.ar)for(s=0,n=e.length;n>s;++s)e[s]=(2*Math.random()-1)*a+o;else for(r=(2*Math.random()+1)*a+o,s=0,n=e.length;n>s;++s)e[s]=r}return this},i.register("noise",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e);var s=this._;s.freq=t(440),s.phase=t(0),s.osc=new n(s.samplerate),s.tmp=new i.SignalArray(s.cellsize),s.osc.step=s.cellsize,this.once("init",r)}var i=t.fn,s=t.timevalue,n=t.modules.Oscillator;i.extend(e);var r=function(){var t=this._;this.wave||(this.wave="sin"),t.plotData=t.osc.wave,t.plotLineWidth=2,t.plotCyclic=!0,t.plotBefore=o},a=e.prototype;Object.defineProperties(a,{wave:{set:function(t){this._.osc.setWave(t)},get:function(){return this._.osc.wave}},freq:{set:function(e){"string"==typeof e&&(e=s(e),e=0>=e?0:1e3/e),this._.freq=t(e)},get:function(){return this._.freq}},phase:{set:function(e){this._.phase=t(e),this._.osc.feedback=!1},get:function(){return this._.phase}},fb:{set:function(e){this._.phase=t(e),this._.osc.feedback=!0},get:function(){return this._.phase}}}),a.clone=function(){var t=i.clone(this);return t._.osc=this._.osc.clone(),t._.freq=this._.freq,t._.phase=this._.phase,t},a.bang=function(){return this._.osc.reset(),this._.emit("bang"),this},a.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n=this.cells[1],r=this.cells[2],a=e.cellsize;if(this.nodes.length)i.inputSignalAR(this);else for(s=0;a>s;++s)n[s]=r[s]=1;var o=e.osc,h=e.freq.process(t).cells[0],u=e.phase.process(t).cells[0];if(o.frequency=h[0],o.phase=u[0],e.ar){var l=e.tmp;for(e.freq.isAr?e.phase.isAr?o.processWithFreqAndPhaseArray(l,h,u):o.processWithFreqArray(l,h):e.phase.isAr?o.processWithPhaseArray(l,u):o.process(l),s=0;a>s;++s)n[s]*=l[s],r[s]*=l[s]}else{var c=o.next();for(s=0;a>s;++s)n[s]*=c,r[s]*=c}i.outputSignalAR(this)}return this};var o;"browser"===t.envtype&&(o=function(t,e,i,s,n){var r=(n>>1)+.5;t.strokeStyle="#ccc",t.lineWidth=1,t.beginPath(),t.moveTo(e,r+i),t.lineTo(e+s,r+i),t.stroke()}),i.register("osc",e),i.register("sin",function(t){return new e(t).set("wave","sin")}),i.register("cos",function(t){return new e(t).set("wave","cos")}),i.register("pulse",function(t){return new e(t).set("wave","pulse")}),i.register("tri",function(t){return new e(t).set("wave","tri")}),i.register("saw",function(t){return new e(t).set("wave","saw")}),i.register("fami",function(t){return new e(t).set("wave","fami")}),i.register("konami",function(t){return new e(t).set("wave","konami")}),i.register("+sin",function(t){return new e(t).set("wave","+sin").kr()}),i.register("+pulse",function(t){return new e(t).set("wave","+pulse").kr()}),i.register("+tri",function(t){return new e(t).set("wave","+tri").kr()}),i.register("+saw",function(t){return new e(t).set("wave","+saw").kr()}),i.alias("square","pulse")}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.pos=t(0),s.panL=.5,s.panR=.5}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{pos:{set:function(e){this._.pos=t(e)},get:function(){return this._.pos}}}),s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s=e.pos.process(t).cells[0][0];e.prevPos!==s&&(e.panL=1-s,e.panR=e.prevPos=s);var n,r,a,o=this.nodes,h=this.cells[1],u=this.cells[2],l=o.length,c=h.length;if(l){for(a=o[0].process(t).cells[0],r=0;c>r;++r)h[r]=u[r]=a[r];for(n=1;l>n;++n)for(a=o[n].process(t).cells[0],r=0;c>r;++r)h[r]=u[r]+=a[r];var f=e.panL,p=e.panR;for(r=0;c>r;++r)h[r]=h[r]*f,u[r]=u[r]*p}else h.set(i.emptycell),u.set(i.emptycell);i.outputSignalAR(this)}return this},i.register("pan",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e);var i=this._;i.value=0,i.env=new r(i.samplerate),i.env.step=i.cellsize,i.curve="lin",i.counter=0,i.ar=!1,i.onended=a(this),this.on("ar",o)}var i=t.fn,s=t.timevalue,n=t.modules.Envelope,r=t.modules.EnvelopeValue;i.extend(e);var a=function(t,e){return function(){if("number"==typeof e)for(var i=t.cells[0],s=t.cells[1],n=t.cells[2],r=t._.env.value,a=0,o=s.length;o>a;++a)i[0]=s[a]=n[a]=r;t._.emit("ended")}},o=function(t){this._.env.step=t?1:this._.cellsize},h=e.prototype;Object.defineProperties(h,{value:{set:function(t){"number"==typeof t&&(this._.env.value=t)},get:function(){return this._.env.value}}}),h.to=function(t,e,i){var r=this._,a=r.env;if("string"==typeof e?e=s(e):e===void 0&&(e=0),i===void 0)r.counter=a.setNext(t,e,n.CurveTypeLin),r.curve="lin";else{var o=n.CurveTypeDict[i];r.counter=o===void 0?a.setNext(t,e,n.CurveTypeCurve,i):a.setNext(t,e,o),r.curve=i}return r.plotFlush=!0,this},h.setAt=function(t,e){var i=this._;return this.to(i.env.value,e,"set"),i.atValue=t,this},h.linTo=function(t,e){return this.to(t,e,"lin")},h.expTo=function(t,e){return this.to(t,e,"exp")},h.sinTo=function(t,e){return this.to(t,e,"sin")},h.welTo=function(t,e){return this.to(t,e,"wel")},h.sqrTo=function(t,e){return this.to(t,e,"sqr")},h.cubTo=function(t,e){return this.to(t,e,"cub")},h.cancel=function(){var t=this._;return t.counter=t.env.setNext(t.env.value,0,n.CurveTypeSet),this},h.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,r,a=this.cells[1],o=this.cells[2],h=e.cellsize,u=e.env,l=e.counter;if(this.nodes.length)i.inputSignalAR(this);else for(s=0;h>s;++s)a[s]=o[s]=1;if(0>=l&&("set"===e.curve?u.setNext(e.atValue,0,n.CurveTypeSet):u.setNext(u.value,0,n.CurveTypeSet),i.nextTick(e.onended),e.counter=1/0),e.ar){for(s=0;h>s;++s)r=u.next(),a[s]*=r,o[s]*=r;e.counter-=e.cellsize}else{for(r=u.next(),s=0;h>s;++s)a[s]*=r,o[s]*=r;e.counter-=1}i.outputSignalAR(this),e.value=r}return this};var u=t.Object.prototype.plot;h.plot=function(t){var e=this._;if(e.plotFlush){var i,s,a,o=new r(128),h=new Float32Array(128);if("set"===e.curve)for(s=100,a=h.length;a>s;++s)h[s]=1;else for(i=n.CurveTypeDict[e.curve],i===void 0?o.setNext(1,1e3,n.CurveTypeCurve,e.curve):o.setNext(1,1e3,i),s=0,a=h.length;a>s;++s)h[s]=o.next();e.plotData=h,e.plotRange=[0,1],e.plotFlush=null}return u.call(this,t)},i.register("param",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.freq=t("sin",{freq:1,add:1e3,mul:250}).kr(),s.Q=t(1),s.allpass=[],this.steps=2}var i=t.fn,s=t.modules.Biquad;i.extend(e);var n=e.prototype;Object.defineProperties(n,{freq:{set:function(t){this._.freq=t},get:function(){return this._.freq}},Q:{set:function(e){this._.Q=t(e)},get:function(){return this._.Q}},steps:{set:function(t){if("number"==typeof t){if(t|=0,2===t||4===t||8===t||12===t){var e=this._.allpass;if(t>e.length)for(var i=e.length;t>i;++i)e[i]=new s(this._.samplerate),e[i].setType("allpass")}this._.steps=t}},get:function(){return this._.steps}}}),n.process=function(t){var e=this._;if(this.tickID!==t){if(this.tickID=t,i.inputSignalAR(this),!e.bypassed){var s,n=this.cells[1],r=this.cells[2],a=e.freq.process(t).cells[0][0],o=e.Q.process(t).cells[0][0],h=e.steps;for(s=0;h>s;s+=2)e.allpass[s].setParams(a,o,0),e.allpass[s].process(n,r),e.allpass[s+1].setParams(a,o,0),e.allpass[s+1].process(n,r)}i.outputSignalAR(this)}return this},i.register("phaser",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),s.fixAR(this);for(var i=new Uint8Array(5),n=0;5>n;++n)i[n]=(0|Math.random()*(1<<30))%25;this._.whites=i,this._.key=0}var i=31,s=t.fn;s.extend(e);var n=e.prototype;n.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){this.tickID=t;var n,r,a,o,h,u,l=s.key,c=s.whites,f=s.mul,p=s.add;for(n=0,r=e.length;r>n;++n){for(o=l++,l>i&&(l=0),u=o^l,a=h=0;5>a;++a)u&1<<a&&(c[a]=(0|Math.random()*(1<<30))%25),h+=c[a];e[n]=(.01666666*h-1)*f+p}s.key=l}return this},s.register("pink",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),this._.freq=440,this._.buffer=null,this._.index=0}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{freq:{set:function(t){"number"==typeof t&&(0>t&&(t=0),this._.freq=t)},get:function(){return this._.freq}}}),s.bang=function(){for(var t=this._,e=t.freq,s=0|t.samplerate/e+.5,n=t.buffer=new i.SignalArray(s),r=0;s>r;++r)n[r]=2*Math.random()-1;return t.index=0,t.emit("bang"),this},s.process=function(t){var e=this.cells[0],i=this._;if(this.tickID!==t){this.tickID=t;var s=i.buffer;if(s){var n,r,a,o=s.length,h=i.index,u=i.mul,l=i.add,c=e.length;for(a=0;c>a;++a)n=h,r=s[h++],h>=o&&(h=0),r=.5*(r+s[h]),s[n]=r,e[a]=r*u+l;i.index=h}}return this},i.register("pluck",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.listener(this),i.fixAR(this);var s=this._;s.timeout=5e3,s.status=n,s.writeIndex=0,s.writeIndexIncr=1,s.currentTime=0,s.currentTimeIncr=1e3/s.samplerate,s.onended=a(this)}var i=t.fn,s=t.timevalue,n=0,r=1;i.extend(e);var a=function(t){return function(){var e=t._,s=new i.SignalArray(e.buffer.subarray(0,0|e.writeIndex));e.status=n,e.writeIndex=0,e.currentTime=0,e.emit("ended",{buffer:s,samplerate:e.samplerate})}},o=e.prototype;Object.defineProperties(o,{timeout:{set:function(t){"string"==typeof t&&(t=s(t)),"number"==typeof t&&t>0&&(this._.timeout=t)},get:function(){return this._.timeout}},samplerate:{set:function(t){"number"==typeof t&&t>0&&this._.samplerate>=t&&(this._.samplerate=t)},get:function(){return this._.samplerate}},currentTime:{get:function(){return this._.currentTime}}}),o.start=function(){var e,s=this._;return s.status===n&&(e=0|.01*s.timeout*s.samplerate,(!s.buffer||e>s.buffer.length)&&(s.buffer=new i.SignalArray(e)),s.writeIndex=0,s.writeIndexIncr=s.samplerate/t.samplerate,s.currentTime=0,s.status=r,s.emit("start"),this.listen()),this},o.stop=function(){var t=this._;return t.status===r&&(t.status=n,t.emit("stop"),i.nextTick(t.onended),this.unlisten()),this},o.bang=function(){return this._.status===n?this.srart():this._.status===r&&this.stop(),this._.emit("bang"),this},o.process=function(t){var e=this._,s=this.cells[0];if(this.tickID!==t){if(this.tickID=t,i.inputSignalAR(this),e.status===r){var n,a=s.length,o=e.buffer,h=e.timeout,u=e.writeIndex,l=e.writeIndexIncr,c=e.currentTime,f=e.currentTimeIncr;for(n=0;a>n;++n)o[0|u]=s[n],u+=l,c+=f,c>=h&&i.nextTick(e.onended);e.writeIndex=u,e.currentTime=c}i.outputSignalAR(this)}return this},i.register("record",e),i.alias("rec","record")}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this),this._.reverb=new s(this._.samplerate,this._.cellsize)}var i=t.fn,s=t.modules.Reverb;i.extend(e);var n=e.prototype;Object.defineProperties(n,{room:{set:function(t){"number"==typeof t&&(t=t>1?1:0>t?0:t,this._.reverb.setRoomSize(t))},get:function(){return this._.reverb.roomsize}},damp:{set:function(t){"number"==typeof t&&(t=t>1?1:0>t?0:t,this._.reverb.setDamp(t))},get:function(){return this._.reverb.damp}},mix:{set:function(t){"number"==typeof t&&(t=t>1?1:0>t?0:t,this._.reverb.wet=t)},get:function(){return this._.reverb.wet}}}),n.process=function(t){var e=this._;return this.tickID!==t&&(this.tickID=t,i.inputSignalAR(this),e.bypassed||e.reverb.process(this.cells[1],this.cells[2]),i.outputSignalAR(this)),this},i.register("reverb",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,0,e),i.timer(this),i.fixKR(this);var s=this._;s.queue=[],s.currentTime=0,s.maxRemain=1e3}var i=t.fn,s=t.timevalue;i.extend(e);var n=e.prototype;Object.defineProperties(n,{queue:{get:function(){return this._.queue}},remain:{get:function(){return this._.queue.length
}},maxRemain:{set:function(t){"number"==typeof t&&t>0&&(this._.maxRemain=t)},get:function(){return this._.maxRemain}},isEmpty:{get:function(){return 0===this._.queue.length}},currentTime:{get:function(){return this._.currentTime}}}),n.sched=function(t,e,i){return"string"==typeof t&&(t=s(t)),"number"==typeof t&&this.schedAbs(this._.currentTime+t,e,i),this},n.schedAbs=function(e,i,n){if("string"==typeof e&&(e=s(e)),"number"==typeof e){var r=this._,a=r.queue;if(a.length>=r.maxRemain)return this;for(var o=a.length;o--&&!(e>a[o][0]););a.splice(o+1,0,[e,t(i),n])}return this},n.advance=function(t){return"string"==typeof t&&(t=s(t)),"number"==typeof t&&(this._.currentTime+=t),this},n.clear=function(){return this._.queue.splice(0),this},n.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s=null,n=e.queue;if(n.length)for(;n[0][0]<e.currentTime;){var r=e.queue.shift();if(r[1].bang(r[2]),s="sched",0===n.length){s="empty";break}}e.currentTime+=i.currentTimeIncr,s&&e.emit(s)}return this},i.register("schedule",e),i.alias("sched","schedule")}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.listener(this),i.fixAR(this);var s=this._;s.samples=0,s.writeIndex=0,s.plotFlush=!0,this.once("init",n)}var i=t.fn,s=t.timevalue;i.extend(e);var n=function(){this._.buffer||(this.size=1024),this._.interval||(this.interval=1e3)},r=e.prototype;Object.defineProperties(r,{size:{set:function(t){var e=this._;if(!e.buffer&&"number"==typeof t){var s=64>t?64:t>2048?2048:t;e.buffer=new i.SignalArray(s),e.reservedinterval&&(this.interval=e.reservedinterval,e.reservedinterval=null)}},get:function(){return this._.buffer.length}},interval:{set:function(t){var e=this._;"string"==typeof t&&(t=s(t)),"number"==typeof t&&t>0&&(e.buffer?(e.interval=t,e.samplesIncr=.001*t*e.samplerate/e.buffer.length,1>e.samplesIncr&&(e.samplesIncr=1)):e.reservedinterval=t)},get:function(){return this._.interval}}}),r.bang=function(){for(var t=this._,e=t.buffer,i=0,s=e.length;s>i;++i)e[i]=0;return t.samples=0,t.writeIndex=0,this._.emit("bang"),this},r.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this),i.outputSignalAR(this);var s,n=this.cells[0],r=e.cellsize,a=e.samples,o=e.samplesIncr,h=e.buffer,u=e.writeIndex,l=!1,c=h.length;for(s=0;r>s;++s)0>=a&&(h[u++]=n[s],u>=c&&(u=0),l=e.plotFlush=!0,a+=o),--a;e.samples=a,e.writeIndex=u,l&&this._.emit("data")}return this};var a=t.Object.prototype.plot;r.plot=function(t){var e=this._;if(e.plotFlush){for(var i=e.buffer,s=i.length-1,n=new Float32Array(i.length),r=e.writeIndex,o=0,h=i.length;h>o;o++)n[o]=i[++r&s];e.plotData=n,e.plotFlush=null}return a.call(this,t)},i.register("scope",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),n.fixAR(this);var i=this._;i.numberOfInputs=0,i.numberOfOutputs=0,i.bufferSize=0,i.bufferMask=0,i.duration=0,i.inputBufferL=null,i.inputBufferR=null,i.outputBufferL=null,i.outputBufferR=null,i.onaudioprocess=null,i.index=0,this.once("init",r)}function i(t,e){this.samplerate=t._.samplerate,this.length=t._.bufferSize,this.duration=t._.duration,this.numberOfChannels=e.length,this.getChannelData=function(t){return e[t]}}function s(e){var s=e._;this.node=e,this.playbackTime=t.currentTime,this.inputBuffer=2===s.numberOfInputs?new i(e,[s.inputBufferL,s.inputBufferR]):new i(e,[s.inputBufferL]),this.outputBuffer=2===s.numberOfOutputs?new i(e,[s.outputBufferL,s.outputBufferR]):new i(e,[s.outputBufferL])}var n=t.fn;n.extend(e);var r=function(){var t=this._;0===t.numberOfInputs&&(this.numberOfInputs=1),0===t.numberOfOutputs&&(this.numberOfOutputs=1),0===t.bufferSize&&(this.bufferSize=1024)},a=e.prototype;Object.defineProperties(a,{numberOfInputs:{set:function(t){var e=this._;0===e.numberOfInputs&&(e.numberOfInputs=2===t?2:1)},get:function(){return this._.numberOfInputs}},numberOfOutputs:{set:function(t){var e=this._;0===e.numberOfOutputs&&(e.numberOfOutputs=2===t?2:1)},get:function(){return this._.numberOfOutputs}},bufferSize:{set:function(t){var e=this._;0===e.bufferSize&&-1!==[256,512,1024,2048,4096,8192,16384].indexOf(t)&&(e.bufferSize=t,e.bufferMask=t-1,e.duration=t/e.samplerate,e.inputBufferL=new n.SignalArray(t),e.inputBufferR=new n.SignalArray(t),e.outputBufferL=new n.SignalArray(t),e.outputBufferR=new n.SignalArray(t))},get:function(){return this._.bufferSize}},onaudioprocess:{set:function(t){"function"==typeof t&&(this._.onaudioprocess=t)},get:function(){return this._.onaudioprocess}}}),a.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var i,r=e.cellsize,a=e.bufferMask,o=e.index,h=o+r,u=this.cells[1],l=this.cells[2];if(n.inputSignalAR(this),2===e.numberOfInputs)e.inputBufferL.set(u,o),e.inputBufferR.set(l,o);else{i=e.inputBufferL;for(var c=0;r>c;c++)i[o+c]=.5*(u[c]+l[c])}u.set(e.outputBufferL.subarray(o,h)),l.set(e.outputBufferR.subarray(o,h)),e.index=h&a,0===e.index&&e.onaudioprocess&&(e.onaudioprocess(new s(this)),1===e.numberOfOutputs&&e.outputBufferR.set(e.outputBufferL)),n.outputSignalAR(this)}return this},n.register("script",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),this._.selected=0,this._.background=!1}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{selected:{set:function(t){"number"==typeof t&&(this._.selected=t,this.cells[1].set(i.emptycell),this.cells[2].set(i.emptycell))},get:function(){return this._.selected}},background:{set:function(t){this._.background=!!t},get:function(){return this._.background}}}),s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n=this.nodes,r=n.length;if(e.background)for(s=0;r>s;++s)n[s].process(t);var a=n[e.selected];a&&(e.background||a.process(t),this.cells[1].set(a.cells[1]),this.cells[2].set(a.cells[2])),i.outputSignalAR(this)}return this},i.register("selector",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.listener(this),i.fixAR(this);var s=this._;s.status=r,s.samples=0,s.samplesIncr=0,s.writeIndex=0,s.plotFlush=!0,s.plotRange=[0,32],s.plotBarStyle=!0,this.once("init",o)}var i=t.fn,s=t.timevalue,n=t.modules.FFT,r=0,a=1;i.extend(e);var o=function(){var t=this._;t.fft||(this.size=512),t.interval||(this.interval=500)},h=e.prototype;Object.defineProperties(h,{size:{set:function(t){var e=this._;if(!e.fft&&"number"==typeof t){var s=256>t?256:t>2048?2048:t;e.fft=new n(s),e.buffer=new i.SignalArray(e.fft.length),e.freqs=new i.SignalArray(e.fft.length>>1),e.reservedwindow&&(e.fft.setWindow(e.reservedwindow),e.reservedwindow=null),e.reservedinterval&&(this.interval=e.reservedinterval,e.reservedinterval=null)}},get:function(){return this._.buffer.length}},window:{set:function(t){this._.fft.setWindow(t)},get:function(){return this._.fft.windowName}},interval:{set:function(t){var e=this._;"string"==typeof t&&(t=s(t)),"number"==typeof t&&t>0&&(e.buffer?(e.interval=t,e.samplesIncr=.001*t*e.samplerate,e.samplesIncr<e.buffer.length&&(e.samplesIncr=e.buffer.length,e.interval=1e3*e.samplesIncr/e.samplerate)):e.reservedinterval=t)},get:function(){return this._.interval}},spectrum:{get:function(){return this._.fft.getFrequencyData(this._.freqs)}},real:{get:function(){return this._.fft.real}},imag:{get:function(){return this._.fft.imag}}}),h.bang=function(){return this._.samples=0,this._.writeIndex=0,this._.emit("bang"),this},h.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t,i.inputSignalAR(this),i.outputSignalAR(this);var s,n,o=this.cells[0],h=o.length,u=e.status,l=e.samples,c=e.samplesIncr,f=e.writeIndex,p=e.buffer,d=p.length;for(s=0;h>s;++s)0>=l&&u===r&&(u=a,f=0,l+=c),u===a&&(p[f++]=o[s],f>=d&&(e.fft.forward(p),n=e.plotFlush=!0,u=r)),--l;e.samples=l,e.status=u,e.writeIndex=f,n&&this._.emit("data")}return this};var u=t.Object.prototype.plot;h.plot=function(t){return this._.plotFlush&&(this._.plotData=this.spectrum,this._.plotFlush=null),u.call(this,t)},i.register("spectrum",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),this._.ar=!1}var i=t.fn;i.extend(e);var s=e.prototype;s.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s,n,r,a,o,h=this.nodes,u=this.cells[0],l=this.cells[1],c=this.cells[2],f=h.length,p=u.length;if(e.ar){if(h.length>0)for(h[0].process(t),a=h[0].cells[1],o=h[0].cells[2],l.set(a),c.set(o),s=1;f>s;++s)for(h[s].process(t),a=h[s].cells[1],o=h[s].cells[2],n=0;p>n;++n)l[n]-=a[n],c[n]-=o[n];else for(n=0;p>n;++n)l[n]=c[s]=0;i.outputSignalAR(this)}else{if(h.length>0)for(r=h[0].process(t).cells[0][0],s=1;f>s;++s)r-=h[s].process(t).cells[0][0];else r=0;u[0]=r,i.outputSignalKR(this)}}return this},i.register("-",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;this.playbackState=i.FINISHED_STATE,s.poly=4,s.genList=[],s.genDict={},s.synthdef=null,s.remGen=r(this),s.onended=i.make_onended(this)}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{def:{set:function(t){"function"==typeof t&&(this._.synthdef=t)},get:function(){return this._.synthdef}},poly:{set:function(t){"number"==typeof t&&t>0&&64>=t&&(this._.poly=t)},get:function(){return this._.poly}}});var n=function(t,e){return function(){t._.remGen(e.gen)}},r=function(t){return function(e){var i=t._,s=i.genList.indexOf(e);-1!==s&&i.genList.splice(s,1),e.noteNum!==void 0&&(i.genDict[e.noteNum]=null)}},a=function(e,s,r,a){r|=0,0>=r?this.noteOff(this,e):r>127&&(r=127);var o=this._,h=o.genList,u=o.genDict,l=u[e];l&&o.remGen(l);var c={freq:s,noteNum:e,velocity:r,mul:.0078125*r};if(a)for(var f in a)c[f]=a[f];c.doneAction=n(this,c),l=o.synthdef.call(this,c),l instanceof t.Object&&(l.noteNum=e,h.push(l),u[e]=c.gen=l,this.playbackState=i.PLAYING_STATE,h.length>o.poly&&o.remGen(h[0]))},o=function(){for(var t=new Float32Array(128),e=0;128>e;++e)t[e]=440*Math.pow(2,1*(e-69)/12);return t}(),h=function(t){return t>0?12*Math.log(1*t/440)*Math.LOG2E+69:0};s.noteOn=function(t,e,i){var s=o[t]||440*Math.pow(2,(t-69)/12);return a.call(this,0|t+.5,s,e,i),this},s.noteOff=function(t){var e=this._.genDict[t];return e&&e.release&&e.release(),this},s.noteOnWithFreq=function(t,e,i){var s=h(t);return a.call(this,0|s+.5,t,e,i),this},s.noteOffWithFreq=function(t){var e=h(t);return this.noteOff(0|e+.5)},s.allNoteOff=function(){for(var t=this._.genList,e=0,i=t.length;i>e;++e)t[e].release&&t[e].release()},s.allSoundOff=function(){for(var t=this._,e=t.genList,i=t.genDict;e.length;)delete i[e.shift().noteNum]},s.synth=function(e){var s,r=this._,a=r.genList,o={};if(e)for(var h in e)o[h]=e[h];return o.doneAction=n(this,o),s=r.synthdef.call(this,o),s instanceof t.Object&&(a.push(s),o.gen=s,this.playbackState=i.PLAYING_STATE,a.length>r.poly&&r.remGen(a[0])),this},s.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){if(this.tickID=t,this.playbackState===i.PLAYING_STATE){var n,r,a,o,h,u,l=s.genList,c=this.cells[1],f=this.cells[2],p=e.length;if(l.length)for(n=l[0],n.process(t),c.set(n.cells[1]),f.set(n.cells[2]),r=1,a=l.length;a>r;++r)for(n=l[r],n.process(t),h=n.cells[1],u=n.cells[2],o=0;p>o;++o)c[o]+=h[o],f[o]+=u[o];else i.nextTick(s.onended)}i.outputSignalAR(this)}return this},i.register("SynthDef",e);var u={set:function(e){i.isDictionary(e)?"string"==typeof e.type&&(this._.env=e):e instanceof t.Object&&(this._.env=e)},get:function(){return this._.env}};i.register("OscGen",function(){var i={set:function(e){e instanceof t.Object&&(this._.osc=e)},get:function(){return this._.osc}},s={set:function(t){"string"==typeof t&&(this._.wave=t)},get:function(){return this._.wave}},n=function(e){var i,s,n,r,a=this._;return s=a.osc||null,n=a.env||{},r=n.type||"perc",s instanceof t.Object&&"function"==typeof s.clone&&(s=s.clone()),s||(s=t("osc",{wave:a.wave})),s.freq=e.freq,s.mul=s.mul*e.velocity/128,i=s,n instanceof t.Object?"function"==typeof n.clone&&(i=n.clone().append(i)):i=t(r,n,i),i.on("ended",e.doneAction).bang(),i};return function(t){var r=new e(t);return r._.wave="sin",Object.defineProperties(r,{env:u,osc:i,wave:s}),r.def=n,r}}()),i.register("PluckGen",function(){var i=function(e){var i,s,n,r=this._;return s=r.env||{},n=s.type||"perc",i=t("pluck",{freq:e.freq,mul:e.velocity/128}).bang(),s instanceof t.Object?"function"==typeof s.clone&&(i=s.clone().append(i)):i=t(n,s,i),i.on("ended",e.doneAction).bang(),i};return function(t){var s=new e(t);return Object.defineProperties(s,{env:u}),s.def=i,s}}())}(timbre),function(t){"use strict";function e(e){t.Object.call(this,2,e),i.fixAR(this);var s=this._;s.isLooped=!1,s.onended=i.make_onended(this,0)}var i=t.fn,s=t.modules.Scissor,n=s.Tape,r=s.TapeStream,a=i.isSignalArray;i.extend(e);var o=e.prototype;Object.defineProperties(o,{tape:{set:function(e){e instanceof n?(this.playbackState=i.PLAYING_STATE,this._.tape=e,this._.tapeStream=new r(e,this._.samplerate),this._.tapeStream.isLooped=this._.isLooped):(e instanceof t.Object&&e.buffer&&(e=e.buffer),"object"==typeof e&&Array.isArray(e.buffer)&&a(e.buffer[0])&&(this.playbackState=i.PLAYING_STATE,this._.tape=new s(e),this._.tapeStream=new r(this._.tape,this._.samplerate),this._.tapeStream.isLooped=this._.isLooped))},get:function(){return this._.tape}},isLooped:{get:function(){return this._.isLooped}},buffer:{get:function(){return this._.tape?this._.tape.getBuffer():void 0}}}),o.loop=function(t){return this._.isLooped=!!t,this._.tapeStream&&(this._.tapeStream.isLooped=this._.isLooped),this},o.bang=function(){return this.playbackState=i.PLAYING_STATE,this._.tapeStream&&this._.tapeStream.reset(),this._.emit("bang"),this},o.getBuffer=function(){return this._.tape?this._.tape.getBuffer():void 0},o.process=function(t){var e=this._;if(this.tickID!==t){this.tickID=t;var s=e.tapeStream;if(s){var n=this.cells[1],r=this.cells[2],a=s.fetch(n.length);n.set(a[0]),r.set(a[1]),this.playbackState===i.PLAYING_STATE&&s.isEnded&&i.nextTick(e.onended)}i.outputSignalAR(this)}return this},i.register("tape",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.timer(this);var s=this._;this.playbackState=i.FINISHED_STATE,s.task=[],s.i=0,s.j=0,s.imax=0,s.jmax=0,s.wait=0,s.count=0,s.args={},s.doNum=1,s.initFunc=i.nop,s.onended=a(this),this.on("start",r)}var i=t.fn,s=t.timevalue,n=t(function(){}).constructor;i.extend(e);var r=function(){var t,e=this._;this.playbackState=i.PLAYING_STATE,e.task=this.nodes.map(function(t){return t instanceof n?t.func:!1}).filter(function(t){return!!t}),e.i=e.j=0,e.imax=e.doNum,e.jmax=e.task.length,t=e.initFunc(),i.isDictionary(t)||(t={param:t}),e.args=t},a=function(t){return function(){t.playbackState=i.FINISHED_STATE;var e=t._,s=t.cells[0],n=t.cells[1],r=t.cells[2],a=e.args;if("number"==typeof a)for(var o=0,h=n.length;h>o;++o)s[0]=n[o]=r[o]=a;e.emit("ended",e.args)}},o=e.prototype;Object.defineProperties(o,{"do":{set:function(t){"number"==typeof t&&t>0&&(this._.doNum=1/0===t?1/0:0|t)},get:function(){return this._.doNum}},init:{set:function(t){"function"==typeof t&&(this._.initFunc=t)},get:function(){return this._.initFunc}}}),o.bang=function(){var t=this._;return t.count=0,t.emit("bang"),this},o.wait=function(t){return"string"==typeof t&&(t=s(t)),"number"==typeof t&&t>0&&(this._.count+=0|.001*this._.samplerate*t),this},o.process=function(t){var e,s=this.cells[0],n=this._;if(this.tickID!==t&&(this.tickID=t,n.i<n.imax)){for(;0>=n.count;){if(n.j>=n.jmax){if(++n.i,n.i>=n.imax){i.nextTick(n.onended);break}n.j=0}e=n.task[n.j++],e&&e.call(this,n.i,n.args)}n.count-=s.length}return this},i.register("task",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,0,e),i.timer(this),i.fixKR(this);var s=this._;this.playbackState=i.FINISHED_STATE,s.currentTime=0,s.samplesMax=0,s.samples=0,s.onended=i.make_onended(this),this.once("init",n),this.on("start",r)}var i=t.fn,s=t.timevalue;i.extend(e);var n=function(){this._.timeout||(this.timeout=1e3)},r=function(){this.playbackState=i.PLAYING_STATE};Object.defineProperty(r,"unremovable",{value:!0,writable:!1});var a=e.prototype;Object.defineProperties(a,{timeout:{set:function(t){var e=this._;"string"==typeof t&&(t=s(t)),"number"==typeof t&&t>=0&&(this.playbackState=i.PLAYING_STATE,e.timeout=t,e.samplesMax=0|e.samplerate*.001*t,e.samples=e.samplesMax)},get:function(){return this._.timeout}},currentTime:{get:function(){return this._.currentTime}}}),a.bang=function(){var t=this._;return this.playbackState=i.PLAYING_STATE,t.samples=t.samplesMax,t.currentTime=0,t.emit("bang"),this},a.process=function(t){var e=this.cells[0],s=this._;if(this.tickID!==t){if(this.tickID=t,s.samples>0&&(s.samples-=e.length),0>=s.samples){for(var n=this.nodes,r=0,a=n.length;a>r;++r)n[r].bang();i.nextTick(s.onended)}s.currentTime+=i.currentTimeIncr}return this},i.register("timeout",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e),i.fixAR(this),this._.curve=null}var i=t.fn;i.extend(e);var s=e.prototype;Object.defineProperties(s,{curve:{set:function(t){i.isSignalArray(t)&&(this._.curve=t)},get:function(){return this._.curve}}}),s.process=function(t){var e=this._;if(this.tickID!==t){if(this.tickID=t,i.inputSignalAR(this),e.curve){var s,n,r=this.cells[0],a=e.curve,o=a.length,h=e.cellsize;for(n=0;h>n;++n)s=0|.5*(r[n]+1)*o+.5,0>s?s=0:s>=o-1&&(s=o-1),r[n]=a[s]}i.outputSignalAR(this)}return this},i.register("waveshaper",e)}(timbre),function(t){"use strict";function e(e){t.Object.call(this,1,e);var i=this._;i.inMin=0,i.inMax=1,i.outMin=0,i.outMax=1,i.ar=!1,this.once("init",s)}var i=t.fn;i.extend(e);var s=function(){this._.warp||(this.warp="linlin")},n=e.prototype;Object.defineProperties(n,{inMin:{set:function(t){"number"==typeof t&&(this._.inMin=t)},get:function(){return this._.inMin}},inMax:{set:function(t){"number"==typeof t&&(this._.inMax=t)},get:function(){return this._.inMax}},outMin:{set:function(t){"number"==typeof t&&(this._.outMin=t)},get:function(){return this._.outMin}},outMax:{set:function(t){"number"==typeof t&&(this._.outMax=t)},get:function(){return this._.outMax}},warp:{set:function(t){if("string"==typeof t){var e=r[t];e&&(this._.warp=e,this._.warpName=t)}},get:function(){return this._.warpName}}}),n.process=function(t){var e=this._,s=this.cells[0];if(this.tickID!==t){this.tickID=t;var n,r=e.inMin,a=e.inMax,o=e.outMin,h=e.outMax,u=e.warp,l=this.nodes.length,c=e.mul,f=e.add,p=s.length;if(e.ar&&l){for(i.inputSignalAR(this),n=0;p>n;++n)s[n]=u(s[n],r,a,o,h)*c+f;i.outputSignalAR(this)}else{var d=this.nodes.length?i.inputSignalKR(this):0,m=u(d,r,a,o,h)*c+f;for(n=0;p>n;++n)s[n]=m}}return this};var r={linlin:function(t,e,i,s,n){return e>t?s:t>i?n:i===e?s:(t-e)/(i-e)*(n-s)+s},linexp:function(t,e,i,s,n){return e>t?s:t>i?n:0===s?0:i===e?n:Math.pow(n/s,(t-e)/(i-e))*s},explin:function(t,e,i,s,n){return e>t?s:t>i?n:0===e?n:Math.log(t/e)/Math.log(i/e)*(n-s)+s},expexp:function(t,e,i,s,n){return e>t?s:t>i?n:0===e||0===s?0:Math.pow(n/s,Math.log(t/e)/Math.log(i/e))*s}};i.register("zmap",e)}(timbre);
//@ sourceMappingURL=timbre.js.map
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
/*! Dust - Asynchronous Templating - v2.3.4
* http://linkedin.github.io/dustjs/
* Copyright (c) 2014 Aleksander Williams; Released under the MIT License */
!function(root){function Context(a,b,c,d){this.stack=a,this.global=b,this.blocks=c,this.templateName=d}function Stack(a,b,c,d){this.tail=b,this.isObject=a&&"object"==typeof a,this.head=a,this.index=c,this.of=d}function Stub(a){this.head=new Chunk(this),this.callback=a,this.out=""}function Stream(){this.head=new Chunk(this)}function Chunk(a,b,c){this.root=a,this.next=b,this.data=[],this.flushable=!1,this.taps=c}function Tap(a,b){this.head=a,this.tail=b}var dust={},NONE="NONE",ERROR="ERROR",WARN="WARN",INFO="INFO",DEBUG="DEBUG",loggingLevels=[DEBUG,INFO,WARN,ERROR,NONE],EMPTY_FUNC=function(){},logger={},originalLog,loggerContext;dust.debugLevel=NONE,dust.silenceErrors=!1,root&&root.console&&root.console.log&&(loggerContext=root.console,originalLog=root.console.log),logger.log=loggerContext?function(){logger.log="function"==typeof originalLog?function(){originalLog.apply(loggerContext,arguments)}:function(){var a=Array.prototype.slice.apply(arguments).join(" ");originalLog(a)},logger.log.apply(this,arguments)}:function(){},dust.log=function(a,b){if(dust.isDebug&&dust.debugLevel===NONE&&(logger.log('[!!!DEPRECATION WARNING!!!]: dust.isDebug is deprecated.  Set dust.debugLevel instead to the level of logging you want ["debug","info","warn","error","none"]'),dust.debugLevel=INFO),b=b||INFO,dust.indexInArray(loggingLevels,b)>=dust.indexInArray(loggingLevels,dust.debugLevel)&&(dust.logQueue||(dust.logQueue=[]),dust.logQueue.push({message:a,type:b}),logger.log("[DUST "+b+"]: "+a)),!dust.silenceErrors&&b===ERROR)throw"string"==typeof a?new Error(a):a},dust.onError=function(a,b){if(logger.log("[!!!DEPRECATION WARNING!!!]: dust.onError will no longer return a chunk object."),dust.log(a.message||a,ERROR),dust.silenceErrors)return b;throw a},dust.helpers={},dust.cache={},dust.register=function(a,b){a&&(dust.cache[a]=b)},dust.render=function(a,b,c){var d=new Stub(c).head;try{dust.load(a,d,Context.wrap(b,a)).end()}catch(e){dust.log(e,ERROR)}},dust.stream=function(a,b){var c=new Stream;return dust.nextTick(function(){try{dust.load(a,c.head,Context.wrap(b,a)).end()}catch(d){dust.log(d,ERROR)}}),c},dust.renderSource=function(a,b,c){return dust.compileFn(a)(b,c)},dust.compileFn=function(a,b){b=b||null;var c=dust.loadSource(dust.compile(a,b));return function(a,d){var e=d?new Stub(d):new Stream;return dust.nextTick(function(){"function"==typeof c?c(e.head,Context.wrap(a,b)).end():dust.log(new Error("Template ["+b+"] cannot be resolved to a Dust function"),ERROR)}),e}},dust.load=function(a,b,c){var d=dust.cache[a];return d?d(b,c):dust.onLoad?b.map(function(b){dust.onLoad(a,function(d,e){return d?b.setError(d):(dust.cache[a]||dust.loadSource(dust.compile(e,a)),void dust.cache[a](b,c).end())})}):b.setError(new Error("Template Not Found: "+a))},dust.loadSource=function(source,path){return eval(source)},dust.isArray=Array.isArray?Array.isArray:function(a){return"[object Array]"===Object.prototype.toString.call(a)},dust.indexInArray=function(a,b,c){if(c=+c||0,Array.prototype.indexOf)return a.indexOf(b,c);if(void 0===a||null===a)throw new TypeError('cannot call method "indexOf" of null');var d=a.length;for(1/0===Math.abs(c)&&(c=0),0>c&&(c+=d,0>c&&(c=0));d>c;c++)if(a[c]===b)return c;return-1},dust.nextTick=function(){return function(a){setTimeout(a,0)}}(),dust.isEmpty=function(a){return dust.isArray(a)&&!a.length?!0:0===a?!1:!a},dust.filter=function(a,b,c){if(c)for(var d=0,e=c.length;e>d;d++){var f=c[d];"s"===f?(b=null,dust.log("Using unescape filter on ["+a+"]",DEBUG)):"function"==typeof dust.filters[f]?a=dust.filters[f](a):dust.log("Invalid filter ["+f+"]",WARN)}return b&&(a=dust.filters[b](a)),a},dust.filters={h:function(a){return dust.escapeHtml(a)},j:function(a){return dust.escapeJs(a)},u:encodeURI,uc:encodeURIComponent,js:function(a){return JSON?JSON.stringify(a):(dust.log("JSON is undefined.  JSON stringify has not been used on ["+a+"]",WARN),a)},jp:function(a){return JSON?JSON.parse(a):(dust.log("JSON is undefined.  JSON parse has not been used on ["+a+"]",WARN),a)}},dust.makeBase=function(a){return new Context(new Stack,a)},Context.wrap=function(a,b){return a instanceof Context?a:new Context(new Stack(a),{},null,b)},Context.prototype.get=function(a,b){return"string"==typeof a&&("."===a[0]&&(b=!0,a=a.substr(1)),a=a.split(".")),this._get(b,a)},Context.prototype._get=function(a,b){var c,d,e,f,g=this.stack,h=1;if(dust.log("Searching for reference [{"+b.join(".")+"}] in template ["+this.getTemplateName()+"]",DEBUG),d=b[0],e=b.length,a&&0===e)f=g,g=g.head;else{if(a)g&&(g=g.head?g.head[d]:void 0);else{for(;g&&(!g.isObject||(f=g.head,c=g.head[d],void 0===c));)g=g.tail;g=void 0!==c?c:this.global?this.global[d]:void 0}for(;g&&e>h;)f=g,g=g[b[h]],h++}if("function"==typeof g){var i=function(){try{return g.apply(f,arguments)}catch(a){return dust.log(a,ERROR)}};return i.isFunction=!0,i}return void 0===g&&dust.log("Cannot find the value for reference [{"+b.join(".")+"}] in template ["+this.getTemplateName()+"]"),g},Context.prototype.getPath=function(a,b){return this._get(a,b)},Context.prototype.push=function(a,b,c){return new Context(new Stack(a,this.stack,b,c),this.global,this.blocks,this.getTemplateName())},Context.prototype.rebase=function(a){return new Context(new Stack(a),this.global,this.blocks,this.getTemplateName())},Context.prototype.current=function(){return this.stack.head},Context.prototype.getBlock=function(a){if("function"==typeof a){var b=new Chunk;a=a(b,this).data.join("")}var c=this.blocks;if(!c)return void dust.log("No blocks for context[{"+a+"}] in template ["+this.getTemplateName()+"]",DEBUG);for(var d,e=c.length;e--;)if(d=c[e][a])return d},Context.prototype.shiftBlocks=function(a){var b,c=this.blocks;return a?(b=c?c.concat([a]):[a],new Context(this.stack,this.global,b,this.getTemplateName())):this},Context.prototype.getTemplateName=function(){return this.templateName},Stub.prototype.flush=function(){for(var a=this.head;a;){if(!a.flushable)return a.error?(this.callback(a.error),dust.log("Chunk error ["+a.error+"] thrown. Ceasing to render this template.",WARN),void(this.flush=EMPTY_FUNC)):void 0;this.out+=a.data.join(""),a=a.next,this.head=a}this.callback(null,this.out)},Stream.prototype.flush=function(){for(var a=this.head;a;){if(!a.flushable)return a.error?(this.emit("error",a.error),dust.log("Chunk error ["+a.error+"] thrown. Ceasing to render this template.",WARN),void(this.flush=EMPTY_FUNC)):void 0;this.emit("data",a.data.join("")),a=a.next,this.head=a}this.emit("end")},Stream.prototype.emit=function(a,b){if(!this.events)return dust.log("No events to emit",INFO),!1;var c=this.events[a];if(!c)return dust.log("Event type ["+a+"] does not exist",WARN),!1;if("function"==typeof c)c(b);else if(dust.isArray(c))for(var d=c.slice(0),e=0,f=d.length;f>e;e++)d[e](b);else dust.log("Event Handler ["+c+"] is not of a type that is handled by emit",WARN)},Stream.prototype.on=function(a,b){return this.events||(this.events={}),this.events[a]?"function"==typeof this.events[a]?this.events[a]=[this.events[a],b]:this.events[a].push(b):(dust.log("Event type ["+a+"] does not exist. Using just the specified callback.",WARN),b?this.events[a]=b:dust.log("Callback for type ["+a+"] does not exist. Listener not registered.",WARN)),this},Stream.prototype.pipe=function(a){return this.on("data",function(b){try{a.write(b,"utf8")}catch(c){dust.log(c,ERROR)}}).on("end",function(){try{return a.end()}catch(b){dust.log(b,ERROR)}}).on("error",function(b){a.error(b)}),this},Chunk.prototype.write=function(a){var b=this.taps;return b&&(a=b.go(a)),this.data.push(a),this},Chunk.prototype.end=function(a){return a&&this.write(a),this.flushable=!0,this.root.flush(),this},Chunk.prototype.map=function(a){var b=new Chunk(this.root,this.next,this.taps),c=new Chunk(this.root,b,this.taps);return this.next=c,this.flushable=!0,a(c),b},Chunk.prototype.tap=function(a){var b=this.taps;return this.taps=b?b.push(a):new Tap(a),this},Chunk.prototype.untap=function(){return this.taps=this.taps.tail,this},Chunk.prototype.render=function(a,b){return a(this,b)},Chunk.prototype.reference=function(a,b,c,d){return"function"==typeof a&&(a.isFunction=!0,a=a.apply(b.current(),[this,b,null,{auto:c,filters:d}]),a instanceof Chunk)?a:dust.isEmpty(a)?this:this.write(dust.filter(a,c,d))},Chunk.prototype.section=function(a,b,c,d){if("function"==typeof a&&(a=a.apply(b.current(),[this,b,c,d]),a instanceof Chunk))return a;var e=c.block,f=c["else"];if(d&&(b=b.push(d)),dust.isArray(a)){if(e){var g=a.length,h=this;if(g>0){b.stack.head&&(b.stack.head.$len=g);for(var i=0;g>i;i++)b.stack.head&&(b.stack.head.$idx=i),h=e(h,b.push(a[i],i,g));return b.stack.head&&(b.stack.head.$idx=void 0,b.stack.head.$len=void 0),h}if(f)return f(this,b)}}else if(a===!0){if(e)return e(this,b)}else if(a||0===a){if(e)return e(this,b.push(a))}else if(f)return f(this,b);return dust.log("Not rendering section (#) block in template ["+b.getTemplateName()+"], because above key was not found",DEBUG),this},Chunk.prototype.exists=function(a,b,c){var d=c.block,e=c["else"];if(dust.isEmpty(a)){if(e)return e(this,b)}else if(d)return d(this,b);return dust.log("Not rendering exists (?) block in template ["+b.getTemplateName()+"], because above key was not found",DEBUG),this},Chunk.prototype.notexists=function(a,b,c){var d=c.block,e=c["else"];if(dust.isEmpty(a)){if(d)return d(this,b)}else if(e)return e(this,b);return dust.log("Not rendering not exists (^) block check in template ["+b.getTemplateName()+"], because above key was found",DEBUG),this},Chunk.prototype.block=function(a,b,c){var d=c.block;return a&&(d=a),d?d(this,b):this},Chunk.prototype.partial=function(a,b,c){var d;d=dust.makeBase(b.global),d.blocks=b.blocks,b.stack&&b.stack.tail&&(d.stack=b.stack.tail),c&&(d=d.push(c)),"string"==typeof a&&(d.templateName=a),d=d.push(b.stack.head);var e;return e="function"==typeof a?this.capture(a,d,function(a,b){d.templateName=d.templateName||a,dust.load(a,b,d).end()}):dust.load(a,this,d)},Chunk.prototype.helper=function(a,b,c,d){var e=this;try{return dust.helpers[a]?dust.helpers[a](e,b,c,d):(dust.log("Invalid helper ["+a+"]",WARN),e)}catch(f){return dust.log(f,ERROR),e}},Chunk.prototype.capture=function(a,b,c){return this.map(function(d){var e=new Stub(function(a,b){a?d.setError(a):c(b,d)});a(e.head,b).end()})},Chunk.prototype.setError=function(a){return this.error=a,this.root.flush(),this},Tap.prototype.push=function(a){return new Tap(a,this)},Tap.prototype.go=function(a){for(var b=this;b;)a=b.head(a),b=b.tail;return a};var HCHARS=new RegExp(/[&<>\"\']/),AMP=/&/g,LT=/</g,GT=/>/g,QUOT=/\"/g,SQUOT=/\'/g;dust.escapeHtml=function(a){return"string"==typeof a?HCHARS.test(a)?a.replace(AMP,"&amp;").replace(LT,"&lt;").replace(GT,"&gt;").replace(QUOT,"&quot;").replace(SQUOT,"&#39;"):a:a};var BS=/\\/g,FS=/\//g,CR=/\r/g,LS=/\u2028/g,PS=/\u2029/g,NL=/\n/g,LF=/\f/g,SQ=/'/g,DQ=/"/g,TB=/\t/g;dust.escapeJs=function(a){return"string"==typeof a?a.replace(BS,"\\\\").replace(FS,"\\/").replace(DQ,'\\"').replace(SQ,"\\'").replace(CR,"\\r").replace(LS,"\\u2028").replace(PS,"\\u2029").replace(NL,"\\n").replace(LF,"\\f").replace(TB,"\\t"):a},"object"==typeof exports?module.exports=dust:root.dust=dust}(this);
},{}],8:[function(require,module,exports){
var RoutesIndex = require('./routes/index.js');

var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

$(function(){
  var router = new RoutesIndex();
  Backbone.history.start();
  router.newRoom();
});

},{"./routes/index.js":17,"backbone":1,"jquery":3}],9:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
var SineView = require('../views/sineView.js');

Backbone.$ = $;

var Action = Backbone.Model.extend({

  execute: function() {
    var self = this;
    setTimeout(function() { self.done(); }, this.get('duration'));
  },

  done: function() {
    this.get('parent').nextAction(this.get('type'));
  }

});

var VolumeModel = Action.extend({
  initialize: function() {
    this.set('type', 'volume');
    if (this.get('default')) {
      this.set('displayText', 'x1');
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setVolume(-1, -1, 'default');
      }
    } else {
      this.set('displayText', 'x'+this.get('value'));
    }
  },
  execute: function() {
    var sound = this.get('parent').sound;
    sound.setVolume(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  }
});

var ChordModel = Action.extend({
  initialize: function() {
    this.set('type', 'chord');
    if (this.get('default')) {
      this.set('displayText', 'Root');
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setChord(-1, -1, 'default');
      }
    } else {
      this.set('displayText', this.get('value'));
    }
  },
  execute: function() {
    var sound = this.get('parent').sound;
    sound.setChord(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  }
});

var PitchModel = Action.extend({
  initialize: function() {
    this.set('type', 'pitch');
    if (this.get('default')) {
      this.set('displayText', 'C');
      this.execute = function() {
        var sound = this.get('parent').sound;
        sound.setPitch(-1, -1, 'default');
      }
    } else {
      this.set('displayText', this.get('value'));
    }
  },
  execute: function() {
    var sound = this.get('parent').sound;
    sound.setPitch(this.get('value'), this.get('duration'));
    Action.prototype.execute.apply(this);
  }
});

module.exports = {
  Volume: VolumeModel,
  Chord: ChordModel,
  Pitch: PitchModel
};

},{"../views/sineView.js":29,"backbone":1,"jquery":3}],10:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
var DisplayView = require("../views/displayView.js");
var ActionManager = require("../modules/actionManager.js");

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    var self = this;

    this.view = new DisplayView({model: this});
    this.view.render();


    var socket = this.get('socket');

    // *** comment out for production:
    // console.log('starting run in 3 seconds');
    // setTimeout(function() {
      // self.view.allPositioned();
      // self.actions = new ActionManager();
    // }, 3000);



    socket.on('display:sendAction', function(data) {
      self.addAction(data.action, data.device);
    });

    socket.on('display:positioningStart', function() {
      self.view.silence();
    });

    socket.on('display:position', function() {
      self.view.ident();
    });

    socket.on('display:positioningDone', function() {
      self.view.silence();
    });

    socket.on('display:allPositioningDone', function() {
      self.view.allPositioned();
      self.actions = new ActionManager();
    });
  },

  addAction: function(action, sender) {
    switch (action.type) {
      case 'start':
        self.actions.startPlaying();
        break;
      case 'stop':
        self.actions.stopPlaying();
        break;
      default:
        self.actions.addAction(action);
    }
  }
});

},{"../modules/actionManager.js":15,"../views/displayView.js":25,"backbone":1,"jquery":3}],11:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');

var LogInsView = require('../views/logInstanceView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.view = new LogInsView({model: this});
    this.view.render();
  },

  remove: function() {
    this.get('logger').removeLog(this.cid);
  }
});

},{"../views/logInstanceView.js":26,"backbone":1,"jquery":3}],12:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');

var LoggerView = require('../views/loggerView.js');
var LogInstance = require('./logInstance.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.view = new LoggerView({model: this});
    this.view.render();
    this.logs = [];

    var socket = this.get('socket');
    var self = this;

    socket.on('rooms:notification', function (data) {
      self.logs.push(new LogInstance({ logger: self, message: data.message }));
    });
  },

  removeLog: function(logID) {
    newlogs = [];
    this.logs.map(function(log) {
      if (log.cid != logID) {
        newlogs.push(log);
      }
    });
    this.logs = newlogs;
  }

});

},{"../views/loggerView.js":27,"./logInstance.js":11,"backbone":1,"jquery":3}],13:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
var Display = require('./displayModel.js');
var io = require('socket.io-client');


var RoomView = require('../views/roomView.js');
var Logger = require('./logger.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.connect();
    this.view = new RoomView({model: this});
    this.view.render();
  },

  connect: function() {
    var self = this;
    var socket = io.connect("http://photoplace.cs.oberlin.edu");
    // var socket = io.connect("http://localhost:3000");
    socket.on('connectSuccess', function(data) {
      self.set({
        status: 'connected',
        socket: socket
      });


      self.logger = new Logger({socket: socket});
      // self.joinRoom('test'); // *** comment out for production
    });
  },

  joinRoom: function(roomID) {
    var self = this;
    var socket = self.get('socket');
    if (roomID) {
      socket.emit("rooms:join", { roomID: roomID, type: 'display' });
    } else {
      socket.emit("rooms:new", { type: 'display' });
    }

    socket.on('rooms:joinSuccess', function (data) {
      var room = data.room;
      self.set(data.room);
      self.display = new Display({room: self, socket: socket, message: data.message, id: data.id});
      self.view.hide();
    });
  }
});

},{"../views/roomView.js":28,"./displayModel.js":10,"./logger.js":12,"backbone":1,"jquery":3,"socket.io-client":4}],14:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
var SoundView = require('../views/soundView.js');

Backbone.$ = $;

module.exports = Backbone.Model.extend({

  initialize: function() {
    this.view = new SoundView({model: this});
    var mul = Math.pow(2, 1/12);
    this.intervals = {
      3: {major: Math.pow(mul,4), minor: Math.pow(mul,3)},
      5: {major: Math.pow(mul,7), dim: Math.pow(mul,6)},
      7: {major: Math.pow(mul,11), minor: Math.pow(mul,10)}
    }
  },

  setTones: function() {
    var name = this.get('chord');
    var root = this.get('freq');
    var freqs = [];
    // the root
    freqs.push(root);

    // the third
    if (name == 'maj' || name == '7' || name == 'maj7') {
      freqs.push(this.intervals[3].major * root);
    } else {
      freqs.push(this.intervals[3].minor * root);
    }

    // 5th is always the same
    freqs.push(this.intervals[5].major * root);

    // the 7th, not always present
    if (name == 'min' || name == 'maj') {
      freqs.push(-1);
    } else if (name == '7' || 'min7') {
      freqs.push(this.intervals[7].minor * root);
    } else { // maj7
      freqs.push(this.intervals[7].major * root);
    }
    this.set('freqs', freqs);
  },

  setChord: function(name, duration, def) {
    var names = ['maj', 'maj7', 'min', '7', 'min7'];
    if (def) {
      console.log('unsetting chord');
      this.unset('chord'); 
    } else if (names.indexOf(name) > -1) {
      this.set('chord', name);
      this.setTones();
    } else {
      console.log('ERROR: bad chord name ', name);
    }
  },

  setPitch: function(pitch, duration, def) {
    var pitches = {
      A: 440,
      B: 494,
      C: 523,
      D: 587,
      E: 659,
      F: 698,
      G: 784
    };
    if (def) {
      this.set('freq', pitches.C);
      if (this.get('chord')) this.setTones();
      return;
    }
    var freq = pitches[pitch];
    if (!freq) {
      console.log('ERROR: Invalid pitch', pitch);
      return;
    }
    this.set('freq', freq);
    if (this.get('chord')) this.setTones();
  },

  setVolume: function(value, duration, def) {
    if (def) {
      this.set('magnitude', .5);
    } else {
      this.set('magnitude', value * .5);
    }
  },


  play: function() {
    this.set('playing', true);
  },

  stop: function() {
    this.set('playing', false);
  }
});

},{"../views/soundView.js":30,"backbone":1,"jquery":3}],15:[function(require,module,exports){
var Queue = require('./queue.js');
var Sound = require('../models/soundModel.js');
var Actions = require('../models/actionModel.js');
var SineView = require('../views/sineView.js');
var ActionView = require('../views/actionView.js');
// var testModule = require('./testModule.js'); // comment out for production
var Volume = Actions.Volume;
var Chord = Actions.Chord;
var Pitch = Actions.Pitch;

var Manager = function() {
  this.vols = new Queue();
  this.pitches = new Queue();
  this.chords = new Queue();
  this.sound = new Sound({'freq': 440, 'magnitude': .5});
  this.current = {};
  this.defaults = {
    vol: new Volume({parent: this, default: true}),
    chord: new Chord({parent: this, default: true}),
    pitch: new Pitch({parent: this, default: true}),
  };

  this.plainSine = new SineView({el: '#plain'});
  this.volSine = new SineView({el: '#vol'});
  this.chordSine = new SineView({el: '#chord'});
  this.pitchSine = new SineView({el: '#pitch'});

  this.views = {
    vol: new ActionView({el: '#vol .action', model: this.defaults.vol}),
    pitch: new ActionView({el: '#pitch .action', model: this.defaults.pitch}),
    chord: new ActionView({el: '#chord .action', model: this.defaults.chord})
  }

  this.startPlaying();

  // testModule.runTests(this); // comment out for production
};

Manager.prototype.addAction = function(action) {
  switch (action.type) {
    case 'volume':
      vol = new Volume({parent: this, duration: action.duration, value: action.value});
      if (this.current.vol) {
        this.vols.enqueue(vol);
      } else {
        this.executeVol(vol);
      }
      break;
    case 'pitch':
      pitch = new Pitch({parent: this, duration: action.duration, value: action.value});
      if (this.current.pitch) {
        this.pitches.enqueue(pitch);
      } else {
        this.executePitch(pitch);
      }
      break;
    case 'chord':
      chord = new Chord({parent: this, duration: action.duration, value: action.value});
      if (this.current.chord) {
        this.chords.enqueue(chord);
      } else {
        this.executeChord(chord);
      }
      break;
  }
};

Manager.prototype.nextAction = function(type) {
  switch (type) {
    case 'volume':
      if (this.vols.isEmpty()) {
        this.executeVol(this.defaults.vol, true);
      } else {
        this.executeVol(this.vols.dequeue());
      }
      break;
    case 'pitch':
      if (this.pitches.isEmpty()) {
        this.executePitch(this.defaults.pitch, true);
      } else {
        this.executePitch(this.pitches.dequeue());
      }
      break;
    case 'chord':
      if (this.chords.isEmpty()) {
        this.executeChord(this.defaults.chord, true);
      } else {
        this.executeChord(this.chords.dequeue());
      }
      break;
  }
};

Manager.prototype.startPlaying = function() {
  this.plainSine.start();
  this.volSine.start();
  this.chordSine.start();
  this.pitchSine.start();

  this.sound.play();
};

Manager.prototype.stopPlaying = function() {
  this.sound.stop();
};

Manager.prototype.executeChord = function(c, def) {
  c.execute();
  if (def) {
    delete this.current.chord;
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  } else {
    this.current.chord = c;
    this.chordSine.animateChord({freqs: this.sound.get('freqs'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  }
  this.views.chord.setModel(c);
};

Manager.prototype.executeVol = function(vol, def) {
  vol.execute();
  if (def) {
    delete this.current.vol;
    this.volSine.animate({freq: this.sound.get('freq')});
  } else {
    this.current.vol = vol;
    this.volSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude'), color: "#0000FF"});
  }
  if (this.current.chord) {
    this.chordSine.animateChord({freqs: this.sound.get('freqs'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  } else {
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  }
  this.views.vol.setModel(vol);
};

Manager.prototype.executePitch = function(p, def) {
  p.execute();
  if (def) {
    delete this.current.pitch;
    this.pitchSine.animate();
  } else {
    this.current.pitch = p;
    this.pitchSine.animate({freq: this.sound.get('freq'), color: "#FF00FF"});
  }
  if (this.current.vol) {
    this.volSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude'), color: "#0000FF"});
  } else {
    this.volSine.animate({freq: this.sound.get('freq')});
  }
  if (this.current.chord) {
    this.chordSine.animateChord({freqs: this.sound.get('freqs'), mag: this.sound.get('magnitude'), color: "#00FF00"});
  } else {
    this.chordSine.animate({freq: this.sound.get('freq'), mag: this.sound.get('magnitude')});
  }
  this.views.pitch.setModel(p);
};

module.exports = Manager;

},{"../models/actionModel.js":9,"../models/soundModel.js":14,"../views/actionView.js":24,"../views/sineView.js":29,"./queue.js":16}],16:[function(require,module,exports){
//code.stephenmorley.org
module.exports=function(){var a=[],b=0;this.getLength=function(){return a.length-b};this.isEmpty=function(){return 0==a.length};this.enqueue=function(b){a.push(b)};this.dequeue=function(){if(0!=a.length){var c=a[b];2*++b>=a.length&&(a=a.slice(b),b=0);return c}};this.peek=function(){return 0<a.length?a[b]:void 0}};

},{}],17:[function(require,module,exports){
var Room = require('../models/roomModel.js');
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

module.exports = Backbone.Router.extend({
  routes: {
    "new_room":        "newRoom" // # new_room
  },

  newRoom: function() {
    var room = new Room();
  },

  clearRooms: function() {
    Backbone.$.get("rooms/clear_all", function(data) {
      if (data.success) {
        alert('rooms emptied');
      } else {
        alert('room clear failed');
      }
    });
  }
});

},{"../models/roomModel.js":13,"backbone":1,"jquery":3}],18:[function(require,module,exports){
var dust = require('../dust-core.min.js');
(function(){dust.register("action",body_0);function body_0(chk,ctx){return chk.write("<div class=\"shapeContainer\"><span class=\"text\">").reference(ctx.get(["displayText"], false),ctx,"h").write("</span><canvas class=\"shape\" height=\"100\" width=\"100\"></canvas><canvas class=\"spout\" height=\"400\" width=\"100\"></canvas></div>");}return body_0;})();
},{"../dust-core.min.js":7}],19:[function(require,module,exports){
var dust = require('../dust-core.min.js');
(function(){dust.register("display",body_0);function body_0(chk,ctx){return chk.write("<div class=\"infoBar\"></div><div class=\"waveArea\"><div id=\"plain\"></div><div id=\"pitch\"></div><div id=\"vol\"></div><div id=\"chord\"></div></div>");}return body_0;})();
},{"../dust-core.min.js":7}],20:[function(require,module,exports){
var dust = require('../dust-core.min.js');
(function(){dust.register("logInstance",body_0);function body_0(chk,ctx){return chk.write("<div id=\"logInstance").reference(ctx.get(["cid"], false),ctx,"h").write("\" class=\"logInstance\"><span class=\"message\">").reference(ctx.get(["message"], false),ctx,"h").write("</span><span class=\"close\">[x]</span></div>");}return body_0;})();
},{"../dust-core.min.js":7}],21:[function(require,module,exports){
var dust = require('../dust-core.min.js');
(function(){dust.register("logger",body_0);function body_0(chk,ctx){return chk.write("<div class=\"logArea\"><div>Log</div><div id=\"logInstances\"></div></div>");}return body_0;})();
},{"../dust-core.min.js":7}],22:[function(require,module,exports){
var dust = require('../dust-core.min.js');
(function(){dust.register("room",body_0);function body_0(chk,ctx){return chk.write("<h1>ROOM VIEW</h1><p>").reference(ctx.get(["status"], false),ctx,"h").write("</p><p>").reference(ctx.get(["id"], false),ctx,"h").write("</p><div class=\"joinNew\">Create a new room</div><div class=\"joinExisting\">Join a room</div>");}return body_0;})();
},{"../dust-core.min.js":7}],23:[function(require,module,exports){
var dust = require('../dust-core.min.js');
(function(){dust.register("sine",body_0);function body_0(chk,ctx){return chk.write("<div class=\"sineContainer\"><div class=\"action\"></div><canvas class=\"sine\" height=\"400\" width=\"250\"></canvas></div>");}return body_0;})();
},{"../dust-core.min.js":7}],24:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/action.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
    this.render();
  },

  render: function() {
    var self = this;
    dust.render('action', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
      self.drawSpout();
      var $canvas = self.$el.find("canvas.shape");
      var canvas = $canvas[0];
      self.context = canvas.getContext('2d');
      self.context.stash = {};
      self.context.stash.height = $canvas.height();
      self.context.stash.width = $canvas.width();
      self.drawShape();
    });
  },

  drawSpout: function() {
    var $canvas = this.$el.find(".spout");
    var width = $canvas.width();
    var height = $canvas.height();
    var canvas = $canvas[0];
    var context = canvas.getContext('2d');

    context.clearRect(0,0,width,height);
    context.fillStyle = "#000000";
    // left triangle
    context.beginPath();
    context.moveTo(0,0);
    context.lineTo(width/2, height/2);
    context.lineTo(0, height);
    context.fill();

    // right triangle
    context.beginPath();
    context.moveTo(width,0);
    context.lineTo(width/2, height/2);
    context.lineTo(width, height);
    context.fill();
  },

  setModel: function(model) {
    this.model = model;
    this.render();
  },

  drawShape: function() {
    var func;
    var self = this;
    switch (this.model.get('type')) {
      case 'volume':
        func = this.drawCircle;
        break;
      case 'pitch':
        func = this.drawDiamond;
        break;
      case 'chord':
        func = this.drawSquare;
        break;
      default:
        console.log('oops', this);
    }

    var time = this.model.get('duration');
    if (time) {
      var inc = time;
      function draw() {
        if (inc > 15000) {
          func.apply(self,[1]); // just sit at max size until small enough to start shrinking
        } else {
          func.apply(self,[inc/15000]);
        }
        inc = inc-100;
        if (inc > 0) self.timeout = setTimeout(draw, 100);
      }
      draw();
    } else {
      clearTimeout(this.timeout);
      func.apply(this,[-1]);
    }
  },

  drawCircle: function(ratio) {
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#0000FF";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 1;
    }
    this.context.beginPath();
    this.context.arc(this.context.stash.width/2, this.context.stash.height/2, ratio*this.context.stash.height/2, 0, 2*Math.PI);
    this.context.fill();
  },

  drawSquare: function(ratio) {
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#00FF00";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 1;
    }
    this.context.beginPath();
    var hMiddle = this.context.stash.width/2;
    var vMiddle = this.context.stash.height/2;
    this.context.fillRect(hMiddle - (ratio*hMiddle), vMiddle - (ratio*vMiddle), ratio * 2 * hMiddle, ratio * 2 * vMiddle);
  },

  drawDiamond: function(ratio) {
    this.context.clearRect(0,0,this.context.stash.width,this.context.stash.height);
    this.context.fillStyle = "#FF00FF";
    if (ratio == -1) {
      this.context.fillStyle = "#BBBBBB";
      ratio = 1;
    }
    var hMiddle = this.context.stash.width/2;
    var vMiddle = this.context.stash.height/2;
    this.context.beginPath();
    this.context.moveTo(hMiddle - (ratio * hMiddle), vMiddle);
    this.context.lineTo(hMiddle, vMiddle - (ratio * vMiddle));
    this.context.lineTo(hMiddle + (ratio * hMiddle), vMiddle);
    this.context.lineTo(hMiddle, vMiddle + (ratio * vMiddle));
    this.context.fill();
  }

});

},{"../dust-core.min.js":7,"../templates/action.js":18,"backbone":1,"jquery":3}],25:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var dust = require('../dust-core.min.js');
var tpl = require('../templates/display.js');

module.exports = Backbone.View.extend({
  el: '#display',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  render: function() {
    var self = this;
    dust.render('display', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  },

  silence: function() {
    this.render();
    this.$el.css('background-color', '#000000');
  },

  ident: function() {
    this.render();
    this.$el.css('background-color', '#ffffff');
    this.$el.append('<div class="attn">LOOK AT ME</div>');
  },

  allPositioned: function() {
    this.render();
    this.$el.css('background-color', '');
  }
});

},{"../dust-core.min.js":7,"../templates/display.js":19,"backbone":1,"jquery":3}],26:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
var _ = require('underscore');
Backbone.$ = $;

var tpl = require('../templates/logInstance.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  events: {
    "click .close": "remove"
  },

  el: '#logInstances',

  domID: function() {
    return '#logInstance'+this.model.cid;
  },

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  remove: function() {
    this.$el.children(this.domID()).remove();
    this.model.remove();
  },

  hide: function() {
    this.$el.children(this.domID()).hide();
  },

  render: function() {
    var self = this;
    dust.render('logInstance', _.extend({cid: self.model.cid}, self.model.attributes), function(err, out) {
      if (err) console.log(err);
      self.$el.append(out);
    });
  }
});

},{"../dust-core.min.js":7,"../templates/logInstance.js":20,"backbone":1,"jquery":3,"underscore":5}],27:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/logger.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  events: {
  },
  el: '#log',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  hide: function() {
    Backbone.$(this.$el).hide();
  },

  render: function() {
    var self = this;
    dust.render('logger', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  }
});

},{"../dust-core.min.js":7,"../templates/logger.js":21,"backbone":1,"jquery":3}],28:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/room.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  events: {
    "click .joinExisting": "join",
    "click .joinNew": "joinNew"
  },
  el: '#room',

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },

  join: function() {
    var roomID = prompt("Enter the name of the room to join", "room1");
    this.model.joinRoom(roomID);
  },

  joinNew: function() {
    this.model.joinRoom();
  },

  hide: function() {
    // somehow, $ is being stepped on
    Backbone.$(this.$el).hide();
  },

  render: function() {
    var self = this;
    dust.render('room', self.model.attributes, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
    });
  }
});

},{"../dust-core.min.js":7,"../templates/room.js":22,"backbone":1,"jquery":3}],29:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var tpl = require('../templates/sine.js');
var dust = require('../dust-core.min.js');

module.exports = Backbone.View.extend({
  initialize: function() {
    this.stopped = true;
    this.render();
  },

  render: function() {
    var self = this;
    dust.render('sine', {}, function(err, out) {
      if (err) console.log(err);
      self.$el.html(out);
      self.modified();
    });
  },

  stop: function() {
    this.stopped = true;
  },

  start: function() {
    this.stopped = false;
    this.animate();
  },

  changeWave: function(options) {
    this.animate(options);
  },

  modified: function() {
    var $canvas = this.$el.find(".sine");
    $canvas.attr('width', this.$el.width() - 100);
    var canvas = $canvas[0];
    var context = canvas.getContext('2d');
    context.strokeStyle = "#000000";
    context.lineJoin = 'round';
    context.lineWidth = 2;

    context.stash = {};
    context.save();
    context.stash.height = $canvas.height();
    context.stash.width = $canvas.width();
    context.stash.xAxis = context.stash.height/2;
    context.stash.yAxis = 0;
    this.context = context;
    if (this.stopped) {
      this.flatLine();
    } else {
      this.animate();
    }
  },

  flatLine: function() {
    var context = this.context;
    var config = context.stash;
    context.clearRect(0,0, config.width, config.height);
    context.beginPath();
    context.moveTo(config.yAxis, config.xAxis);
    context.lineTo(config.width, config.xAxis);
    context.stroke();
  },

  animateChord: function(options) {
    var context = this.context;
    var config = context.stash;
    var self = this;
    clearTimeout(this.timeout);

    context.strokeStyle = options.color;

    var freqs = [];
    for (var index = 0; index < options.freqs.length; index++) {
      if (options.freqs[index] != -1) freqs.push(options.freqs[index]);
    }
    console.log(freqs, length);
    var length = freqs.length;
    var height = config.height/length;

    function drawWaves(t) {
      context.clearRect(0,0, config.width, config.height);

      for (var index = 0; index < length; index++) {
        var freq = freqs[index];
        if (freq == -1) continue;
        var xaxis = (index+0.5) * height;
        var x = t;
        var y = options.mag * (Math.sin(4*x) * config.xAxis / length);
        context.beginPath();
        context.moveTo(config.yAxis+2, y + xaxis);

        for (var i = config.yAxis+2; i <= config.width; i += 4) {
          x = (freq/440) * (t + (i/100));
          y = options.mag * (Math.sin(4*x) * config.xAxis / length);
          context.lineTo(i, y+xaxis);
        }
        context.stroke();
      }

      self.timeout = setTimeout(function() {drawWaves(t+.4)}, 30);
    }
    drawWaves(0);
  },

  animate: function(options) {
    options = options || {};
    if (!options.color) options.color = "#000000";
    if (!options.freq) options.freq = 523;
    if (!options.mag) options.mag = 0.5;

    var context = this.context;
    var config = context.stash;
    var self = this;
    clearTimeout(this.timeout);

    context.strokeStyle = options.color;
    function drawWave(t) {
      context.clearRect(0,0, config.width, config.height);

      var x = t;
      var y = options.mag * (Math.sin(4*x) * config.xAxis);
      context.beginPath();
      context.moveTo(config.yAxis+2, y + config.xAxis);

      for (var i = config.yAxis+2; i <= config.width; i += 4) {
        x = (options.freq/523) * (t + (i/100));
        y = options.mag * (Math.sin(4*x) * config.xAxis);
        context.lineTo(i, y+config.xAxis);
      }

      context.stroke();

      self.timeout = setTimeout(function() {drawWave(t+.4)}, 30);
    }
    drawWave(0);
  }
});

},{"../dust-core.min.js":7,"../templates/sine.js":23,"backbone":1,"jquery":3}],30:[function(require,module,exports){
var $ = require('jquery')(window);
var Backbone = require('backbone');
Backbone.$ = $;

var timbre = require('../3rd/timbre.js');

module.exports = Backbone.View.extend({
  el: '#sounds',

  initialize: function() {
    this.listenTo(this.model, 'change:playing change:freqs change:freq change:magnitude', this.render);
    this.audios = [timbre("sin", {freq: 440, mul: 0.5})];
  },

  render: function() {
    if (this.model.get('chord')) {
      console.log('render sound with chord');
      this.wasChord = true;
      var tones = this.model.get('freqs');

      for (var i = 0; i < tones.length; i++) {
        if (tones[i] == -1) {
          if (this.audios[i]) this.audios[i].pause();
          continue;
        }
        if (!this.audios[i]) {
          this.audios[i] = timbre("sin", {freq: tones[i], mul: this.model.get('magnitude')});
        } else {
          this.audios[i].set({mul: this.model.get('magnitude'), freq: tones[i]});
        }
        if (this.model.get('playing')) {
          this.audios[i].play();
        } else {
          this.audios[i].pause();
        }
      }
    } else {
      console.log('render sound without chord');
      if (this.wasChord) {
        for (var i = 1; i < this.audios.length; i++) this.audios[i].pause();
        this.wasChord = undefined;
      }
      // switch the comments below to toggle sound
      this.audios[0].set({mul: this.model.get('magnitude'), freq: this.model.get('freq')});
      //this.audio.set({mul: 0.0, freq: this.model.get('freq')}); 
      if (this.model.get('playing')) {
        this.audios[0].play();
      } else {
        this.audios[0].pause();
      }
    }
  }
});

},{"../3rd/timbre.js":6,"backbone":1,"jquery":3}]},{},[8])