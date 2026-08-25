import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, isSameDay, isSameMonth, isSameYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown, Search, Receipt } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  
  const allSales = useLiveQuery(
    () => db.sales.orderBy('date').reverse().toArray()
  );

  const sales = useMemo(() => {
    if (!allSales) return [];
    return allSales.filter(s => {
      if (searchTerm && !s.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      const today = new Date();
      if (dateFilter === 'today') return isSameDay(s.date, today);
      if (dateFilter === 'month') return isSameMonth(s.date, today);
      if (dateFilter === 'year') return isSameYear(s.date, today);
      return true;
    });
  }, [allSales, searchTerm, dateFilter]);

  const exportPDF = () => {
    if (!sales || sales.length === 0) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Mi Bodeguita - Reporte de Ventas', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Fecha de exportación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

    const tableData = sales.map(s => [
      format(s.date, 'dd/MM/yyyy HH:mm'),
      s.clientName,
      s.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      `$${s.totalUSD.toFixed(2)}`,
      `Bs ${s.totalVES.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Fecha', 'Cliente', 'Artículos', 'Total USD', 'Total VES']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 184, 166] } // teal-500
    });

    doc.save(`Ventas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportCSV = () => {
    if (!sales || sales.length === 0) return;
    
    const headers = ['Fecha', 'Cliente', 'Artículos', 'Total USD', 'Total VES'];
    const rows = sales.map(s => [
      format(s.date, 'yyyy-MM-dd HH:mm:ss'),
      `"${s.clientName}"`,
      s.items.reduce((sum, item) => sum + item.quantity, 0),
      s.totalUSD.toFixed(2),
      s.totalVES.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ventas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35]">Historial</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 bg-white text-[#2D3047] rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] text-sm font-black active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center gap-1 uppercase">
             CSV
          </button>
          <button onClick={exportPDF} className="px-3 py-2 bg-[#1AC0C6] text-white rounded-xl border-2 border-[#2D3047] shadow-[2px_2px_0px_0px_#2D3047] text-sm font-black active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center gap-1 uppercase">
            <FileDown className="w-4 h-4" strokeWidth={3} /> PDF
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[#2D3047]" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border-2 border-[#2D3047] rounded-xl bg-white font-bold focus:outline-none focus:border-[#FF6B35]"
            placeholder="BUSCAR CLIENTE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          value={dateFilter} 
          onChange={e => setDateFilter(e.target.value)}
          className="border-2 border-[#2D3047] rounded-xl px-3 py-3 font-black text-sm uppercase focus:outline-none focus:border-[#FF6B35] bg-white text-[#2D3047]"
        >
          <option value="all">Todo</option>
          <option value="today">Hoy</option>
          <option value="month">Mes</option>
          <option value="year">Año</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {sales?.map(sale => (
          <div key={sale.id} className="bg-white p-4 rounded-[1.5rem] border-4 border-[#2D3047] shadow-[4px_4px_0px_0px_#2D3047]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-black text-[#2D3047] uppercase text-lg leading-tight">{sale.clientName}</h3>
                <p className="text-[10px] font-bold text-[#2D3047]/60 uppercase">{format(sale.date, "d MMM yyyy, h:mm a", { locale: es })}</p>
              </div>
              <div className="text-right">
                <div className="font-black text-[#FF6B35] text-xl leading-none">${sale.totalUSD.toFixed(2)}</div>
                <div className="text-xs font-black text-[#1AC0C6]">Bs {sale.totalVES.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="bg-[#F7F1E3] rounded-xl p-3 space-y-2 border-2 border-[#2D3047]/10">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-2 text-[#2D3047]">
                    <span className="font-black text-xs bg-[#2D3047] text-white px-2 py-0.5 rounded-md">{item.quantity}x</span>
                    <span className="font-bold truncate max-w-[140px] uppercase text-xs">{item.name}</span>
                  </div>
                  <div className="text-[#2D3047] font-black">${(item.priceUSD * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {sales?.length === 0 && (
          <div className="text-center py-10 flex flex-col items-center text-[#2D3047]/40">
            <Receipt className="w-12 h-12 mb-3" />
            <p className="font-black uppercase tracking-widest">No hay ventas</p>
          </div>
        )}
      </div>
    </div>
  );
}
