async function renderStockItems(stockItems) {
  const list = document.getElementById('stockItemsList');
  list.innerHTML = '';
  if (stockItems.length === 0) {
    list.innerHTML = '<p>No stock items found.</p>';
    return;
  }

  stockItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'product-card';
    div.innerHTML = `
      <h3>${item.description}</h3>
      <p><strong>Item ID:</strong> ${item.itemId}</p>
      <ul class="stock-list">
        <li><strong>Quantity:</strong> ${Number(item.quantity).toFixed(2)} main unit${item.quantity !== 1 ? 's' : ''}</li>
        <li><strong>Sub-units per Item:</strong> ${item.subUnitCount} ${item.unitName || 'unit'}${item.subUnitCount !== 1 ? 's' : ''} per main unit</li>
        <li><strong>Total Sub-units:</strong> ${item.totalUnits} ${item.unitName || 'unit'}${item.totalUnits !== 1 ? 's' : ''}</li>
      </ul>
      <div style="margin-top:10px;">
        <button onclick="editStockItem('${item.itemId}')">Edit</button>
        <button onclick="deleteStockItemHandler('${item.itemId}')">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

async function refreshStockItems() {
  const query = document.getElementById('stockSearchInput')?.value.toLowerCase() || '';
  const allStockItems = await getAllStockItems();
  const filtered = query
    ? allStockItems.filter(item =>
        item.itemId.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    : allStockItems;
  renderStockItems(filtered);
}

// Add event listener for stock search input
document.addEventListener('DOMContentLoaded', () => {
  const stockSearchInput = document.getElementById('stockSearchInput');
  if (stockSearchInput) {
    stockSearchInput.addEventListener('input', async function () {
      const query = this.value.toLowerCase();
      const allStockItems = await getAllStockItems();
      const filtered = query
        ? allStockItems.filter(item =>
            item.itemId.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
          )
        : allStockItems;
      renderStockItems(filtered);
    });
  }
});

async function deleteStockItemHandler(itemId) {
  // Check if any products are using this stock item
  const allProducts = await getAllProducts();
  const linkedProducts = allProducts.filter(product => product.stockItemId === itemId);
  
  if (linkedProducts.length > 0) {
    const productNames = linkedProducts.map(p => p.name).join(', ');
    alert(`Cannot delete this stock item. It is linked to the following products: ${productNames}`);
    return;
  }

  if (confirm('Are you sure you want to delete this stock item?')) {
    await deleteStockItem(itemId);
    refreshStockItems();
  }
}

function editStockItem(itemId) {
  window.location.href = `stockItem.html?id=${itemId}`;
}

// Export stock items data
async function exportStockData(type) {
  const stockItems = await getAllStockItems();
  let blob, filename;
  if (type === 'csv') {
    blob = new Blob([toCSV(stockItems)], { type: "text/csv" });
    filename = "stock-items.csv";
  } else {
    blob = new Blob([JSON.stringify(stockItems, null, 2)], { type: "application/json" });
    filename = "stock-items.json";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Clear all stock items
async function clearAllStockItems() {
  if (confirm("Are you sure you want to delete all stock items?")) {
    // Check if any products are using stock items
    const allProducts = await getAllProducts();
    const linkedProducts = allProducts.filter(product => product.stockItemId);
    
    if (linkedProducts.length > 0) {
      alert("Cannot delete all stock items. Some products are linked to stock items. Please remove the links first.");
      return;
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STOCK_ITEMS_STORE, 'readwrite');
      const store = tx.objectStore(STOCK_ITEMS_STORE);
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        alert("All stock items cleared.");
        refreshStockItems();
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  }
}

// Import stock items from file
async function handleStockFileImport(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      let importedStockItems;
      if (ext === 'csv') {
        importedStockItems = fromCSV(e.target.result);
      } else {
        importedStockItems = JSON.parse(e.target.result);
      }
      if (!Array.isArray(importedStockItems)) {
        alert("Invalid file format. Expected an array of stock items.");
        return;
      }
      for (const stockItem of importedStockItems) {
        await saveStockItem(stockItem);
      }
      alert("Stock items imported successfully!");
      refreshStockItems();
    } catch (err) {
      console.error("Error parsing file:", err);
      alert("Invalid or corrupted file.");
    }
  };
  reader.readAsText(file);
}

async function migrateStockItems() {
  const allStockItems = await getAllStockItems();
  let changed = false;
  for (const item of allStockItems) {
    let needsUpdate = false;
    // Default subUnitCount to 1 if missing
    if (typeof item.subUnitCount !== 'number' || isNaN(item.subUnitCount) || item.subUnitCount < 1) {
      item.subUnitCount = 1;
      needsUpdate = true;
    }
    // Default unitName if missing
    if (!item.unitName) {
      item.unitName = "unit";
      needsUpdate = true;
    }
    // Calculate totalUnits if missing
    if (typeof item.totalUnits !== 'number' || isNaN(item.totalUnits)) {
      item.totalUnits = (item.quantity || 0) * item.subUnitCount;
      needsUpdate = true;
    }
    // Calculate quantity if missing or out of sync
    const correctQuantity = item.totalUnits / item.subUnitCount;
    if (typeof item.quantity !== 'number' || isNaN(item.quantity) || Math.abs(item.quantity - correctQuantity) > 0.0001) {
      item.quantity = correctQuantity;
      needsUpdate = true;
    }
    if (needsUpdate) {
      await saveStockItem(item);
      changed = true;
    }
  }
  if (changed) {
    console.log("Stock items migrated to new structure.");
  }
}

// Call this at the top of your DOMContentLoaded or page load logic:
document.addEventListener('DOMContentLoaded', migrateStockItems);