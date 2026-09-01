import { useState, useEffect } from 'react';
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

  const settings = useLiveQuery(() => db.settings.get(1));
  const rate = settings?.exchangeRateVES || 1;

  const searchResults = useLiveQuery(
    () => {
      if (searchTerm.length < 2) return [];
      return db.products
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
        .limit(5)
        .toArray();
    },
    [searchTerm]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleScan = async (scannedCode: string) => {
    setShowScanner(false);
    const product = await db.products.where('barcode').equals(scannedCode).first();
    if (product) {
      addToCart(product);
    } else {
      showToast('Producto no encontrado en inventario.');
    }
  };

  const confirmWeight = (e: React.FormEvent) => {
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
    if (product.isWeighed) {
      setWeightPrompt(product);
      setWeightAmount('');
    } else {
      processAddToCart(product, 1);
    }
  };

  const processAddToCart = (product: Product, qty: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (Number(existing.quantity) + Number(qty) > product.stock) {
          showToast(`Solo hay ${product.stock} disponibles en stock.`);
          return prev;
        }
        return prev.map(item => item.productId === product.id ? { ...item, quantity: Number(item.quantity) + Number(qty) } : item);
      }
      if (product.stock <= 0 || Number(qty) > product.stock) {
        showToast(`Stock insuficiente. Disponible: ${product.stock}`);
        return prev;
      }
      return [...prev, {
        productId: product.id!,
        barcode: product.barcode,
        name: product.name,
        priceUSD: Number(product.priceUSD),
        quantity: Number(qty),
        isWeighed: product.isWeighed
      }];
    });
    setSearchTerm('');
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const actualDelta = item.isWeighed ? delta * 0.1 : delta;
          let newQ = Number(item.quantity) + actualDelta;
          newQ = Number(newQ.toFixed(3)); // Handle float issues
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const totalUSD = cart.reduce((sum, item) => sum + ((Number(item.priceUSD) || 0) * (Number(item.quantity) || 0)), 0);
  const totalVES = totalUSD * (Number(rate) || 1);

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
            await db.products.update(product.id!, { stock: product.stock - item.quantity });
          }
        }
      });

      setCart([]);
      setClientName('');
      alert('Venta procesada con éxito');
    } catch (error) {
      console.error(error);
      alert('Error al procesar la venta');
    }
  };

  return (
    <div className="p-4 pb-32 max-w-md mx-auto h-full overflow-y-auto flex flex-col relative">

      {toastMessage && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-[#2D3047] text-white p-4 rounded-xl border-4 border-[#FF6B35] shadow-[4px_4px_0px_0px_#FF6B35] font-black uppercase text-center animate-bounce">
          {toastMessage}
        </div>
      )}

      {weightPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#FFF9F0]/90 backdrop-blur-sm p-4">
          <form onSubmit={confirmWeight} className="bg-white p-6 rounded-[2rem] border-4 border-[#2D3047] shadow-[8px_8px_0px_0px_#2D3047] w-full max-w-sm">
            <h3 className="text-xl font-black uppercase tracking-tight text-[#2D3047] mb-2">Venta por Peso</h3>
            <p className="text-sm font-bold text-[#2D3047]/60 uppercase mb-4">{weightPrompt.name} (Disp: {weightPrompt.stock} kg)</p>
            <input 
              type="number" 
              step="0.001"
              min="0.001"
              value={weightAmount}
              onChange={e => setWeightAmount(e.target.value)}
              className="w-full border-2 border-[#2D3047] bg-[#F7F1E3] rounded-xl px-4 py-3 font-black focus:outline-none focus:border-[#FF6B35] mb-4 text-center text-xl"
              placeholder="Cantidad (ej: 0.5)"
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35]">Vender</h1>
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-[#2D3047] rounded-xl shadow-[4px_4px_0px_0px_#2D3047] overflow-hidden">
            {searchResults.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)}
                className="w-full text-left px-4 py-3 hover:bg-[#F7F1E3] flex justify-between items-center border-b-2 border-[#2D3047] last:border-0"
              >
                <div>
                  <div className="font-black text-[#2D3047] uppercase">{p.name}</div>
                  <div className="text-[10px] font-bold text-[#2D3047]/60 uppercase">Stock: {p.stock}</div>
                </div>
                <div className="font-black text-[#FF6B35]">${p.priceUSD.toFixed(2)}</div>
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
          placeholder="NOMBRE DEL CLIENTE"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
      </div>

      {/* Carrito */}
      <div className="mb-4 bg-white rounded-[1.5rem] p-4 border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#2D3047]/40">
            <ShoppingCart className="w-12 h-12 mb-2" />
            <p className="font-black uppercase tracking-widest">Carrito vacío</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.productId} className="bg-[#F7F1E3] p-3 rounded-xl border-2 border-transparent hover:border-[#FF6B35] flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-black text-[#2D3047] text-sm leading-tight uppercase">{item.name}</h4>
                  <div className="text-[#FF6B35] font-black text-sm mt-1">
                    ${(Number(item.priceUSD) * Number(item.quantity)).toFixed(2)}
                    <span className="text-[#2D3047]/50 text-xs ml-1 font-bold">
                      ({item.quantity} x ${Number(item.priceUSD).toFixed(2)})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border-2 border-[#2D3047] rounded-lg overflow-hidden bg-white">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-2 hover:bg-[#F7F1E3] active:bg-[#F7F1E3]">
                      <Minus className="w-4 h-4 text-[#2D3047]" strokeWidth={3} />
                    </button>
                    <span className="w-12 text-center font-black text-[#2D3047] text-xs px-1">{item.quantity}{item.isWeighed ? 'Kg' : ''}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-2 hover:bg-[#F7F1E3] active:bg-[#F7F1E3]">
                      <Plus className="w-4 h-4 text-[#2D3047]" strokeWidth={3} />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="p-2 text-white bg-red-500 border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none rounded-lg transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totales y Checkout */}
      <div className="bg-white p-6 rounded-[2rem] border-4 border-[#2D3047] shadow-[8px_8px_0px_0px_#2D3047] mt-auto flex-shrink-0">
        <div className="flex justify-between items-end mb-4">
          <span className="text-sm font-black uppercase tracking-tight text-[#2D3047]">Total a Cobrar</span>
          <div className="text-right">
            <div className="text-4xl font-black text-[#FF6B35] leading-none">${totalUSD.toFixed(2)}</div>
            <div className="text-lg font-black text-[#1AC0C6] mt-1">{totalVES.toFixed(2)} BS</div>
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
              }
            }}
            className="w-full mt-4 bg-white text-red-500 font-black text-sm py-3 rounded-2xl border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase tracking-wide transition-all"
          >
            Cancelar Compra
          </button>
        )}
      </div>

      {showScanner && <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
