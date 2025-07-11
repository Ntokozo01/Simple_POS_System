async function downloadProductData() {
  const products = await getAllProducts(); // Use IndexedDB
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "products.json";
  a.click();

  URL.revokeObjectURL(url);
}

async function clearAllProducts() {
  if (confirm("Are you sure you want to delete all products?")) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        alert("All products cleared.");
        refreshProducts();
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  }
}

function toCSV(products) {
  if (!products.length) return '';
  const keys = Object.keys(products[0]);
  const escape = v => {
    const str = String(v ?? '');
    // Always quote string fields, leave numbers unquoted
    if (typeof v === 'number') {
      return str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };
  const rows = [
    keys.join(','),
    ...products.map(p => keys.map(k => escape(p[k])).join(','))
  ];
  return rows.join('\r\n');
}

function fromCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }
  
  const [header, ...dataLines] = lines;
  const keys = header.split(',').map(key => key.replace(/"/g, '').trim());
  
  return dataLines.map((line, index) => {
    if (!line.trim()) return null; // Skip empty lines
    
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && nextChar === '"') {
        // Handle escaped quotes
        currentValue += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        // End of field
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue.trim());
    
    // Create object from keys and values
    const obj = {};
    keys.forEach((key, i) => {
      let value = values[i] || '';
      
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      // Convert numeric values
      if (key === 'price' || key === 'quantity') {
        const numValue = parseFloat(value);
        value = isNaN(numValue) ? 0 : numValue;
      }
      
      obj[key] = value;
    });
    
    return obj;
  }).filter(item => item !== null); // Remove null entries
}

async function exportProductData(type) {
  const products = await getAllProducts();
  let blob, filename;
  if (type === 'csv') {
    blob = new Blob([toCSV(products)], { type: "text/csv" });
    filename = "products.csv";
  } else {
    blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    filename = "products.json";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      let importedProducts;
      if (ext === 'csv') {
        importedProducts = fromCSV(e.target.result);
      } else {
        importedProducts = JSON.parse(e.target.result);
      }
      if (!Array.isArray(importedProducts)) {
        alert("Invalid file format. Expected an array of products.");
        return;
      }
      
      let importedCount = 0;
      let skippedCount = 0;
      
      // Validate and fix product data before saving
      for (const product of importedProducts) {
        // Ensure required fields exist
        if (!product.id) {
          console.warn(`Product missing required 'id' field, skipping: ${JSON.stringify(product)}`);
          skippedCount++;
          continue;
        }
        if (!product.name) {
          console.warn(`Product missing required 'name' field, skipping: ${JSON.stringify(product)}`);
          skippedCount++;
          continue;
        }
        
        // Ensure numeric fields are properly typed
        let price = 0;
        if (product.price !== undefined && product.price !== null && product.price !== '') {
          price = parseFloat(product.price);
          if (isNaN(price)) {
            price = 0;
          }
        }
        
        // Ensure all required fields have default values
        const validatedProduct = {
          id: product.id.toString().trim(), // Ensure id is a string and trimmed
          name: (product.name || '').toString().trim(),
          category: (product.category || '').toString().trim(),
          price: price,
          description: (product.description || '').toString().trim(),
          stockItemId: (product.stockItemId || '').toString().trim()
        };
        
        // Only save if we have a valid id
        if (validatedProduct.id) {
          await saveProduct(validatedProduct);
          importedCount++;
        } else {
          skippedCount++;
        }
      }
      
      if (importedCount > 0) {
        alert(`Successfully imported ${importedCount} products.${skippedCount > 0 ? ` Skipped ${skippedCount} invalid products.` : ''}`);
        refreshProducts();
      } else {
        alert("No valid products found in the file.");
      }
    } catch (err) {
      console.error("Error parsing file:", err);
      alert(`Import failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

async function getAllDepletions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('product_stock_depletion', 'readonly');
    const store = tx.objectStore('product_stock_depletion');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function toCSVDepletions(depletions) {
  if (!depletions.length) return '';
  const keys = Object.keys(depletions[0]);
  const escape = v => {
    const str = String(v ?? '');
    if (typeof v === 'number') return str;
    return `"${str.replace(/"/g, '""')}"`;
  };
  const rows = [
    keys.join(','),
    ...depletions.map(d => keys.map(k => escape(d[k])).join(','))
  ];
  return rows.join('\r\n');
}

function fromCSVDepletions(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV file must have at least a header and one data row');
  const [header, ...dataLines] = lines;
  const keys = header.split(',').map(key => key.replace(/"/g, '').trim());
  return dataLines.map(line => {
    if (!line.trim()) return null;
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"' && nextChar === '"') {
        currentValue += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    const obj = {};
    keys.forEach((key, i) => {
      let value = values[i] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (key === 'depletionQuantity') value = parseFloat(value);
      obj[key] = value;
    });
    return obj;
  }).filter(item => item !== null);
}

async function exportDepletionData(type) {
  const depletions = await getAllDepletions();
  let blob, filename;
  if (type === 'csv') {
    blob = new Blob([toCSVDepletions(depletions)], { type: "text/csv" });
    filename = "product-stock-depletion.csv";
  } else {
    blob = new Blob([JSON.stringify(depletions, null, 2)], { type: "application/json" });
    filename = "product-stock-depletion.json";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleDepletionFileImport(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      let importedDepletions;
      if (ext === 'csv') {
        importedDepletions = fromCSVDepletions(e.target.result);
      } else {
        importedDepletions = JSON.parse(e.target.result);
      }
      if (!Array.isArray(importedDepletions)) {
        alert("Invalid file format. Expected an array of depletion mappings.");
        return;
      }
      let importedCount = 0;
      for (const dep of importedDepletions) {
        if (!dep.productId || !dep.stockItemId || isNaN(dep.depletionQuantity)) continue;
        await saveProductStockDepletion(dep);
        importedCount++;
      }
      alert(`Successfully imported ${importedCount} depletion mappings.`);
      refreshDepletions();
    } catch (err) {
      console.error("Error parsing file:", err);
      alert(`Import failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

async function clearAllDepletions() {
  if (confirm("Are you sure you want to delete all depletion mappings?")) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('product_stock_depletion', 'readwrite');
      const store = tx.objectStore('product_stock_depletion');
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        alert("All depletion mappings cleared.");
        refreshDepletions();
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  }
}

async function refreshDepletions() {
  const depletions = await getAllDepletions();
  const list = document.getElementById('depletionMappingsList');
  if (!list) return;
  list.innerHTML = '';
  if (depletions.length === 0) {
    list.innerHTML = '<p>No depletion mappings found.</p>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'sale-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product ID</th>
        <th>Stock Item ID</th>
        <th>Depletion Quantity</th>
      </tr>
    </thead>
    <tbody>
      ${depletions.map(dep => `
        <tr>
          <td>${dep.productId}</td>
          <td>${dep.stockItemId}</td>
          <td>${dep.depletionQuantity}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  list.appendChild(table);
}

