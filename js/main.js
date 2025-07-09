/* js/main.js */
async function renderProducts(products) {
  const list = document.getElementById('productList');
  list.innerHTML = '';
  if (products.length === 0) {
    list.innerHTML = '<p>No products found.</p>';
    return;
  }
  products.forEach(product => {
    const div = document.createElement('div');
    div.className = 'product-card';
    div.innerHTML = `
      <h3>${product.name}</h3>
      <p>Category: ${product.category}</p>
      <p>Price: R${product.price}</p>
      <p>Stock: ${product.quantity}</p>
      <button onclick="editProduct('${product.id}')">Edit</button>
      <button onclick="deleteProductHandler('${product.id}')">Delete</button>
    `;
    list.appendChild(div);
  });
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
  renderProducts(filtered);
}

document.getElementById('searchInput').addEventListener('input', async function () {
  const query = this.value.toLowerCase();
  const allProducts = await getAllProducts();
  const filtered = query
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      )
    : allProducts;
  renderProducts(filtered);
});

async function deleteProductHandler(id) {
  await deleteProduct(id);
  refreshProducts();
}

refreshProducts();

function editProduct(id) {
  window.location.href = `product.html?id=${id}`;
}
