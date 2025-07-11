/* js/storage.js using IndexedDB */

const DB_NAME = 'SimplePOS';
const DB_VERSION = 3; // Increment version for schema changes
const PRODUCTS_STORE = 'products';
const STOCK_ITEMS_STORE = 'stock_items';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function (e) {
      const db = e.target.result;
      
      // Create Products store
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        const productsStore = db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
        productsStore.createIndex('name', 'name', { unique: false });
        productsStore.createIndex('category', 'category', { unique: false });
        productsStore.createIndex('stockItemId', 'stockItemId', { unique: false });
      }
      
      // Create Stock Items store
      if (!db.objectStoreNames.contains(STOCK_ITEMS_STORE)) {
        const stockItemsStore = db.createObjectStore(STOCK_ITEMS_STORE, { keyPath: 'itemId' });
        stockItemsStore.createIndex('description', 'description', { unique: false });
      }
      
      // Create Product Stock Depletion store
      if (!db.objectStoreNames.contains('product_stock_depletion')) {
        db.createObjectStore('product_stock_depletion', { keyPath: ['productId', 'stockItemId'] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Stock Items functions
async function getAllStockItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_ITEMS_STORE, 'readonly');
    const store = tx.objectStore(STOCK_ITEMS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveStockItem(stockItem) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_ITEMS_STORE, 'readwrite');
    const store = tx.objectStore(STOCK_ITEMS_STORE);
    store.put(stockItem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStockItemById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_ITEMS_STORE, 'readonly');
    const store = tx.objectStore(STOCK_ITEMS_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteStockItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_ITEMS_STORE, 'readwrite');
    const store = tx.objectStore(STOCK_ITEMS_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Modified Products functions
async function getAllProducts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTS_STORE, 'readonly');
    const store = tx.objectStore(PRODUCTS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveProduct(product) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
    const store = tx.objectStore(PRODUCTS_STORE);
    store.put(product);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getProductById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTS_STORE, 'readonly');
    const store = tx.objectStore(PRODUCTS_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteProduct(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
    const store = tx.objectStore(PRODUCTS_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Get product with stock information
async function getProductWithStock(productId) {
  const product = await getProductById(productId);
  if (product && product.stockItemId) {
    const stockItem = await getStockItemById(product.stockItemId);
    return { ...product, stockItem };
  }
  return product;
}

// Update stock quantity when sale is made
async function updateStockQuantity(itemId, depletionAmount) {
  const stockItem = await getStockItemById(itemId);
  if (stockItem) {
    stockItem.quantity -= depletionAmount;
    await saveStockItem(stockItem);
  }
}

async function saveProductStockDepletion(depletion) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('product_stock_depletion', 'readwrite');
    const store = tx.objectStore('product_stock_depletion');
    store.put(depletion);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getDepletionsByProductId(productId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('product_stock_depletion', 'readonly');
    const store = tx.objectStore('product_stock_depletion');
    const req = store.getAll();
    req.onsuccess = () => {
      resolve(req.result.filter(d => d.productId === productId));
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteProductStockDepletion(productId, stockItemId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('product_stock_depletion', 'readwrite');
    const store = tx.objectStore('product_stock_depletion');
    const req = store.delete([productId, stockItemId]);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
