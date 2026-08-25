import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, TrendingUp, Package, Settings as SettingsIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState('');
  
  const settings = useLiveQuery(() => db.settings.get(1));
  
  useEffect(() => {
    if (showSettings && settings) {
      setTempCategories(settings.categories || ['Víveres', 'Charcutería', 'Carnicería', 'Frutas y Verduras']);
    }
  }, [showSettings, settings]);

  const handleAddCategory = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newCat.trim() && !tempCategories.includes(newCat.trim())) {
      setTempCategories([...tempCategories, newCat.trim()]);
      setNewCat('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setTempCategories(tempCategories.filter(c => c !== cat));
  };

  const products = useLiveQuery(() => db.products.toArray());
  const allSales = useLiveQuery(() => db.sales.toArray());

  const lowStockProducts = products?.filter(p => p.stock <= p.minStock) || [];
  const todaySales = allSales?.filter(s => isSameDay(new Date(s.date), new Date())) || [];
  
  const todayTotalUSD = todaySales.reduce((sum, s) => sum + s.totalUSD, 0);
  const todayTotalVES = todaySales.reduce((sum, s) => sum + s.totalVES, 0);

  // Prepare chart data (last 7 days)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const daySales = allSales?.filter(s => isSameDay(new Date(s.date), d)) || [];
    const total = daySales.reduce((sum, s) => sum + s.totalUSD, 0);
    return {
      name: format(d, 'EEE', { locale: es }),
      total: Number(total.toFixed(2))
    };
  });

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rate = Number(fd.get('rate'));
    if (rate > 0) {
      await db.settings.put({ 
        id: 1, 
        exchangeRateVES: rate,
        businessName: fd.get('businessName') as string,
        rif: fd.get('rif') as string,
        address: fd.get('address') as string,
        phone: fd.get('phone') as string,
        categories: tempCategories
      });
      setShowSettings(false);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35]">Resumen</h1>
        <button onClick={() => setShowSettings(true)} className="p-2 bg-white border-2 border-[#2D3047] rounded-xl text-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 bg-white rounded-[1.5rem] shadow-[4px_4px_0px_0px_#2D3047] border-4 border-[#2D3047]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black uppercase tracking-tight">Ajustes del Negocio</h2>
            <button onClick={() => setShowSettings(false)} className="text-[#2D3047] font-black underline text-sm uppercase">Cerrar</button>
          </div>
          <form onSubmit={handleSaveSettings} className="space-y-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#2D3047] mb-1">Tasa de Cambio (VES)</label>
              <input name="rate" type="number" step="0.01" defaultValue={settings?.exchangeRateVES} className="w-full border-2 border-[#2D3047] bg-[#F7F1E3] rounded-xl px-3 py-2 font-black focus:outline-none focus:border-[#FF6B35]" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#2D3047] mb-1">Nombre de la Bodega</label>
              <input name="businessName" type="text" defaultValue={settings?.businessName} className="w-full border-2 border-[#2D3047] rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#FF6B35]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#2D3047] mb-1">RIF / CI</label>
                <input name="rif" type="text" defaultValue={settings?.rif} className="w-full border-2 border-[#2D3047] rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#FF6B35]" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#2D3047] mb-1">Teléfono</label>
                <input name="phone" type="text" defaultValue={settings?.phone} className="w-full border-2 border-[#2D3047] rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#FF6B35]" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#2D3047] mb-1">Dirección</label>
              <input name="address" type="text" defaultValue={settings?.address} className="w-full border-2 border-[#2D3047] rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#FF6B35]" />
            </div>
            
            <div className="pt-2 border-t-2 border-dashed border-[#2D3047]/20">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#2D3047] mb-2">Categorías de Productos</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tempCategories.map(cat => (
                  <span key={cat} className="bg-[#2D3047] text-white text-xs font-black px-2 py-1.5 rounded-md flex items-center gap-1">
                    {cat}
                    <button type="button" onClick={() => handleRemoveCategory(cat)} className="text-[#FF6B35] hover:text-white font-black text-sm leading-none ml-1">&times;</button>
                  </span>
                ))}
                {tempCategories.length === 0 && <span className="text-xs text-[#2D3047]/50 font-bold uppercase">Sin categorías</span>}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCat} 
                  onChange={e => setNewCat(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory(e as any))}
                  className="flex-1 border-2 border-[#2D3047] rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#FF6B35] text-sm" 
                  placeholder="Nueva categoría..."
                />
                <button type="button" onClick={handleAddCategory} className="bg-[#1AC0C6] text-white px-3 py-2 rounded-xl font-black uppercase shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all text-xs tracking-wider">Añadir</button>
              </div>
            </div>

            <button type="submit" className="w-full mt-4 bg-[#FF6B35] text-white px-4 py-3 rounded-xl font-black uppercase shadow-[2px_2px_0px_0px_#2D3047] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">Guardar Ajustes</button>
          </form>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1AC0C6] text-white p-4 rounded-[1.5rem] border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047]">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] uppercase font-black tracking-widest">Hoy (USD)</span>
          </div>
          <div className="text-3xl font-black tracking-tighter">${todayTotalUSD.toFixed(2)}</div>
        </div>
        <div className="bg-[#FF6B35] text-white p-4 rounded-[1.5rem] border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047]">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] uppercase font-black tracking-widest">Hoy (VES)</span>
          </div>
          <div className="text-3xl font-black tracking-tighter">Bs{todayTotalVES.toFixed(2)}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-[1.5rem] border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047] mb-6">
        <h2 className="text-lg font-black uppercase tracking-tight mb-4">Últimos 7 Días (USD)</h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#2D3047', fontWeight: 900 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#2D3047', fontWeight: 900 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: '2px solid #2D3047', boxShadow: '4px 4px 0px 0px #2D3047', fontWeight: 900 }}
                itemStyle={{ color: '#FF6B35', fontWeight: '900' }}
              />
              <Line type="monotone" dataKey="total" stroke="#FF6B35" strokeWidth={4} dot={{ r: 4, fill: '#2D3047', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#FF6B35' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black uppercase tracking-tight">Alertas de Stock</h2>
          {lowStockProducts.length > 0 && (
             <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full">{lowStockProducts.length} CRÍTICOS</span>
          )}
        </div>
        
        {lowStockProducts.length === 0 ? (
          <div className="bg-white border-2 border-[#2D3047] border-dashed rounded-[1.5rem] p-4 text-center text-gray-500 font-bold text-sm">
            Todo el inventario en niveles óptimos.
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockProducts.map(p => (
              <div key={p.id} className="bg-orange-50 p-3 border-l-4 border-orange-500 rounded-r-xl border-y-2 border-r-2 border-y-[#2D3047] border-r-[#2D3047] flex justify-between items-center shadow-[2px_2px_0px_0px_#2D3047]">
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{p.name}</h3>
                  <p className="text-[10px] uppercase font-black text-orange-600">Quedan: {p.stock} (Mín: {p.minStock})</p>
                </div>
                <button className="text-[10px] font-black underline">REVISAR</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
