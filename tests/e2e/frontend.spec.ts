import { test, expect } from '@playwright/test';

test.describe('Frontend UX Smoke (P0)', () => {
  test('Home loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('Shop shows product count', async ({ page }) => {
    await page.goto('/shop');
    await expect(page).toHaveURL(/\/shop/);
    await expect(page.getByTestId('product-count')).toBeVisible();
  });

  test('Cart page renders (empty or with items)', async ({ page }) => {
    await page.goto('/cart');

    // Sempre deve existir alguma UI do carrinho (estado vazio OU estado com itens)
    // Se estiver vazio, normalmente existe "continuar comprando".
    // Se tiver itens, pode existir checkout-btn.
    const continueBtn = page.getByTestId('continue-shopping-btn');
    const checkoutBtn = page.getByTestId('checkout-btn');

    // Espera a página hidratar
    await page.waitForLoadState('domcontentloaded');

    // Passa se qualquer um dos dois aparecer
    const visible = await Promise.race([
      continueBtn.waitFor({ state: 'visible' }).then(() => 'continue'),
      checkoutBtn.waitFor({ state: 'visible' }).then(() => 'checkout'),
    ]);

    expect(['continue', 'checkout']).toContain(visible);
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

    // Deve continuar no /checkout porque frete não foi calculado
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('Checkout calculates shipping with valid CEP and shows result', async ({ page }) => {
    await page.goto('/checkout');

    // Antes: deve estar pendente
    await expect(page.getByTestId('text-shipping-pending')).toBeVisible();

    // Dispara cálculo (tem debounce de ~500ms no código)
    await page.getByTestId('input-cep').fill('01310-000');

    // Resultado aparece
    await expect(page.getByTestId('shipping-result')).toBeVisible();
    await expect(page.getByTestId('text-shipping-price')).toBeVisible();
    await expect(page.getByTestId('text-shipping-days')).toBeVisible();

    // Pendente some e resumo mostra frete
    await expect(page.getByTestId('text-shipping-pending')).toHaveCount(0);
    await expect(page.getByTestId('text-summary-shipping')).toBeVisible();

    // Total existe
    const totalAfter = ((await page.getByTestId('text-total').textContent()) || '').trim();
    expect(totalAfter.length).toBeGreaterThan(0);
  });
});
