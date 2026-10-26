/* global Zotero */
// Only view queries are wrapped. Never save collections, items, or searches.
var SettingsSyncFilter = class SettingsSyncFilter {
  constructor(zotero) {
    this.z = zotero;
    this.active = false;
    this.patches = [];
    this.timers = new Map();
  }

  applies(row) {
    return this.active
      && row.ref?.libraryID === this.z.Libraries.userLibraryID
      && (row.type === 'library' || row.type === 'recentlyRead');
  }

  collections() {
    // recursive=true finds matching collections even if moved under another collection.
    return this.z.Collections.getByLibrary(this.z.Libraries.userLibraryID, true)
      .filter(c => !c.deleted && c.name === '[SettingsSync] DO NOT DELETE');
  }

  patch(target, name, makeWrapper) {
    const original = target[name];
    if (typeof original !== 'function') throw new Error(`Zotero Except: missing ${name}`);
    const wrapper = makeWrapper(original);
    target[name] = wrapper;
    this.patches.push({ target, name, original, wrapper });
  }

  start() {
    if (this.active) return;
    this.active = true;
    const owner = this;
    try {
      const proto = this.z.CollectionTreeRow.prototype;
      this.patch(proto, 'getSearchObject', original => async function (...args) {
        const base = await original.apply(this, args);
        if (!owner.applies(this)) return base;
        try {
          const collections = owner.collections();
          if (!collections.length) return base;
          // A separate AND scope preserves quick-search/advanced-search OR conditions
          // and leaves Zotero's cached original search untouched.
          const search = new owner.z.Search();
          search.libraryID = this.ref.libraryID;
          search.setScope(base);
          search.addCondition('recursive', 'true');
          search.addCondition('includeChildren', 'true');
          for (const collection of collections) {
            // This new scope uses AND by default. Zotero 10 removed the fourth
            // `required` argument; passing true now throws instead of filtering.
            search.addCondition('collection', 'isNot', collection.key);
          }
          // A filter failure must never hide the entire library. Catch query-time
          // failures too, not just errors while constructing its conditions.
          const run = search.search;
          search.search = async function (...searchArgs) {
            try { return await run.apply(this, searchArgs); }
            catch (error) {
              owner.z.logError(error);
              return base.search(...searchArgs);
            }
          };
          return search;
        }
        catch (error) {
          owner.z.logError(error);
          return base;
        }
      });
      // Native incremental item additions otherwise bypass the search entirely.
      this.patch(proto, 'isSearchMode', original => function (...args) {
        try {
          if (owner.applies(this) && owner.collections().length > 0) return true;
        }
        catch (error) { owner.z.logError(error); }
        return original.apply(this, args);
      });
      this.observerID = this.z.Notifier.registerObserver({
        notify: (event, type) => {
          if (!this.active || !['add', 'modify', 'delete', 'remove', 'trash', 'refresh'].includes(event)) return;
          for (const window of this.z.getMainWindows()) this.refresh(window);
        }
      }, ['collection', 'collection-item', 'item'], 'zotero-except');
    }
    catch (error) {
      this.stop();
      throw error;
    }
  }

  refresh(window) {
    this.cancelRefresh(window);
    if (window.closed) return;
    // Run outside the notifier transaction to avoid waiting on its own item-tree lock.
    const timer = window.setTimeout(async () => {
      this.timers.delete(window);
      if (window.closed) return;
      const tree = window.ZoteroPane?.itemsView;
      const rows = tree?.collectionTreeRows || [tree?.collectionTreeRow].filter(Boolean);
      if (!tree || !rows.some(row => row.ref?.libraryID === this.z.Libraries.userLibraryID
        && ['library', 'recentlyRead'].includes(row.type))) return;
      try {
        for (const row of rows) row.clearCache?.();
        // Zotero 7/8 use a shared cache; newer versions use per-row caches.
        this.z.CollectionTreeCache?.clear?.();
        await tree.refreshAndMaintainSelection();
      }
      catch (error) { this.z.logError(error); }
    }, 80);
    this.timers.set(window, timer);
  }

  cancelRefresh(window) {
    if (!this.timers.has(window)) return;
    window.clearTimeout(this.timers.get(window));
    this.timers.delete(window);
  }

  stop() {
    this.active = false;
    if (this.observerID !== undefined) {
      this.z.Notifier.unregisterObserver(this.observerID);
      this.observerID = undefined;
    }
    for (const window of this.timers.keys()) this.cancelRefresh(window);
    for (const { target, name, original, wrapper } of this.patches.reverse()) {
      // Preserve wrappers installed later by other plugins. Our retained wrapper
      // becomes a pass-through when inactive.
      if (target[name] === wrapper) target[name] = original;
    }
    this.patches = [];
    for (const window of this.z.getMainWindows()) this.refresh(window);
  }
};
