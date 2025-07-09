/* js/productForm.js */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (id) {
    document.getElementById('formTitle').innerText = 'Edit Product';
    const product = await getProductById(id); // Await the async function
    if (product) {
      document.getElementById('productId').value = product.id;
      document.getElementById('name').value = product.name;
      document.getElementById('category').value = product.category;
      document.getElementById('price').value = product.price;
      document.getElementById('quantity').value = product.quantity;
      document.getElementById('description').value = product.description;
    }
  }

  document.getElementById('productForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const category = document.getElementById('category').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const quantity = parseInt(document.getElementById('quantity').value);

    if (!name || !category || isNaN(price) || isNaN(quantity) || price < 0 || quantity < 0) {
      alert('Please fill in all fields with valid values.');
      return;
    }

    const product = {
      id: document.getElementById('productId').value || 'p' + Date.now(),
      name,
      category,
      price,
      quantity,
      description: document.getElementById('description').value,
    };
    await saveProduct(product);
    window.location.href = 'index.html';
  });
});
