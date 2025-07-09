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
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    keys.join(','),
    ...products.map(p => keys.map(k => escape(p[k] ?? '')).join(','))
  ];
  return rows.join('\r\n');
}

function fromCSV(csv) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.map(line => {
    const values = [];
    let val = '', inQuotes = false;
    for (let i = 0, j = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') {
        val += '"'; i++;
      } else if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        values.push(val); val = '';
      } else {
        val += c;
      }
    }
    values.push(val);
    const obj = {};
    keys.forEach((k, i) => obj[k] = values[i]);
    return obj;
  });
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
      for (const product of importedProducts) {
        await saveProduct(product);
      }
      alert("Products imported successfully!");
      refreshProducts();
    } catch (err) {
      console.error("Error parsing file:", err);
      alert("Invalid or corrupted file.");
    }
  };
  reader.readAsText(file);
}

