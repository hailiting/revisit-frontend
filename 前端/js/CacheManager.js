
class CacheManager {
  constructor() {
    this.version = Date.now();
  }

  // 清除特定的 Cache Storage
  async clearCacheStorage(cacheName) {
    try {
      await caches.delete(cacheName);
      return true;
    } catch (err) {
      console.error(`Failed to clear cache ${cacheName}:`, err);
      return false;
    }
  }

  // 清除所有 Cache Storage
  async clearAllCacheStorage() {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      return true;
    } catch (err) {
      console.error('Failed to clear all caches:', err);
      return false;
    }
  }

  // 注销 Service Worker
  async unregisterServiceWorkers() {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        return true;
      } catch (err) {
        console.error('Failed to unregister service workers:', err);
        return false;
      }
    }
    return false;
  }

  // 更新资源版本
  updateResourceVersion() {
    const resources = [
      ...document.querySelectorAll('link[rel="stylesheet"]'),
      ...document.querySelectorAll('script[src]'),
      ...document.querySelectorAll('img[src]')
    ];

    resources.forEach(resource => {
      const urlAttribute = resource.src ? 'src' : 'href';
      const currentUrl = resource[urlAttribute];
      resource[urlAttribute] = this.addVersionQuery(currentUrl);
    });
  }

  // 添加版本查询参数
  addVersionQuery(url) {
    const urlObj = new URL(url, window.location.href);
    urlObj.searchParams.set('v', this.version);
    return urlObj.href;
  }

  // 清除 localStorage
  clearLocalStorage() {
    try {
      localStorage.clear();
      return true;
    } catch (err) {
      console.error('Failed to clear localStorage:', err);
      return false;
    }
  }

  // 清除 sessionStorage
  clearSessionStorage() {
    try {
      sessionStorage.clear();
      return true;
    } catch (err) {
      console.error('Failed to clear sessionStorage:', err);
      return false;
    }
  }

  // 清除所有缓存
  async clearAll() {
    const results = await Promise.all([
      this.clearAllCacheStorage(),
      this.unregisterServiceWorkers(),
      this.clearLocalStorage(),
      this.clearSessionStorage()
    ]);

    this.updateResourceVersion();

    // 如果需要，强制刷新页面
    if (results.every(Boolean)) {
      window.location.reload(true);
    }
  }

  // 清除特定类型的缓存
  async clearSpecific(options = {}) {
    const {
      cacheStorage = false,
      serviceWorkers = false,
      localStorage = false,
      sessionStorage = false,
      resourceVersion = false,
      reload = false
    } = options;

    const tasks = [];

    if (cacheStorage) tasks.push(this.clearAllCacheStorage());
    if (serviceWorkers) tasks.push(this.unregisterServiceWorkers());
    if (localStorage) tasks.push(this.clearLocalStorage());
    if (sessionStorage) tasks.push(this.clearSessionStorage());

    await Promise.all(tasks);

    if (resourceVersion) {
      this.updateResourceVersion();
    }

    if (reload) {
      window.location.reload(true);
    }
  }
}

// 使用示例
const cacheManager = new CacheManager();

// 清除所有缓存
cacheManager.clearAll();

// 清除特定类型的缓存
cacheManager.clearSpecific({
  cacheStorage: true,
  localStorage: true,
  resourceVersion: true,
  reload: true
});