// Sale logic for handling purchases

let saleItems = [];
let selectedProductForSale = null;

document.addEventListener('DOMContentLoaded', () => {
  const saleSearchInput = document.getElementById('saleSearchInput');
  if (saleSearchInput) {
    saleSearchInput.addEventListener('input', searchProductsForSale);
  }
});

function clearSaleSearch() {
  document.getElementById('saleSearchInput').value = '';
  document.getElementById('saleSearchResults').innerHTML = '';
  selectedProductForSale = null;
}

// Modified search: no quantity input, only select button
async function searchProductsForSale() {
  const query = document.getElementById('saleSearchInput').value.toLowerCase();
  const allProducts = await getAllProducts();
  const filtered = query
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      )
    : [];
  const resultsDiv = document.getElementById('saleSearchResults');
  resultsDiv.innerHTML = '';

  if (filtered.length === 0) {
    resultsDiv.innerHTML = '<p>No products found.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'sale-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product ID</th>
        <th>Category</th>
        <th>Name</th>
        <th>Description</th>
        <th>Price</th>
        <th>Stock</th>
        <th>Select</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  
  for (const product of filtered) {
    const maxSellable = await getProductMaxSellableQuantity(product.id);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Product ID">${product.id}</td>
      <td data-label="Category">${product.category}</td>
      <td data-label="Name">${product.name}</td>
      <td data-label="Description">${product.description || ''}</td>
      <td data-label="Price">R${product.price}</td>
      <td data-label="Stock">${maxSellable}</td>
      <td data-label="Select">
        ${
          maxSellable > 0
            ? `<button onclick="selectProductForSale('${product.id}')">Select</button>`
            : `<span style="color:#e74c3c;font-weight:bold;">Out of Stock</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  }
  resultsDiv.appendChild(table);
}

// Show popup on select
async function selectProductForSale(id) {
  selectedProductForSale = id;
  const product = await getProductById(id);
  if (!product) return;

  const maxSellable = await getProductMaxSellableQuantity(product.id);

  document.getElementById('popupProductName').innerText = `${product.name} (Stock: ${maxSellable})`;
  const qtyInput = document.getElementById('popupProductQty');
  qtyInput.value = 1;
  qtyInput.max = maxSellable;
  qtyInput.min = 1;
  document.getElementById('saleAddPopup').style.display = 'flex';
}

function closeSalePopup() {
  document.getElementById('saleAddPopup').style.display = 'none';
  selectedProductForSale = null;
}

// Add to sale from popup
async function addSelectedProductToSale() {
  if (!selectedProductForSale) {
    alert('Please select a product first.');
    return;
  }
  const product = await getProductById(selectedProductForSale);
  if (!product) {
    alert('Product not found.');
    return;
  }

  const maxSellable = await getProductMaxSellableQuantity(product.id);

  const qtyInput = document.getElementById('popupProductQty');
  const qty = parseInt(qtyInput.value);
  if (isNaN(qty) || qty < 1) {
    alert('Please enter a valid quantity.');
    return;
  }
  if (qty > maxSellable) {
    alert('Cannot sell more than available stock.');
    return;
  }

  // Check if already in sale
  const existing = saleItems.find(item => item.id === product.id);
  if (existing) {
    if (existing.quantity + qty > maxSellable) {
      alert('Not enough stock.');
      return;
    }
    existing.quantity += qty;
  } else {
    saleItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      maxQuantity: maxSellable
    });
  }
  selectedProductForSale = null;
  closeSalePopup();
  renderSaleItems();
}

function renderSaleItems() {
  const saleDiv = document.getElementById('saleItems');
  saleDiv.innerHTML = '';
  let total = 0;
  saleItems.forEach(item => {
    total += item.price * item.quantity;
    const div = document.createElement('div');
    div.innerHTML = `
      ${item.name} - R${item.price} x ${item.quantity}
      <button onclick="removeSaleItem('${item.id}')">Remove</button>
    `;
    saleDiv.appendChild(div);
  });
  document.getElementById('saleTotal').innerText = total.toFixed(2);
}

function removeSaleItem(id) {
  saleItems = saleItems.filter(item => item.id !== id);
  renderSaleItems();
}

// Update the completeSale function to use linked stock
async function completeSale() {
  if (saleItems.length === 0) {
    alert('No items in sale.');
    return;
  }
  for (const item of saleItems) {
    const depletions = await getDepletionsByProductId(item.id);
    for (const dep of depletions) {
      const stockItem = await getStockItemById(dep.stockItemId);
      if (stockItem) {
        stockItem.totalUnits -= dep.depletionQuantity * item.quantity;
        if (stockItem.totalUnits < 0) stockItem.totalUnits = 0;
        stockItem.quantity = stockItem.totalUnits / stockItem.subUnitCount;
        await saveStockItem(stockItem);
      }
    }
  }
  alert('Sale completed!');
  saleItems = [];
  renderSaleItems();
  if (typeof refreshProducts === 'function') refreshProducts();
  if (typeof refreshStockItems === 'function') refreshStockItems();
  document.getElementById('saleSearchResults').innerHTML = '';
  document.getElementById('saleSearchInput').value = '';
}

function getTotalUnits(stockItem) {
  return typeof stockItem.totalUnits === 'number'
    ? stockItem.totalUnits
    : (stockItem.quantity || 0) * (stockItem.subUnitCount || 1);
}

async function getProductMaxSellableQuantity(productId) {
  const depletions = await getDepletionsByProductId(productId);
  if (!depletions.length) return 0;
  let min = Infinity;
  for (const dep of depletions) {
    const stockItem = await getStockItemById(dep.stockItemId);
    if (!stockItem || dep.depletionQuantity <= 0) return 0;
    const totalUnits = getTotalUnits(stockItem);
    const possible = Math.floor(totalUnits / dep.depletionQuantity);
    if (possible < min) min = possible;
  }
  return min === Infinity ? 0 : min;
}