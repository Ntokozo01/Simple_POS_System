document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const subUnitCountInput = document.getElementById('subUnitCount');
  const quantityInput = document.getElementById('quantity');
  const totalUnitsInput = document.getElementById('totalUnits');

  function updateTotalUnits() {
    const subUnitCount = parseFloat(subUnitCountInput.value);
    const quantity = parseFloat(quantityInput.value);
    if (!isNaN(subUnitCount) && subUnitCount > 0 && !isNaN(quantity)) {
      totalUnitsInput.value = (quantity * subUnitCount).toFixed(2).replace(/\.00$/, '');
    }
  }

  function updateQuantity() {
    const subUnitCount = parseFloat(subUnitCountInput.value);
    const totalUnits = parseFloat(totalUnitsInput.value);
    if (!isNaN(subUnitCount) && subUnitCount > 0 && !isNaN(totalUnits)) {
      quantityInput.value = (totalUnits / subUnitCount).toFixed(2).replace(/\.00$/, '');
    }
  }

  subUnitCountInput.addEventListener('input', () => {
    updateTotalUnits();
    updateQuantity();
  });
  quantityInput.addEventListener('input', updateTotalUnits);
  totalUnitsInput.addEventListener('input', updateQuantity);

  if (id) {
    document.getElementById('formTitle').innerText = 'Edit Stock Item';
    const stockItem = await getStockItemById(id);
    if (stockItem) {
      document.getElementById('stockItemId').value = stockItem.itemId;
      document.getElementById('itemId').value = stockItem.itemId;
      document.getElementById('itemId').readOnly = true; // Don't allow editing the ID
      document.getElementById('description').value = stockItem.description;
      document.getElementById('quantity').value = stockItem.quantity;
      document.getElementById('subUnitCount').value = stockItem.subUnitCount || 1;
      document.getElementById('totalUnits').value = stockItem.totalUnits || (stockItem.quantity * (stockItem.subUnitCount || 1));
      document.getElementById('unitName').value = stockItem.unitName || '';
    }
  }

  document.getElementById('stockItemForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const itemId = document.getElementById('itemId').value.trim();
    const description = document.getElementById('description').value.trim();
    const subUnitCount = parseInt(document.getElementById('subUnitCount').value);
    const unitName = document.getElementById('unitName').value.trim();
    const totalUnits = parseInt(document.getElementById('totalUnits').value);

    if (!itemId || !description || isNaN(subUnitCount) || subUnitCount < 1 || !unitName || isNaN(totalUnits) || totalUnits < 0) {
      alert('Please fill in all fields with valid values.');
      return;
    }

    const quantity = totalUnits / subUnitCount;

    const stockItem = {
      itemId,
      description,
      quantity,
      subUnitCount,
      unitName,
      totalUnits
    };

    await saveStockItem(stockItem);
    window.location.href = 'index.html';
  });
});