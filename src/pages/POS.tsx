import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, SaleItem } from '../db/db';
import { Search, Plus, Minus, Trash2, Maximize, ShoppingCart } from 'lucide-react';
import Scanner from '../components/Scanner';

export default function POS() {
  const [cart, setCart] = useState<SaleItem[]>(() => {
    try {
      const saved = localStorage.getItem('pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [clientName, setClientName] = useState(() => {
    return localStorage.getItem('pos_client') || '';
  });
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [weightPrompt, setWeightPrompt] = useState<Product | null>(null);
  const [weightAmount, setWeightAmount] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pos_client', clientName);
  }, [clientName]);

  const allProducts = useLiveQuery(() => db.products.toArray()) || [];
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of allProducts) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [allProducts]);

  const settings = useLiveQuery(() => db.settings.get(1));
  const rate = Number(settings?.exchangeRateVES) > 0 ? Number(settings?.exchangeRateVES) : 36.5;

  const searchResults = useLiveQuery(
    () => {
      if (searchTerm.length < 2) return [];
      return db.products
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
        .limit(6)
        .toArray();
    },
    [searchTerm]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleScan = async (scannedCode: string) => {
    setShowScanner(false);
    const product = await db.products.where('barcode').equals(scannedCode).first();
    if (product) {
      addToCart(product);
    } else {
      showToast('⚠️ Producto no encontrado en inventario.');
    }
  };

  const confirmWeight = (e: FormEvent) => {
    e.preventDefault();
    if (weightPrompt && weightAmount) {
      const q = Number(weightAmount);
      if (q > 0) {
        processAddToCart(weightPrompt, q);
      }
      setWeightPrompt(null);
      setWeightAmount('');
    }
  };

  const addToCart = (product: Product) => {
    const live = (product.id && productMap.get(product.id)) || product;
    if (live.isWeighed) {
      setWeightPrompt(live);
      setWeightAmount('');
    } else {
      processAddToCart(live, 1);
    }
  };

  const processAddToCart = (product: Product, qty: number) => {
    const live = (product.id && productMap.get(product.id)) || product;
    const maxStock = Number(live.stock) || 0;

    if (maxStock <= 0) {
      showToast(`⚠️ Producto sin stock disponible (${product.name}).`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const newTotalQty = Number((Number(existing.quantity) + Number(qty)).toFixed(3));
        if (newTotalQty > maxStock) {
          showToast(`⚠️ Stock límite: solo hay ${maxStock}${product.isWeighed ? ' Kg' : ' Unid'} disponibles.`);
          if (Number(existing.quantity) >= maxStock) {
            return prev;
          }
          return prev.map(item => item.productId === product.id ? { ...item, quantity: maxStock } : item);
        }
        return prev.map(item => item.productId === product.id ? { ...item, quantity: newTotalQty } : item);
      }

      if (Number(qty) > maxStock) {
        showToast(`⚠️ Stock insuficiente. Solo hay ${maxStock}${product.isWeighed ? ' Kg' : ' Unid'} disponibles.`);
        return prev;
      }

      return [...prev, {
        productId: product.id!,
        barcode: product.barcode,
        name: product.name,
        priceUSD: Number(product.priceUSD) || 0,
        quantity: Number(qty),
        isWeighed: product.isWeighed
      }];
    });
    setSearchTerm('');
  };

  const updateQuantity = (productId: number, delta: number) => {
    const live = productMap.get(productId);
    const maxStock = live ? Number(live.stock) : 999999;

    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const actualDelta = item.isWeighed ? delta * 0.1 : delta;
          const newQ = Number((Number(item.quantity) + actualDelta).toFixed(3));

          if (delta > 0) {
            if (newQ > maxStock) {
              showToast(`⚠️ Stock máximo alcanzado (${maxStock} ${item.isWeighed ? 'Kg' : 'Unid'})`);
              return item.quantity !== maxStock ? { ...item, quantity: maxStock } : item;
            }
          } else if (delta < 0) {
            const minQ = item.isWeighed ? 0.05 : 1;
            if (newQ < minQ) {
              showToast(`Cantidad mínima alcanzada. Usa el botón de papelera para eliminar.`);
              return item;
            }
          }

          return { ...item, quantity: newQ };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Explicit zeroing and precise real-time calculations
  const totalUSD = cart.length === 0 
    ? 0 
    : cart.reduce((sum, item) => sum + ((Number(item.priceUSD) || 0) * (Number(item.quantity) || 0)), 0);

  const totalVES = cart.length === 0 
    ? 0 
    : totalUSD * rate;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('El carrito está vacío');

    try {
      // Registrar Venta
      await db.sales.add({
        date: Date.now(),
        clientName: clientName.trim() || 'Cliente Sin Nombre',
        items: cart,
        totalUSD,
        totalVES,
        exchangeRate: rate
      });

      // Actualizar Stock
      await db.transaction('rw', db.products, async () => {
        for (const item of cart) {
          const product = await db.products.get(item.productId);
          if (product) {
            const remainingStock = Math.max(0, Number((product.stock - item.quantity).toFixed(3)));
            await db.products.update(product.id!, { stock: remainingStock });
          }
        }
      });

      setCart([]);
      setClientName('');
      localStorage.removeItem('pos_cart');
      localStorage.removeItem('pos_client');
      alert('Venta procesada con éxito');
    } catch (error) {
      console.error(error);
      alert('Error al procesar la venta');
    }
  };

  return (
    <div className="p-4 pb-32 max-w-md mx-auto h-full overflow-y-auto flex flex-col relative">

      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2D3047] text-white p-4 rounded-xl border-4 border-[#FF6B35] shadow-[4px_4px_0px_0px_#FF6B35] font-black uppercase text-center text-xs tracking-wide animate-bounce">
          {toastMessage}
        </div>
      )}

      {weightPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFF9F0]/90 backdrop-blur-sm p-4">
          <form onSubmit={confirmWeight} className="bg-white p-6 rounded-[2rem] border-4 border-[#2D3047] shadow-[8px_8px_0px_0px_#2D3047] w-full max-w-sm">
            <h3 className="text-xl font-black uppercase tracking-tight text-[#2D3047] mb-2">Venta por Peso</h3>
            <p className="text-sm font-bold text-[#2D3047]/60 uppercase mb-4">{weightPrompt.name} (Disponible: {weightPrompt.stock} kg)</p>
            <input 
              type="number" 
              step="0.001"
              min="0.001"
              max={weightPrompt.stock}
              value={weightAmount}
              onChange={e => setWeightAmount(e.target.value)}
              className="w-full border-2 border-[#2D3047] bg-[#F7F1E3] rounded-xl px-4 py-3 font-black focus:outline-none focus:border-[#FF6B35] mb-4 text-center text-xl"
              placeholder="Cantidad en Kg (ej: 0.5)"
              autoFocus
              required
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setWeightPrompt(null)} className="flex-1 py-3 border-2 border-[#2D3047] rounded-xl font-black uppercase text-[#2D3047]">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-[#FF6B35] text-white rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none font-black uppercase transition-all">Agregar</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35]">Vender</h1>
          <span className="text-[10px] font-black uppercase tracking-wider bg-[#2D3047] text-white px-2 py-0.5 rounded-md inline-block mt-0.5">
            Tasa: 1 $ = {rate.toFixed(2)} BS
          </span>
        </div>
        <button onClick={() => setShowScanner(true)} className="bg-[#2D3047] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-[2px_2px_0px_0px_#FF6B35] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
          <Maximize className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-wide">Escanear</span>
        </button>
      </div>

      {/* Búsqueda Manual */}
      <div className="relative mb-4 z-10">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-[#2D3047]" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border-2 border-[#2D3047] rounded-xl bg-white font-bold focus:outline-none focus:border-[#FF6B35]"
          placeholder="BUSCAR PRODUCTO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchResults && searchResults.length > 0 && searchTerm.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-[#2D3047] rounded-xl shadow-[4px_4px_0px_0px_#2D3047] overflow-hidden z-20">
            {searchResults.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)}
                className="w-full text-left px-4 py-3 hover:bg-[#F7F1E3] flex justify-between items-center border-b-2 border-[#2D3047] last:border-0"
              >
                <div>
                  <div className="font-black text-[#2D3047] uppercase">{p.name}</div>
                  <div className="text-[10px] font-bold text-[#2D3047]/60 uppercase">
                    Stock: {p.stock} {p.isWeighed ? 'Kg' : 'Unid'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-[#FF6B35]">${Number(p.priceUSD).toFixed(2)}</div>
                  <div className="text-[10px] font-bold text-[#1AC0C6]">{(Number(p.priceUSD) * rate).toFixed(2)} BS</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cliente */}
      <div className="mb-4">
        <input
          type="text"
          className="block w-full px-4 py-3 border-2 border-[#2D3047] rounded-xl bg-white font-bold focus:outline-none focus:border-[#FF6B35]"
          placeholder="NOMBRE DEL CLIENTE (OPCIONAL)"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
      </div>

      {/* Carrito */}
      <div className="mb-4 bg-white rounded-[1.5rem] p-4 border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047]">
        {cart.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-[#2D3047]/40">
            <ShoppingCart className="w-12 h-12 mb-2" />
            <p className="font-black uppercase tracking-widest text-sm">Carrito vacío</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => {
              const live = productMap.get(item.productId);
              const maxStock = live ? Number(live.stock) : item.quantity;
              const itemTotalUSD = (Number(item.priceUSD) || 0) * (Number(item.quantity) || 0);
              const itemTotalVES = itemTotalUSD * rate;

              return (
                <div key={item.productId} className="bg-[#F7F1E3] p-3 rounded-xl border-2 border-[#2D3047]/20 hover:border-[#FF6B35] flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <h4 className="font-black text-[#2D3047] text-sm leading-tight uppercase">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[#FF6B35] font-black text-sm">
                        ${itemTotalUSD.toFixed(2)}
                      </span>
                      <span className="text-[#1AC0C6] font-bold text-xs">
                        {itemTotalVES.toFixed(2)} BS
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-[#2D3047]/60 mt-0.5">
                      {item.quantity} {item.isWeighed ? 'Kg' : 'Unid'} × ${Number(item.priceUSD).toFixed(2)} • (Disp: {maxStock})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border-2 border-[#2D3047] rounded-lg overflow-hidden bg-white">
                      <button 
                        onClick={() => updateQuantity(item.productId, -1)} 
                        className="p-2 hover:bg-[#F7F1E3] active:bg-[#F7F1E3]"
                        title="Disminuir"
                      >
                        <Minus className="w-4 h-4 text-[#2D3047]" strokeWidth={3} />
                      </button>
                      <span className="w-14 text-center font-black text-[#2D3047] text-xs px-1">
                        {item.quantity} {item.isWeighed ? 'Kg' : ''}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.productId, 1)} 
                        className="p-2 hover:bg-[#F7F1E3] active:bg-[#F7F1E3]"
                        title="Aumentar"
                      >
                        <Plus className="w-4 h-4 text-[#2D3047]" strokeWidth={3} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.productId)} 
                      className="p-2 text-white bg-red-500 border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none rounded-lg transition-all"
                      title="Eliminar del carrito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totales y Checkout */}
      <div className="bg-white p-6 rounded-[2rem] border-4 border-[#2D3047] shadow-[8px_8px_0px_0px_#2D3047] mt-auto flex-shrink-0">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-sm font-black uppercase tracking-tight text-[#2D3047] block">Total a Cobrar</span>
            <span className="text-[10px] font-bold text-[#2D3047]/60 uppercase">
              Tasa: 1 $ = {rate.toFixed(2)} BS
            </span>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-[#FF6B35] leading-none">
              ${totalUSD.toFixed(2)}
            </div>
            <div className="text-lg font-black text-[#1AC0C6] mt-1">
              {totalVES.toFixed(2)} BS
            </div>
          </div>
        </div>
        <button 
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="w-full bg-[#FF6B35] disabled:bg-gray-300 disabled:border-gray-400 disabled:shadow-none text-white font-black text-xl py-4 rounded-2xl border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-wide transition-all"
        >
          Procesar Venta
        </button>
        {cart.length > 0 && (
          <button 
            onClick={() => {
              if(window.confirm('¿Deseas cancelar la venta y vaciar el carrito?')) {
                setCart([]);
                setClientName('');
                localStorage.removeItem('pos_cart');
                localStorage.removeItem('pos_client');
              }
            }}
            className="w-full mt-3 bg-white text-red-500 font-black text-sm py-3 rounded-2xl border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-wide transition-all"
          >
            Cancelar Compra (Vaciar)
          </button>
        )}
      </div>

      {showScanner && <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
