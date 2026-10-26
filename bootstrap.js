var controller;

async function startup({ rootURI }) {
  await Zotero.initializationPromise;
  const scope = { Zotero };
  Services.scriptloader.loadSubScript(rootURI + 'src/filter.js', scope);
  controller = new scope.SettingsSyncFilter(Zotero);
  controller.start();
  for (const window of Zotero.getMainWindows()) controller.refresh(window);
}

function onMainWindowLoad({ window }) {
  controller?.refresh(window);
}

function onMainWindowUnload({ window }) {
  controller?.cancelRefresh(window);
}

function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) return;
  controller?.stop();
  controller = undefined;
}

function install() {}
function uninstall() {}
