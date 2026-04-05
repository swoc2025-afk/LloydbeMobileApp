(function () {
  if (window.__lloydbeUserScopePatched) {
    return;
  }
  window.__lloydbeUserScopePatched = true;
  var RESET_MARKER_KEY = '__lloydbe_storage_reset_v2';
  var RESET_MARKER_VALUE = 'done';

  try {
    if (localStorage.getItem(RESET_MARKER_KEY) !== RESET_MARKER_VALUE) {
      var keysToClear = [];
      for (var idx = 0; idx < localStorage.length; idx += 1) {
        var storageKey = localStorage.key(idx);
        if (storageKey && storageKey.indexOf('lloydbe') === 0) {
          keysToClear.push(storageKey);
        }
      }
      keysToClear.forEach(function (key) {
        localStorage.removeItem(key);
      });
      localStorage.setItem(RESET_MARKER_KEY, RESET_MARKER_VALUE);
    }
  } catch (resetError) {
    // Ignore storage reset errors and continue with normal app flow.
  }

  var CURRENT_USER_KEY = 'lloydbeCurrentUserV1';
  var TAG_KEY = 'lloydbeLloydsTagV1';
  var REGISTRY_KEY = 'lloydbeTagRegistryV1';
  var SCOPE_SEPARATOR = '::user::';

  var GLOBAL_KEYS = {
    lloydbeCurrentUserV1: true,
    lloydbeAuthCredentialV1: true,
    lloydbeAuthAttemptsV1: true,
    lloydbeLastSignupUsernameV1: true,
    lloydbeSmsApiUrl: true,
    lloydbeApiBaseUrl: true,
    lloydbeSignupVerificationV1: true,
    lloydbeTagRegistryV1: true
  };

  var rawGetItem = localStorage.getItem.bind(localStorage);
  var rawSetItem = localStorage.setItem.bind(localStorage);
  var rawRemoveItem = localStorage.removeItem.bind(localStorage);

  function getCurrentUser() {
    try {
      return String(rawGetItem(CURRENT_USER_KEY) || '').trim().toLowerCase();
    } catch (error) {
      return '';
    }
  }

  function isLloydbeKey(key) {
    return typeof key === 'string' && key.indexOf('lloydbe') === 0;
  }

  function shouldScopeKey(key) {
    if (!isLloydbeKey(key)) {
      return false;
    }
    if (GLOBAL_KEYS[key]) {
      return false;
    }
    if (key.indexOf(SCOPE_SEPARATOR) !== -1) {
      return false;
    }
    return true;
  }

  function toScopedKey(key, user) {
    if (!shouldScopeKey(key)) {
      return key;
    }
    var owner = user || getCurrentUser();
    if (!owner) {
      return key;
    }
    return key + SCOPE_SEPARATOR + owner;
  }

  function normalizeTag(value) {
    return String(value || '').trim().replace(/^@+/, '').toLowerCase();
  }

  function rebuildGlobalTagRegistry() {
    var seen = {};
    var registry = {};
    var prefix = TAG_KEY + SCOPE_SEPARATOR;
    var suffixLength = prefix.length;

    for (var i = 0; i < localStorage.length; i += 1) {
      var key = localStorage.key(i);
      if (!key || key.indexOf(prefix) !== 0) {
        continue;
      }

      var owner = key.slice(suffixLength).trim().toLowerCase();
      if (!owner) {
        continue;
      }

      var tag = normalizeTag(rawGetItem(key));
      if (!tag) {
        continue;
      }

      if (seen[tag]) {
        // Duplicate nickname: keep first owner, clear later owner's tag.
        rawRemoveItem(key);
        continue;
      }

      seen[tag] = owner;
      registry[tag] = owner;
    }

    rawSetItem(REGISTRY_KEY, JSON.stringify(registry));
  }

  function migrateGlobalToScoped(keys) {
    var owner = getCurrentUser();
    if (!owner || !Array.isArray(keys)) {
      return;
    }

    keys.forEach(function (key) {
      if (!shouldScopeKey(key)) {
        return;
      }
      var scoped = toScopedKey(key, owner);
      if (rawGetItem(scoped) !== null) {
        return;
      }
      var globalValue = rawGetItem(key);
      if (globalValue === null) {
        return;
      }
      rawSetItem(scoped, globalValue);
      rawRemoveItem(key);
    });
  }

  localStorage.getItem = function (key) {
    var scopedKey = toScopedKey(key);
    if (scopedKey !== key) {
      return rawGetItem(scopedKey);
    }
    return rawGetItem(key);
  };

  localStorage.setItem = function (key, value) {
    var scopedKey = toScopedKey(key);
    if (scopedKey !== key) {
      rawSetItem(scopedKey, value);
      return;
    }
    rawSetItem(key, value);
  };

  localStorage.removeItem = function (key) {
    var scopedKey = toScopedKey(key);
    if (scopedKey !== key) {
      rawRemoveItem(scopedKey);
      return;
    }
    rawRemoveItem(key);
  };

  rebuildGlobalTagRegistry();

  window.LloydbeUserScope = {
    migrateGlobalToScoped: migrateGlobalToScoped,
    toScopedKey: toScopedKey,
    getCurrentUser: getCurrentUser
  };
})();
