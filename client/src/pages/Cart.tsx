import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus, ArrowRight } from 'lucide-react';
import { useProducts } from '@/context/ProductContext';
import { getStonePrice, getStoneLabel } from '@/components/StoneSelector';

export default function Cart() {
  const { products, collections, cart, updateCartQuantity, removeFromCart, clearCart } = useProducts();

  const enrichedCartItems = cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return null;
    const price = getStonePrice(product, item.stoneType || 'main');
    const stoneLabel = item.stoneType && item.stoneType !== 'main' 
      ? getStoneLabel(product, item.stoneType) 
      : null;
    return { ...item, product, price, stoneLabel };
  }).filter(item => item !== null) as { 
    productId: number; 
    quantity: number; 
    stoneType?: string;
    product: any; 
    price: number;
    stoneLabel: string | null;
  }[];

  const subtotal = enrichedCartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-4">
        <h1 className="font-serif text-4xl mb-12 text-center">Sua Sacola</h1>

        {enrichedCartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-6">Sua sacola está vazia.</p>
            <Link href="/shop">
              <Button className="rounded-none uppercase tracking-widest" data-testid="continue-shopping-btn">Continuar Comprando</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1">
              <div className="border-b border-border pb-4 mb-4 hidden md:flex text-xs uppercase tracking-widest text-muted-foreground">
                <div className="flex-1">Produto</div>
                <div className="w-32 text-center">Quantidade</div>
                <div className="w-32 text-right">Total</div>
                <div className="w-12"></div>
              </div>

              <div className="space-y-8">
                {enrichedCartItems.map(({ product, quantity, stoneType, price, stoneLabel }) => (
                  <div key={`${product.id}-${stoneType || 'main'}`} className="flex flex-col md:flex-row items-center gap-6 border-b border-border pb-8 md:pb-4 md:border-none" data-testid={`cart-item-${product.id}`}>
                    <div className="w-full md:flex-1 flex items-center gap-6">
                      <div className="h-24 w-24 bg-secondary/20 overflow-hidden shrink-0">
                        <img src={product.image} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs text-primary uppercase tracking-wider mb-1">{collections.find(c => c.id === product.collectionId)?.name || ''}</div>
                        <h3 className="font-serif text-lg">{product.name}</h3>
                        {stoneLabel && (
                          <p className="text-xs text-muted-foreground mt-1">{stoneLabel}</p>
                        )}
                        <p className="text-sm text-muted-foreground md:hidden mt-1">R$ {(price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-0">
                      <div className="flex items-center border border-input">
                        <button 
                          onClick={() => updateCartQuantity(product.id, quantity - 1, stoneType)} 
                          className="p-2 hover:bg-secondary transition-colors"
                          data-testid={`cart-decrease-${product.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm" data-testid={`cart-quantity-${product.id}`}>{quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(product.id, quantity + 1, stoneType)} 
                          className="p-2 hover:bg-secondary transition-colors"
                          data-testid={`cart-increase-${product.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="w-32 text-right font-medium hidden md:block">
                        R$ {(price * quantity / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>

                      <button 
                        onClick={() => removeFromCart(product.id, stoneType)} 
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`cart-remove-${product.id}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-96 bg-secondary/20 p-8 h-fit">
              <h3 className="font-serif text-xl mb-6">Resumo do Pedido</h3>
              <div className="space-y-4 text-sm mb-8">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span data-testid="cart-subtotal">R$ {(subtotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete</span>
                  <span>Grátis</span>
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span data-testid="cart-total">R$ {(subtotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <Link href="/checkout">
                <Button className="w-full rounded-none h-12 bg-black text-white hover:bg-primary uppercase tracking-widest flex items-center justify-center gap-2" data-testid="checkout-btn">
                  Finalizar Compra <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-3 rounded-none h-12 border-black text-black hover:bg-black hover:text-white uppercase tracking-widest"
                onClick={clearCart}
                data-testid="clear-cart-btn"
              >
                Limpar Sacola
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
