// Sale logic for handling purchases

let saleItems = [];
let selectedProductForSale = null;

document.addEventListener('DOMContentLoaded', () => {
  const saleSearchInput = document.getElementById('saleSearchInput');
  if (saleSearchInput) {
    saleSearchInput.addEventListener('input', searchProductsForSale);
  }
});

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

  // Create table with visible borders for cells
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.innerHTML = `
    <thead>
      <tr>
        <th style="border:1px solid #ccc;padding:6px;">Product ID</th>
        <th style="border:1px solid #ccc;padding:6px;">Category</th>
        <th style="border:1px solid #ccc;padding:6px;">Name</th>
        <th style="border:1px solid #ccc;padding:6px;">Description</th>
        <th style="border:1px solid #ccc;padding:6px;">Price</th>
        <th style="border:1px solid #ccc;padding:6px;">Stock</th>
        <th style="border:1px solid #ccc;padding:6px;">Quantity</th>
        <th style="border:1px solid #ccc;padding:6px;">Select</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `;
  const tbody = table.querySelector('tbody');

  filtered.forEach(product => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="border:1px solid #ccc;padding:6px;">${product.id}</td>
      <td style="border:1px solid #ccc;padding:6px;">${product.category}</td>
      <td style="border:1px solid #ccc;padding:6px;">${product.name}</td>
      <td style="border:1px solid #ccc;padding:6px;">${product.description || ''}</td>
      <td style="border:1px solid #ccc;padding:6px;">R${product.price}</td>
      <td style="border:1px solid #ccc;padding:6px;">${product.quantity}</td>
      <td style="border:1px solid #ccc;padding:6px;">
        <input type="number" min="1" max="${product.quantity}" value="1" id="qty_${product.id}" style="width:60px;">
      </td>
      <td style="border:1px solid #ccc;padding:6px;">
        <button onclick="selectProductForSale('${product.id}')">Select</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  resultsDiv.appendChild(table);
}

function selectProductForSale(id) {
  selectedProductForSale = id;
  // No alert here; user will enter quantity and click "Add to Sale"
}

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
  const qtyInput = document.getElementById('qty_' + product.id);
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