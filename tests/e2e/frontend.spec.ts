import { test, expect } from '@playwright/test';

test.describe('Frontend UX Smoke (P0)', () => {
  test('Home loads (no networkidle)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('Shop shows product count', async ({ page }) => {
    await page.goto('/shop');
    await expect(page).toHaveURL(/\/shop/);
    await expect(page.getByTestId('product-count')).toBeVisible();
  });

  test('Cart page renders and has checkout button', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByTestId('checkout-btn')).toBeVisible();
    await expect(page.getByTestId('continue-shopping-btn')).toBeVisible();
  });

  test('Checkout blocks submit when shipping not calculated (CEP missing)', async ({ page }) => {
    await page.goto('/checkout');

    await page.getByTestId('input-email').fill('qa+test@zkrezk.com');
    await page.getByTestId('input-firstname').fill('QA');
    await page.getByTestId('input-lastname').fill('Lead');
    await page.getByTestId('input-address').fill('Rua Teste 123');
    await page.getByTestId('input-city').fill('São Paulo');

    await page.getByTestId('input-cardnumber').fill('4111111111111111');
    await page.getByTestId('input-expiry').fill('12/30');
    await page.getByTestId('input-cvc').fill('123');

    await page.getByTestId('button-submit-checkout').click();

    // Como o submit deve ser bloqueado sem frete, continuamos em /checkout
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('Checkout calculates shipping with valid CEP and updates totals', async ({ page }) => {
    await page.goto('/checkout');

    // Antes: frete pendente
    await expect(page.getByTestId('text-shipping-pending')).toBeVisible();

    // Captura subtotal e total antes, só para comparar depois
    const subtotalBefore = ((await page.getByTestId('text-subtotal').textContent()) ?? '').trim();
    const totalBefore = ((await page.getByTestId('text-total').textContent()) ?? '').trim();

    // Dispara o cálculo (há debounce ~500ms no código)
    await page.getByTestId('input-cep').fill('01310-000');

    // Aguarda o resultado aparecer
    await expect(page.getByTestId('shipping-result')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('text-shipping-price')).toBeVisible();
    await expect(page.getByTestId('text-shipping-days')).toBeVisible();

    // "Informe o CEP" deve sumir e o valor do frete no resumo deve aparecer
    await expect(page.getByTestId('text-shipping-pending')).toHaveCount(0);
    await expect(page.getByTestId('text-summary-shipping')).toBeVisible();

    // Total deve existir e, normalmente, mudar depois do frete (sem travar em valor exato)
    const totalAfter = ((await page.getByTestId('text-total').textContent()) ?? '').trim();
    expect(totalAfter.length).toBeGreaterThan(0);

    if (subtotalBefore && totalBefore) {
      expect(totalAfter).not.toEqual(totalBefore);
    }
  });
});
