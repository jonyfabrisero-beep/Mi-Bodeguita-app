import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '../db/db';
import { Search, Plus, Edit2, Trash2, Maximize, ScanBarcode } from 'lucide-react';
import Scanner from '../components/Scanner';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  
  // Form State
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [isWeighed, setIsWeighed] = useState(false);
  const [category, setCategory] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [tempSelectedCategory, setTempSelectedCategory] = useState('');
  
  const settings = useLiveQuery(() => db.settings.get(1));
  const [addStockPrompt, setAddStockPrompt] = useState<Product | null>(null);
  const [addStockAmount, setAddStockAmount] = useState('');

  useEffect(() => {
    const handleEditProduct = (e: CustomEvent<Product>) => {
      const p = e.detail;
      setEditingProduct(p);
      setBarcode(p.barcode);
      setName(p.name);
      setPriceUSD(p.priceUSD.toString());
      setStock(p.stock.toString());
      setMinStock(p.minStock.toString());
      setIsWeighed(p.isWeighed || false);
      setCategory(p.category || '');
      setIsAdding(true);
    };
    window.addEventListener('editProduct' as any, handleEditProduct);
    return () => window.removeEventListener('editProduct' as any, handleEditProduct);
  }, []);

  const products = useLiveQuery(
    () => db.products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
      .toArray(),
    [searchTerm]
  );

  const handleScan = (scannedCode: string) => {
    setShowScanner(false);
    setBarcode(scannedCode);
    
    // Si ya existe, autocompletar para editar
    db.products.where('barcode').equals(scannedCode).first().then(existing => {
      if (existing) {
        setEditingProduct(existing);
        setName(existing.name);
        setPriceUSD(existing.priceUSD.toString());
        setStock(existing.stock.toString());
        setMinStock(existing.minStock.toString());
        setIsAdding(true);
      }
    });
  };

  const openAdd = () => {
    setEditingProduct(null);
    setBarcode('');
    setName('');
    setPriceUSD('');
    setStock('');
    setMinStock('');
    setIsWeighed(false);
    setCategory('');
    setIsAdding(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setBarcode(p.barcode);
    setName(p.name);
    setPriceUSD(p.priceUSD.toString());
    setStock(p.stock.toString());
    setMinStock(p.minStock.toString());
    setIsWeighed(p.isWeighed || false);
    setCategory(p.category || '');
    setIsAdding(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
      await db.products.delete(id);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addStockPrompt && addStockAmount) {
      const added = Number(addStockAmount);
      if (added > 0) {
        await db.products.update(addStockPrompt.id!, { stock: addStockPrompt.stock + added });
      }
      setAddStockPrompt(null);
      setAddStockAmount('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      alert('Por favor, selecciona una categoría para el producto.');
      return;
    }
    const productData = {
      barcode,
      name,
      priceUSD: Number(priceUSD),
      stock: Number(stock),
      minStock: Number(minStock),
      isWeighed,
      category
    };

    if (editingProduct && editingProduct.id) {
      await db.products.update(editingProduct.id, productData);
    } else {
      await db.products.add(productData);
    }
    
    setIsAdding(false);
  };

  const handleSearchScan = (decodedText: string) => {
    setSearchTerm(decodedText);
    setShowSearchScanner(false);
  };

  if (isAdding) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35] leading-none">{editingProduct ? 'Editar\nProducto' : 'Nuevo\nProducto'}</h1>
          <button onClick={() => setIsAdding(false)} className="text-[#2D3047] font-black uppercase underline decoration-2">Cancelar</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-black uppercase tracking-widest text-[#2D3047] mb-1">Código de Barras</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="flex-1 border-2 border-[#2D3047] bg-[#F7F1E3] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-[#FF6B35]"
                required
              />
              <button 
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-[#2D3047] text-white p-3 rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#FF6B35] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none flex items-center justify-center transition-all"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black uppercase tracking-widest text-[#2D3047] mb-1">Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-2 border-[#2D3047] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-[#FF6B35]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black uppercase tracking-widest text-[#2D3047] mb-1">Categoría</label>
              <button 
                type="button" 
                onClick={() => { setTempSelectedCategory(category); setShowCategoryModal(true); }}
                className="w-full border-2 border-[#2D3047] rounded-xl px-4 py-3 font-bold bg-white text-left text-[#2D3047] focus:outline-none focus:border-[#FF6B35] truncate flex justify-between items-center"
              >
                <span>{category || 'SELECCIONAR'}</span>
                <span className="text-xs">▼</span>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isWeighed" checked={isWeighed} onChange={e => setIsWeighed(e.target.checked)} className="w-5 h-5 accent-[#FF6B35] border-2 border-[#2D3047] rounded" />
              <label htmlFor="isWeighed" className="text-sm font-black uppercase tracking-widest text-[#2D3047]">Venta por Peso</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black uppercase tracking-widest text-[#2D3047] mb-1">Precio ($)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={priceUSD}
                onChange={e => setPriceUSD(e.target.value)}
                className="w-full border-2 border-[#2D3047] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-[#FF6B35]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-black uppercase tracking-widest text-[#2D3047] mb-1">Stock {isWeighed ? '(Kg)' : '(Unid)'}</label>
              <input 
                type="number" 
                step={isWeighed ? "0.001" : "1"}
                min="0"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full border-2 border-[#2D3047] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-[#FF6B35]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black uppercase tracking-widest text-[#2D3047] mb-1">Stock Mínimo {isWeighed ? '(Kg)' : '(Unid)'}</label>
            <input 
              type="number" 
              step={isWeighed ? "0.001" : "1"}
              min="0"
              value={minStock}
              onChange={e => setMinStock(e.target.value)}
              className="w-full border-2 border-[#2D3047] rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-[#FF6B35]"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#FF6B35] text-white font-black text-xl uppercase tracking-wide py-4 rounded-2xl border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all mt-6"
          >
            Guardar
          </button>
        </form>

        {showScanner && <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
        
        {showCategoryModal && (
          <div className="fixed inset-0 z-[60] bg-[#FFF9F0] flex flex-col p-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-[#FF6B35] mb-4 mt-6">Seleccionar<br/>Categoría</h2>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-6">
              {(settings?.categories?.length ? settings.categories : ['Víveres', 'Charcutería', 'Carnicería', 'Frutas y Verduras']).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTempSelectedCategory(c)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-4 font-black uppercase transition-all ${
                    tempSelectedCategory === c 
                      ? 'border-[#2D3047] bg-[#FF6B35] text-white shadow-[4px_4px_0px_0px_#2D3047]' 
                      : 'border-[#2D3047] bg-white text-[#2D3047]'
                  }`}
                >
                  {c}
                </button>
              ))}
              {(!settings?.categories?.length && false) && (
                <p className="text-center font-bold text-[#2D3047]/50 mt-10 uppercase tracking-widest">Sin categorías</p>
              )}
            </div>

            <div className="flex gap-3 mt-auto">
              <button 
                type="button" 
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-4 border-4 border-[#2D3047] rounded-2xl font-black uppercase text-[#2D3047] bg-white"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => { setCategory(tempSelectedCategory); setShowCategoryModal(false); }}
                className="flex-1 py-4 bg-[#1AC0C6] text-white rounded-2xl border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047] active:translate-y-1 active:translate-x-1 active:shadow-none font-black uppercase transition-all"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-md mx-auto h-full flex flex-col relative">

      {addStockPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#FFF9F0]/90 backdrop-blur-sm p-4">
          <form onSubmit={handleAddStock} className="bg-white p-6 rounded-[2rem] border-4 border-[#2D3047] shadow-[8px_8px_0px_0px_#2D3047] w-full max-w-sm">
            <h3 className="text-xl font-black uppercase tracking-tight text-[#2D3047] mb-2">Añadir Stock</h3>
            <p className="text-sm font-bold text-[#2D3047]/60 uppercase mb-4">{addStockPrompt.name} (Actual: {addStockPrompt.stock})</p>
            <input 
              type="number" 
              step={addStockPrompt.isWeighed ? "0.01" : "1"}
              min="0"
              value={addStockAmount}
              onChange={e => setAddStockAmount(e.target.value)}
              className="w-full border-2 border-[#2D3047] bg-[#F7F1E3] rounded-xl px-4 py-3 font-black focus:outline-none focus:border-[#FF6B35] mb-4 text-center text-xl"
              placeholder="Cantidad a sumar..."
              autoFocus
              required
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAddStockPrompt(null)} className="flex-1 py-3 border-2 border-[#2D3047] rounded-xl font-black uppercase text-[#2D3047]">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-[#FF6B35] text-white rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none font-black uppercase transition-all">Sumar</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35]">Inventario</h1>
        <button onClick={openAdd} className="bg-[#2D3047] text-white p-2 rounded-xl shadow-[4px_4px_0px_0px_#FF6B35] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all border-2 border-[#2D3047]">
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
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
        </div>
        <button
          onClick={() => setShowSearchScanner(true)}
          className="bg-[#2D3047] text-white p-3 rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#FF6B35] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none flex items-center justify-center transition-all"
        >
          <ScanBarcode className="w-5 h-5" />
        </button>
      </div>

      {showSearchScanner && <Scanner onScan={handleSearchScan} onClose={() => setShowSearchScanner(false)} />}

      <div className="flex-1 overflow-y-auto space-y-3">
        {products?.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-[1.5rem] border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047] flex justify-between items-center">
            <div>
              <h3 className="font-black text-[#2D3047] uppercase">{p.name}</h3>
              <p className="text-[10px] font-bold text-[#2D3047]/60 uppercase">{p.barcode}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-sm font-black text-[#FF6B35]">${p.priceUSD.toFixed(2)}</span>
                <span className={`text-sm font-black uppercase ${p.stock <= p.minStock ? 'text-red-500' : 'text-[#2D3047]'}`}>
                  Stock: {p.stock}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setAddStockPrompt(p); setAddStockAmount(''); }} className="p-2 text-[#2D3047] bg-[#F7F1E3] rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                <Plus className="w-5 h-5" strokeWidth={3} />
              </button>
              <button onClick={() => openEdit(p)} className="p-2 text-white bg-[#1AC0C6] rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                <Edit2 className="w-5 h-5" />
              </button>
              <button onClick={() => p.id && handleDelete(p.id)} className="p-2 text-white bg-red-500 rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {products?.length === 0 && (
          <div className="text-center py-10 text-[#2D3047]/50 font-black uppercase tracking-widest">
            No se encontraron productos
          </div>
        )}
      </div>
    </div>
  );
}
