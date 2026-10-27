const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { findArchive, readArchive } = require('../scripts/zotero-archive.cjs');

function fixture() {
  const collections = [{ id: 10, key: 'SYNC0001', name: '[SettingsSync] DO NOT DELETE' }];
  const base = { unchanged: true };
  class Row {
    constructor(type = 'library', libraryID = 1) { this.type = type; this.ref = { libraryID }; }
    async getSearchObject(...args) { this.args = args; return base; }
    isSearchMode() { return this.type === 'search'; }
  }
  class Search {
    constructor() { this.conditions = []; }
    setScope(scope) { this.scope = scope; }
    addCondition(...condition) { this.conditions.push(condition); }
  }
  let observer, registered = 0;
  const windows = [], errors = [];
  const z = {
    CollectionTreeRow: Row, Search,
    Libraries: { userLibraryID: 1 },
    Collections: { getByLibrary: () => collections },
    Notifier: {
      registerObserver(o) { observer = o; registered++; return 0; },
      unregisterObserver(id) { assert.equal(id, 0); registered--; }
    },
    getMainWindows: () => windows,
    logError: error => errors.push(error)
  };
  const scope = {};
  vm.runInNewContext(fs.readFileSync('src/filter.js', 'utf8'), scope);
  const filter = new scope.SettingsSyncFilter(z);
  return { filter, Row, base, collections, windows, z, errors, get observer() { return observer; }, get registered() { return registered; } };
}

test('both target views get an independent exclusion scope, preserving original search and options', async () => {
  const f = fixture(); f.filter.start();
  for (const type of ['library', 'recentlyRead']) {
    const row = new f.Row(type);
    const options = { unfiltered: true };
    const search = await row.getSearchObject(options);
    assert.equal(search.scope, f.base);
    assert.equal(row.args[0], options);
    assert.equal(search.libraryID, 1);
    assert.deepEqual(search.conditions, [
      ['recursive', 'true'], ['includeChildren', 'true'],
      ['collection', 'isNot', 'SYNC0001']
    ]);
    assert.equal(row.isSearchMode(), true);
    assert.notEqual(await row.getSearchObject(), search);
  }
  assert.deepEqual(f.base, { unchanged: true });
});

test('direct collection access, saved searches, trash, and other libraries are unchanged', async () => {
  const f = fixture(); f.filter.start();
  for (const row of [new f.Row('collection'), new f.Row('search'), new f.Row('trash'), new f.Row('library', 2), new f.Row('recentlyRead', 2)]) {
    assert.equal(await row.getSearchObject(), f.base);
    assert.equal(row.isSearchMode(), row.type === 'search');
  }
});

test('exact matching, deleted collections, multiple matches, and rename are handled dynamically', async () => {
  const f = fixture(); f.filter.start();
  f.collections.push({ key: 'SIMILAR', name: '[SettingsSync] DO NOT DELETE copy' });
  f.collections.push({ key: 'DELETED', name: '[SettingsSync] DO NOT DELETE', deleted: true });
  f.collections.push({ key: 'SYNC0002', name: '[SettingsSync] DO NOT DELETE' });
  const row = new f.Row();
  assert.deepEqual((await row.getSearchObject()).conditions.filter(c => c[0] === 'collection').map(c => c[2]), ['SYNC0001', 'SYNC0002']);
  f.collections[0].name = 'Renamed'; f.collections.pop();
  assert.equal(await row.getSearchObject(), f.base);
  assert.equal(row.isSearchMode(), false);
});

test('shutdown restores originals and unregisters even observer ID zero', async () => {
  const f = fixture(); const original = f.Row.prototype.getSearchObject;
  f.filter.start(); f.filter.start(); assert.equal(f.registered, 1);
  f.filter.stop(); assert.equal(f.registered, 0);
  assert.equal(f.Row.prototype.getSearchObject, original);
});

test('shutdown preserves a later plugin wrapper and makes retained wrapper inert', async () => {
  const f = fixture(); f.filter.start();
  const previous = f.Row.prototype.getSearchObject;
  const later = async function (...args) { return previous.apply(this, args); };
  f.Row.prototype.getSearchObject = later;
  f.filter.stop();
  assert.equal(f.Row.prototype.getSearchObject, later);
  assert.equal(await new f.Row().getSearchObject(), f.base);
});

