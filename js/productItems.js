/* js/productItems.js */
async function renderProducts(products) {
  const list = document.getElementById('productList');
  list.innerHTML = '';
  if (products.length === 0) {
    list.innerHTML = '<p>No products found.</p>';
    return;
  }

  for (const product of products) {
    let stockInfo = 'No stock linked';
    const depletions = await getDepletionsByProductId(product.id);
    if (depletions.length > 0) {
      const stockParts = [];
      for (const dep of depletions) {
        const stockItem = await getStockItemById(dep.stockItemId);
        if (stockItem) {
          // Calculate available quantity for this product
          const totalUnits = typeof stockItem.totalUnits === 'number'
            ? stockItem.totalUnits
            : (stockItem.quantity || 0) * (stockItem.subUnitCount || 1);
          const possible = dep.depletionQuantity > 0
            ? Math.floor(totalUnits / dep.depletionQuantity)
            : 0;
          const unitName = stockItem.unitName || 'unit';
          stockParts.push(
            `<strong>${stockItem.description}</strong><br>
            <span style="color:#219150;">
              In stock: ${possible} (uses ${dep.depletionQuantity} ${unitName}${dep.depletionQuantity !== 1 ? 's' : ''} per sale, ${totalUnits} ${unitName}${totalUnits !== 1 ? 's' : ''} available)
            </span>`
          );
        } else {
          stockParts.push(`${dep.stockItemId}: Not found`);
        }
      }
      stockInfo = `<ul class="stock-list">` +
        stockParts.map(part => `<li>${part}</li>`).join('') +
        `</ul>`;
    }

    const div = document.createElement('div');
    div.className = 'product-card';
    div.innerHTML = `
      <h3>${product.name}</h3>
      <p>Category: ${product.category}</p>
      <p>Price: R${product.price}</p>
      <div>Stock:${stockInfo}</div>
      <button onclick="editProduct('${product.id}')">Edit</button>
      <button onclick="deleteProductHandler('${product.id}')">Delete</button>
    `;
    list.appendChild(div);
  }
}

async function refreshProducts() {
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const allProducts = await getAllProducts();
  const filtered = query
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      )
    : allProducts;
  await renderProducts(filtered);
}

// Use only refreshProducts in the input event
document.getElementById('searchInput').addEventListener('input', refreshProducts);

async function deleteProductHandler(id) {
  await deleteProduct(id);
  refreshProducts();
}

function editProduct(id) {
  window.location.href = `product.html?id=${id}`;
}
