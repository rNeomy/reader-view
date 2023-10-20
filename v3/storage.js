class Storage {
  prepare() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('content-temporary-storage', 1);

      request.onerror = e => {
        reject(e.message);
        console.warn(e);
      };
      request.onupgradeneeded = e => {
        const db = e.target.result;

        const objectStore = db.createObjectStore('storage', {
          keyPath: 'id'
        });
        objectStore.createIndex('id', 'id', {unique: true});

        objectStore.transaction.oncomplete = () => {
          resolve(db);
        };
      };
      request.onsuccess = e => {
        const db = e.target.result;

        resolve(db);
      };
    });
  }
  async set(id, content) {
    const db = await this.prepare();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage'], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = e => reject(e.message);

      const objectStore = transaction.objectStore('storage');
      objectStore.put({
        id,
        content
      });
    });
  }
  async get(id) {
    const db = await this.prepare();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['storage']);
      const objectStore = transaction.objectStore('storage');
      const request = objectStore.get(id);
      request.onerror = e => reject(e.message);
      request.onsuccess = () => resolve(request.result);
    });
  }
  async delete(id) {
    const db = await this.prepare();
    db.transaction(['storage'], 'readwrite').objectStore('storage').delete(id);
  }
  clean() {
    indexedDB.deleteDatabase('content-temporary-storage');
  }
}

// http://add0n.com/chrome-reader-view.html#IDComment1116657737
const storage = new Storage();

const aStorage = {
  cache: {},
  ids: {},
  set(id, content) {
    return storage.set(id, content).catch(e => {
      console.warn(e);

      aStorage.cache[id] = content;

      return Promise.resolve();
    });
  },
  get(id) {
    return storage.get(id).then(o => o?.content).catch(e => {
      console.warn(e);

      clearTimeout(aStorage.ids[id]);
      aStorage.ids[id] = setTimeout(() => delete aStorage.cache[id], 120 * 1000);
      return aStorage.cache[id] || false;
    });
  },
  delete(id) {
    storage.delete(id);

    clearTimeout(aStorage.ids[id]);
    delete aStorage.ids[id];
    delete aStorage.cache[id];
  }
};

// delete stored article
chrome.tabs.onRemoved.addListener(id => aStorage.delete(id));
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.cmd === 'closed') {
    aStorage.delete(sender.tab.id);
  }
});

chrome.runtime.onStartup.addListener(storage.clean);
chrome.runtime.onInstalled.addListener(storage.clean);