test('collection changes debounce refresh, clear cached results, and restore display on disable', async () => {
  const f = fixture(); let task, refreshes = 0, clears = 0;
  const row = new f.Row(); row.clearCache = () => clears++;
  const window = {
    setTimeout(fn) { task = fn; return 1; }, clearTimeout() { task = null; },
    ZoteroPane: { itemsView: { collectionTreeRows: [row], async refreshAndMaintainSelection() { refreshes++; } } }
  };
  f.windows.push(window); f.filter.start();
  f.observer.notify('add', 'collection-item');
  f.observer.notify('modify', 'collection');
  await task(); assert.equal(refreshes, 1); assert.equal(clears, 1);
  f.filter.stop(); await task(); assert.equal(refreshes, 2);
  f.filter.refresh(window); f.filter.cancelRefresh(window); assert.equal(task, null);
});

test('collection discovery or condition construction errors fall back to the original view', async () => {
  const f = fixture(); f.filter.start();
  f.z.Collections.getByLibrary = () => { throw new Error('collection unavailable'); };
  const row = new f.Row();
  assert.equal(await row.getSearchObject(), f.base);
  assert.equal(row.isSearchMode(), false);
  assert.equal(f.errors.length, 2);
  f.z.Collections.getByLibrary = () => f.collections;
  f.z.Search.prototype.addCondition = () => { throw new Error('unsupported condition'); };
  assert.equal(await row.getSearchObject(), f.base);
});

test('query execution failures fall back with the original arguments; successful queries remain filtered', async () => {
  const f = fixture(); f.filter.start();
  f.z.Search.prototype.search = async () => [12];
  assert.deepEqual(await (await new f.Row().getSearchObject()).search(), [12]);
  f.z.Search.prototype.search = async () => { throw new Error('SQL failed'); };
  let received;
  f.base.search = async (...args) => { received = args; return [12, 34]; };
  assert.deepEqual(await (await new f.Row().getSearchObject()).search(true), [12, 34]);
  assert.deepEqual(received, [true]);
  assert.equal(f.errors.length, 1);
});

const archive = findArchive('app');
test('installed Zotero addCondition reproduces 1.0.1 error and accepts the fixed plugin in both views',
  { skip: !archive && 'No local Zotero app archive found' }, async () => {
    const source = readArchive(archive, 'chrome/content/zotero/xpcom/data/search.js');
    const start = source.indexOf('Zotero.Search.prototype.addCondition = function');
    const end = source.indexOf('\n};', start) + 3;
    assert.ok(start >= 0 && end > start);
    const f = fixture();
    // Use Zotero's shipped method verbatim, with only its data-object storage
    // and condition metadata supplied by a small fixture (no database writes).
    f.z.SearchConditions = {
      hasOperator: (condition, operator) => ({ recursive: ['true'], includeChildren: ['true'], collection: ['isNot'] })[condition]?.includes(operator),
      parseCondition: condition => [condition, false]
    };
    f.z.Search = class {
      constructor() { this._conditions = {}; this._maxSearchConditionID = -1; this._changed = {}; }
      _requireData() {}
      _markFieldChange() {}
      setScope(scope) { this.scope = scope; }
    };
    vm.runInNewContext(source.slice(start, end), { Zotero: f.z });
    assert.throws(() => new f.z.Search().addCondition('collection', 'isNot', 'SYNC0001', true), /required.*no longer supported/);
    f.filter.start();
    for (const type of ['library', 'recentlyRead']) {
      const search = await new f.Row(type).getSearchObject();
      assert.notEqual(search, f.base);
      const conditions = Object.values(search._conditions);
      assert.equal(conditions.length, 3);
      assert.equal(conditions[2].condition, 'collection');
      assert.equal(conditions[2].operator, 'isNot');
      assert.equal(conditions[2].value, 'SYNC0001');
    }
    assert.equal(f.errors.length, 0);
  });
