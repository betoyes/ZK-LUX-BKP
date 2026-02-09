const { request } = require('@playwright/test');

module.exports = async () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.zkrezk.com';
  const api = await request.newContext({ baseURL });

  // Warm-up
  await api.get('/api/products?bestsellers=true');
  await api.get('/api/products');
  await api.get('/api/products?bestsellers=true');
  await api.get('/api/products');

  await api.dispose();
};
