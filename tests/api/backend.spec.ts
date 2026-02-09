import { test, expect } from '@playwright/test';

test.describe('Backend API Tests', () => {
  
 test('GET /api/products should return list of products', async ({ request }) => {
  test.setTimeout(60000);

  const response = await request.get('/api/products');
  expect(response.ok()).toBeTruthy();
  const products = await response.json();
  expect(Array.isArray(products)).toBeTruthy();

  if (products.length > 0) {
    expect(products[0]).toHaveProperty('id');
    expect(products[0]).toHaveProperty('name');
    expect(products[0]).toHaveProperty('price');
  }
});


test('GET /api/products?bestsellers=true should return products', async ({ request }) => {
  test.setTimeout(60000);

  const response = await request.get('/api/products?bestsellers=true');
  expect(response.ok()).toBeTruthy();
});


  test('POST /api/auth/login should fail with invalid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'invalid@example.com',
        password: 'wrongpassword'
      }
    });
    // Should be 401 or 400 depending on implementation
    expect([400, 401]).toContain(response.status());
  });

});
