/* js/productForm.js */
document.addEventListener('DOMContentLoaded', async () => {
  // Load stock items for depletion mapping FIRST
  await loadDepletionStockItems();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (id) {
    document.getElementById('formTitle').innerText = 'Edit Product';
    const product = await getProductById(id);
    if (product) {
      document.getElementById('productId').value = product.id || product.productId;
      document.getElementById('name').value = product.name;
      document.getElementById('category').value = product.category;
      document.getElementById('price').value = product.price;
      document.getElementById('description').value = product.description;
    }
    // Load depletion mappings for editing (after stock items are loaded)
    const depletions = await getDepletionsByProductId(id);
    renderDepletionMappings(depletions);
  } else {
    renderDepletionMappings([]);
  }

  document.getElementById('productForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const category = document.getElementById('category').value.trim();
    const price = parseFloat(document.getElementById('price').value);

    if (!name || !category || isNaN(price) || price < 0) {
      alert('Please fill in all fields with valid values.');
      return;
    }

    const product = {
      id: document.getElementById('productId').value || 'p' + Date.now(),
      name,
      category,
      price,
      description: document.getElementById('description').value,
    };

    // Gather depletion mappings
    const depletionMappings = [];
    document.querySelectorAll('.depletion-mapping-row').forEach(row => {
      const stockItemId = row.querySelector('.depletion-stock-item').value;
      const depletionQuantity = parseFloat(row.querySelector('.depletion-quantity').value);
      if (stockItemId && !isNaN(depletionQuantity) && depletionQuantity > 0) {
        depletionMappings.push({ productId: product.id, stockItemId, depletionQuantity });
      }
    });

    await saveProduct(product);

    // Save depletion mappings
    // Remove old mappings first
    const oldDepletions = await getDepletionsByProductId(product.id);
    for (const dep of oldDepletions) {
      await deleteProductStockDepletion(dep.productId, dep.stockItemId);
    }
    // Save new mappings
    for (const dep of depletionMappings) {
      await saveProductStockDepletion(dep);
    }

    window.location.href = 'index.html';
  });

  // Add depletion mapping row
  document.getElementById('addDepletionMappingBtn').addEventListener('click', () => {
    addDepletionMappingRow();
  });
});

// Load stock items for depletion mapping
async function loadDepletionStockItems() {
  const stockItems = await getAllStockItems();
  window._allStockItems = stockItems; // cache for use in mapping rows
}

// Render depletion mappings
function renderDepletionMappings(depletions) {
  const container = document.getElementById('depletionMappings');
  container.innerHTML = '';
  if (!window._allStockItems) return;
  (depletions.length ? depletions : [{}]).forEach(dep => addDepletionMappingRow(dep));
}

function addDepletionMappingRow(dep = {}) {
  const container = document.getElementById('depletionMappings');
  const row = document.createElement('div');
  row.className = 'depletion-mapping-row';
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.marginBottom = '6px';
  row.style.position = 'relative';

  // Combobox input
  const comboInput = document.createElement('input');
  comboInput.type = 'text';
  comboInput.placeholder = 'Search or select stock item...';
  comboInput.className = 'depletion-combo-input';
  comboInput.style.width = '220px';
  comboInput.autocomplete = 'off';

  // Hidden field to store selected itemId
  const hiddenSelect = document.createElement('input');
  hiddenSelect.type = 'hidden';
  hiddenSelect.className = 'depletion-stock-item';

  // Floating dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'combo-dropdown';
  dropdown.style.position = 'absolute';
  dropdown.style.top = '32px';
  dropdown.style.left = '0';
  dropdown.style.width = '220px';
  dropdown.style.background = '#fff';
  dropdown.style.border = '1px solid #ccc';
  dropdown.style.zIndex = '10';
  dropdown.style.maxHeight = '180px';
  dropdown.style.overflowY = 'auto';
  dropdown.style.display = 'none';

  // Label for qty unit
  const qtyLabel = document.createElement('span');
  qtyLabel.className = 'depletion-qty-label';
  qtyLabel.style.alignSelf = 'center';
  qtyLabel.style.fontSize = '0.95em';
  qtyLabel.style.color = '#888';
  qtyLabel.style.marginLeft = '2px';

  // Helper to filter and render options
  function renderDropdown(query = '') {
    const items = (window._allStockItems || []).filter(item =>
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.itemId.toLowerCase().includes(query.toLowerCase())
    );
    dropdown.innerHTML = '';
    if (items.length === 0) {
      const noOpt = document.createElement('div');
      noOpt.textContent = 'No results';
      noOpt.style.padding = '6px 12px';
      dropdown.appendChild(noOpt);
      return;
    }
    items.forEach(item => {
      const opt = document.createElement('div');
      opt.textContent = item.description;
      opt.style.padding = '6px 12px';
      opt.style.cursor = 'pointer';
      opt.tabIndex = 0;
      if (hiddenSelect.value === item.itemId) {
        opt.style.background = '#e0f7fa';
      }
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        comboInput.value = item.description;
        hiddenSelect.value = item.itemId;
        updateQtyLabel(item);
        dropdown.style.display = 'none';
      });
      opt.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          comboInput.value = item.description;
          hiddenSelect.value = item.itemId;
          updateQtyLabel(item);
          dropdown.style.display = 'none';
        }
      });
      dropdown.appendChild(opt);
    });
  }

  // Update the qty label to show the unit
  function updateQtyLabel(item) {
    if (item && item.unitName) {
      qtyLabel.textContent = `Qty (in ${item.unitName}${item.unitName.endsWith('s') ? '' : 's'})`;
    } else {
      qtyLabel.textContent = 'Qty';
    }
  }

  // Initial value for editing
  if (dep.stockItemId) {
    const selectedItem = (window._allStockItems || []).find(item => item.itemId === dep.stockItemId);
    if (selectedItem) {
      comboInput.value = selectedItem.description;
      hiddenSelect.value = selectedItem.itemId;
      updateQtyLabel(selectedItem);
    }
  } else {
    qtyLabel.textContent = 'Qty';
  }

  comboInput.addEventListener('input', e => {
    renderDropdown(comboInput.value);
    dropdown.style.display = 'block';
  });
  comboInput.addEventListener('focus', e => {
    renderDropdown(comboInput.value);
    dropdown.style.display = 'block';
  });
  comboInput.addEventListener('blur', e => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });

  row.appendChild(comboInput);
  row.appendChild(hiddenSelect);
  row.appendChild(dropdown);

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.className = 'depletion-quantity';
  qtyInput.placeholder = 'Qty';
  qtyInput.min = '1';
  qtyInput.step = 'any'; // Allow any valid number input
  qtyInput.required = true;
  qtyInput.value = dep.depletionQuantity && dep.depletionQuantity > 0
    ? dep.depletionQuantity
    : 1;
  qtyInput.style.width = '80px';

  // Allow any number while typing, but validate on blur
  qtyInput.addEventListener('blur', () => {
    let val = Number(qtyInput.value);
    if (isNaN(val) || val < 1) {
      qtyInput.value = '1';
    } else {
      qtyInput.value = Math.round(val);
    }
  });

  row.appendChild(qtyInput);
  row.appendChild(qtyLabel);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = 'Remove';
  removeBtn.onclick = () => row.remove();
  row.appendChild(removeBtn);

  container.appendChild(row);
}
