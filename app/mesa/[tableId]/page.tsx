"use client"

import { use, useEffect, useState } from "react"
import apiClient from "@/lib/api-client"
import { useCartStore } from "@/store/cart-store"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// 👇 1. Importamos DialogDescription para calmar la advertencia de Accesibilidad
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { ShoppingCart, Plus, Minus, ChefHat, Trash2, CheckCircle2, Check } from "lucide-react"

export default function KioskPage({ params }: { params: Promise<{ tableId: string }> }) {
  const [catalog, setCatalog] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("all")
  
  const resolvedParams = use(params);
  const currentTableId = resolvedParams.tableId;

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [quantity, setQuantity] = useState(1)
  
  const [selectedExtras, setSelectedExtras] = useState<any[]>([])
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([])

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  const { items, addItem, removeItem, clearCart } = useCartStore()

  const getTableName = (rawId: string) => {
    if (!rawId) return "Barra";
    const id = rawId.trim().toLowerCase(); 
    if (id.includes("06c06156")) return "Mesa 1";
    return `Mesa (${id.substring(0, 4)})`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          apiClient.get('/gestion/productos'),
          apiClient.get('/gestion/categorias')
        ]);
        setCatalog(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.data || []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.data || []);
      } catch (error) {
        console.error("Error al cargar menú:", error)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setSelectedExtras([]);
      setRemovedIngredients([]);
    }
  }, [selectedProduct])

  const filteredCatalog = activeCategory === "all" 
    ? catalog 
    : catalog.filter(product => product.categoryId === activeCategory);

  const getFixedImageUrl = (url?: string) => {
    if (!url) return "";
    if (typeof window !== 'undefined') {
      const currentIp = window.location.hostname;
      return url.replace('localhost', currentIp);
    }
    return url;
  };

  const calculatedTotal = items.reduce((total, item) => {
    const base = Number(item.basePrice) || 0;
    const extra = Number(item.extraPrice) || 0;
    const qty = Number(item.quantity) || 1;
    return total + ((base + extra) * qty);
  }, 0);

  const toggleExtra = (extra: any) => {
    setSelectedExtras(prev => 
      prev.some(e => e.name === extra.name) 
        ? prev.filter(e => e.name !== extra.name)
        : [...prev, extra]
    )
  }

  const toggleRemoveIngredient = (ingName: string) => {
    setRemovedIngredients(prev => 
      prev.includes(ingName)
        ? prev.filter(n => n !== ingName)
        : [...prev, ingName]
    )
  }

  const quickAddToCart = (product: any) => {
    const existingItem = items.find(item => 
      item.productId === product.id && 
      (!item.customizations?.added || item.customizations.added.length === 0) &&
      (!item.customizations?.removed || item.customizations.removed.length === 0)
    );

    if (existingItem) {
      removeItem(existingItem.cartItemId);
      addItem({ ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
      addItem({
        cartItemId: Math.random().toString(36).substring(7),
        productId: product.id,
        name: product.name,
        basePrice: Number(product.price) || 0,
        extraPrice: 0,
        quantity: 1,
        customizations: { added: [], removed: [] }
      });
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    const extraCost = selectedExtras.reduce((sum, e) => sum + Number(e.price), 0);
    const addedExtrasNames = selectedExtras.map(e => e.name);

    const existingItem = items.find(item => 
      item.productId === selectedProduct.id &&
      JSON.stringify(item.customizations?.added || []) === JSON.stringify(addedExtrasNames) &&
      JSON.stringify(item.customizations?.removed || []) === JSON.stringify(removedIngredients)
    );

    if (existingItem) {
      removeItem(existingItem.cartItemId);
      addItem({ ...existingItem, quantity: existingItem.quantity + quantity });
    } else {
      addItem({
        cartItemId: Math.random().toString(36).substring(7),
        productId: selectedProduct.id,
        name: selectedProduct.name,
        basePrice: Number(selectedProduct.price) || 0,
        extraPrice: extraCost,
        quantity: quantity,
        customizations: {
          added: addedExtrasNames,
          removed: removedIngredients
        }
      });
    }

    // 👇 2. Retrasamos el cierre 50ms para evitar el error de "releasePointerCapture"
    setTimeout(() => {
      setSelectedProduct(null);
    }, 50);
  }

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderPayload = {
        tableId: currentTableId,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          customizations: item.customizations
        }))
      };

      await apiClient.post('/gestion/pedidos', orderPayload);
      clearCart();
      
      // 👇 2. También aquí retrasamos el cierre 50ms
      setTimeout(() => {
        setIsCartOpen(false);
      }, 50);
      
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (error) {
      alert("Hubo un problema al enviar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 relative">
      {orderSuccess && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top-5 fade-in">
          <div className="bg-green-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 font-bold text-lg">
            <CheckCircle2 /> ¡Pedido enviado a cocina!
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-zinc-900">
            <ChefHat size={28} />
            <h1 className="text-xl font-black tracking-tight">Menú Digital</h1>
          </div>
          <div className="bg-zinc-100 px-4 py-2 rounded-full font-bold text-zinc-800 flex items-center gap-2 border border-zinc-200">
            {getTableName(currentTableId)}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-4 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-2 w-max">
            <Button variant={activeCategory === "all" ? "default" : "outline"} className="rounded-full font-bold bg-zinc-900 text-white" onClick={() => setActiveCategory("all")}>Todos</Button>
            {categories.map(cat => (
              <Button key={cat.id} variant={activeCategory === cat.id ? "default" : "outline"} className={`rounded-full font-bold ${activeCategory === cat.id ? 'bg-zinc-900 text-white' : ''}`} onClick={() => setActiveCategory(cat.id)}>{cat.name}</Button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-2">
        {filteredCatalog.length === 0 ? (
          <div className="text-center p-10 text-zinc-500 font-medium">Aún no hay productos en esta categoría.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredCatalog.map((product) => (
              <Card key={product.id} className="p-3 flex gap-4 cursor-pointer hover:shadow-md transition active:scale-[0.98] border-zinc-200" onClick={() => setSelectedProduct(product)}>
                <div className="w-28 h-28 bg-zinc-100 rounded-lg flex-shrink-0 overflow-hidden border border-zinc-100">
                  {product.image ? (
                    <img src={getFixedImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300"><ChefHat size={32} /></div>
                  )}
                </div>
                
                <div className="flex flex-col justify-between flex-1 py-1">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="font-black text-xl text-zinc-900">${Number(product.price).toFixed(2)}</div>
                    <button className="w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); quickAddToCart(product); }}><Plus size={20} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {items.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 animate-in slide-in-from-bottom-5">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm text-zinc-500 font-medium">{items.length} producto(s)</span>
              <span className="text-2xl font-black text-zinc-900">${calculatedTotal.toFixed(2)}</span>
            </div>
            <Button size="lg" className="px-8 text-lg rounded-full font-bold shadow-md bg-zinc-900 text-white" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="mr-2" /> Ver Bandeja
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DEL CARRITO */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl h-[85vh] sm:h-auto flex flex-col p-0 border-0 overflow-hidden">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-zinc-900">Tu Bandeja</DialogTitle>
              {/* 👇 1. Añadimos sr-only para que sea invisible visualmente pero el lector de pantallas lo lea */}
              <DialogDescription className="sr-only">Revisa los productos antes de enviarlos a cocina</DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between items-start border-b border-zinc-100 pb-4">
                <div className="flex-1">
                  <div className="font-bold text-lg text-zinc-900">
                    <span className="text-zinc-500 mr-2">{item.quantity}x</span>{item.name}
                  </div>
                  <div className="text-sm mt-1">
                    {item.customizations?.added?.map((extraName: string, i: number) => (
                      <span key={i} className="text-emerald-600 font-medium block">+ Extra {extraName}</span>
                    ))}
                    {item.customizations?.removed?.map((ingName: string, i: number) => (
                      <span key={i} className="text-rose-500 font-medium line-through block">- Sin {ingName}</span>
                    ))}
                  </div>
                  <div className="font-medium mt-1 text-zinc-900">${((Number(item.basePrice) * item.quantity) + Number(item.extraPrice)).toFixed(2)}</div>
                </div>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => removeItem(item.cartItemId)}><Trash2 size={20} /></Button>
              </div>
            ))}
          </div>
          
          <div className="p-6 bg-white border-t mt-auto">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="text-lg font-bold text-zinc-500">Total a pagar</span>
              <span className="text-3xl font-black text-zinc-900">${calculatedTotal.toFixed(2)}</span>
            </div>
            <Button className="w-full text-xl h-16 rounded-2xl font-black shadow-lg bg-zinc-900 text-white" onClick={handleSubmitOrder} disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Confirmar Pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PERSONALIZACIÓN DEL PRODUCTO */}
      <Dialog open={!!selectedProduct} onOpenChange={() => {
        // En caso de que se cierre clicando fuera, aplicamos también el retraso
        setTimeout(() => setSelectedProduct(null), 50);
      }}>
        <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] p-0 border-0 flex flex-col overflow-hidden bg-white">
          
          <div className="flex-1 overflow-y-auto">
            {selectedProduct?.image ? (
              <div className="w-full h-40 sm:h-48 bg-zinc-200 flex-shrink-0">
                <img src={getFixedImageUrl(selectedProduct.image)} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-32 sm:h-40 bg-zinc-900 flex items-center justify-center text-white flex-shrink-0"><ChefHat size={48} /></div>
            )}

            <div className="p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-black text-zinc-900">{selectedProduct?.name}</DialogTitle>
                {/* 👇 1. Cambiamos la etiqueta <p> por <DialogDescription> para cumplir con la Accesibilidad */}
                <DialogDescription className="text-zinc-500 text-sm mt-2">
                  {selectedProduct?.description || "Personaliza tu pedido a tu gusto"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pb-2">
                {selectedProduct?.ingredients?.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-3 uppercase text-xs text-zinc-500 tracking-wider">Quitar Ingredientes</h4>
                    <div className="space-y-2">
                      {selectedProduct.ingredients.map((ing: any) => {
                        const isRemoved = removedIngredients.includes(ing.name);
                        return (
                          <div 
                            key={ing.id} 
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${isRemoved ? 'border-rose-500 bg-rose-50' : 'border-zinc-200'}`}
                            onClick={() => toggleRemoveIngredient(ing.name)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${isRemoved ? 'bg-rose-500 border-rose-500 text-white' : 'border-zinc-300 bg-white'}`}>
                                {isRemoved && <Check size={14} />}
                              </div>
                              <p className={`font-bold ${isRemoved ? 'text-rose-700 line-through' : 'text-zinc-900'}`}>
                                Sin {ing.name}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {selectedProduct?.extras?.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-3 uppercase text-xs text-zinc-500 tracking-wider">Añadir Extras</h4>
                    <div className="space-y-2">
                      {selectedProduct.extras.map((extra: any, idx: number) => {
                        const isSelected = selectedExtras.some(e => e.name === extra.name);
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${isSelected ? 'border-emerald-600 bg-emerald-50' : 'border-zinc-200'}`}
                            onClick={() => toggleExtra(extra)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 bg-white'}`}>
                                {isSelected && <Check size={14} />}
                              </div>
                              <p className={`font-bold ${isSelected ? 'text-emerald-800' : 'text-zinc-900'}`}>
                                {extra.name}
                              </p>
                            </div>
                            <p className="text-sm font-black text-zinc-600">+{Number(extra.price).toFixed(2)}€</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="font-bold text-lg text-zinc-900">Cantidad</span>
                  <div className="flex items-center gap-4 bg-zinc-100 rounded-full p-1">
                    <Button variant="ghost" size="icon" className="rounded-full text-zinc-900" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></Button>
                    <span className="font-bold w-4 text-center text-lg text-zinc-900">{quantity}</span>
                    <Button variant="ghost" size="icon" className="rounded-full text-zinc-900" onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10 mt-auto">
            <Button className="w-full text-xl h-14 rounded-xl font-black shadow-md bg-zinc-900 text-white" onClick={handleAddToCart}>
              Añadir - ${( (Number(selectedProduct?.price) + selectedExtras.reduce((sum, e) => sum + Number(e.price), 0)) * quantity ).toFixed(2)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}