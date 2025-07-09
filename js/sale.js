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

  // Build table without quantity input
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
  filtered.forEach(product => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Product ID">${product.id}</td>
      <td data-label="Category">${product.category}</td>
      <td data-label="Name">${product.name}</td>
      <td data-label="Description">${product.description || ''}</td>
      <td data-label="Price">R${product.price}</td>
      <td data-label="Stock">${product.quantity}</td>
      <td data-label="Select">
        ${
          product.quantity > 0
            ? `<button onclick="selectProductForSale('${product.id}')">Select</button>`
            : `<span style="color:#e74c3c;font-weight:bold;">Out of Stock</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
  resultsDiv.appendChild(table);
}

// Show popup on select
async function selectProductForSale(id) {
  selectedProductForSale = id;
  const allProducts = await getAllProducts();
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  document.getElementById('popupProductName').innerText = `${product.name} (Stock: ${product.quantity})`;
  const qtyInput = document.getElementById('popupProductQty');
  qtyInput.value = 1;
  qtyInput.max = product.quantity;
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
  const allProducts = await getAllProducts();
  const product = allProducts.find(p => p.id === selectedProductForSale);
  if (!product) {
    alert('Product not found.');
    return;
  }
  const qtyInput = document.getElementById('popupProductQty');
  const qty = parseInt(qtyInput.value);
  if (isNaN(qty) || qty < 1) {
    alert('Please enter a valid quantity.');
    return;
  }
  if (qty > product.quantity) {
    alert('Cannot sell more than available stock.');
    return;
  }
  // Check if already in sale
  const existing = saleItems.find(item => item.id === product.id);
  if (existing) {
    if (existing.quantity + qty > product.quantity) {
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
      maxQuantity: product.quantity
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

async function completeSale() {
  if (saleItems.length === 0) {
    alert('No items in sale.');
    return;
  }
  // Update stock
  for (const item of saleItems) {
    const product = await getProductById(item.id);
    if (product.quantity < item.quantity) {
      alert(`Not enough stock for ${product.name}.`);
      return;
    }
    product.quantity -= item.quantity;
    await saveProduct(product);
  }
  alert('Sale completed!');
  saleItems = [];
  renderSaleItems();
  if (typeof refreshProducts === 'function') refreshProducts();
  document.getElementById('saleSearchResults').innerHTML = '';
  document.getElementById('saleSearchInput').value = '';
}