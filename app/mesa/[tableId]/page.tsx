"use client"

import { use, useEffect, useState } from "react"
import apiClient from "@/lib/api-client"
import { useCartStore } from "@/store/cart-store"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ShoppingCart, Plus, Minus, ChefHat, Trash2, CheckCircle2 } from "lucide-react"

export default function KioskPage({ params }: { params: Promise<{ tableId: string }> }) {
  const [catalog, setCatalog] = useState<any[]>([])
  
  // Desenvolvemos la promesa con 'use()'
  const resolvedParams = use(params);
  const currentTableId = resolvedParams.tableId;

  // ESTADOS DEL UI
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([])
  const [wantsExtraCheese, setWantsExtraCheese] = useState(false)
  const EXTRA_CHEESE_ID = "b3e7178a-a5c6-43b9-a1b7-b016d47b74f3";

  // NUEVOS ESTADOS PARA EL CARRITO Y EL ENVÍO
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  const { items, addItem, removeItem, clearCart, getTotal } = useCartStore()

  // --- SOLUCIÓN PARA EL NOMBRE DE LA MESA ---
  const getTableName = (rawId: string) => {
    if (!rawId) return "Barra";
    // Limpiamos espacios y pasamos todo a minúsculas por si la URL varió
    const id = rawId.trim().toLowerCase(); 
    
    // Comprobamos si INCLUYE la primera parte del ID por máxima seguridad
    if (id.includes("06c06156")) return "Mesa 1";
    
    return `Mesa (${id.substring(0, 4)})`;
  };

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await apiClient.get('/gestion/productos')
        const data = Array.isArray(res.data) ? res.data : res.data.data || []
        setCatalog(data)
      } catch (error) {
        console.error("Error al cargar productos:", error)
      }
    }
    fetchCatalog()
  }, [])

  const toggleIngredient = (ingredientId: string) => {
    if (removedIngredients.includes(ingredientId)) {
      setRemovedIngredients(prev => prev.filter(id => id !== ingredientId))
    } else {
      setRemovedIngredients(prev => [...prev, ingredientId])
    }
  }

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const extraCost = wantsExtraCheese ? 1.50 : 0;
    const finalPrice = selectedProduct.price + extraCost;

    addItem({
      cartItemId: Math.random().toString(36).substring(7),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      basePrice: selectedProduct.price,
      quantity: quantity,
      finalPrice: finalPrice,
      customizations: {
        added: wantsExtraCheese ? [EXTRA_CHEESE_ID] : [],
        removed: removedIngredients
      }
    });

    setSelectedProduct(null);
    setQuantity(1);
    setRemovedIngredients([]);
    setWantsExtraCheese(false);
  }

  // --- EL CEREBRO DE ENVIAR EL PEDIDO A LA COCINA ---
  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      // 1. Construimos el JSON exactamente como te lo pide tu Gateway
      const orderPayload = {
        tableId: currentTableId,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          customizations: item.customizations
        }))
      };

      // 2. Lo enviamos (como hacíamos en Postman)
      await apiClient.post('/gestion/pedidos', orderPayload);
      
      // 3. Magia UI: Vaciamos carrito y mostramos mensaje de éxito
      clearCart();
      setIsCartOpen(false);
      setOrderSuccess(true);
      
      // A los 3 segundos ocultamos el mensaje de éxito
      setTimeout(() => setOrderSuccess(false), 3000);
      
    } catch (error) {
      console.error("❌ Error enviando a cocina:", error);
      alert("Hubo un problema al enviar el pedido. Llama al camarero.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 relative">
      {/* MENSAJE FLOTANTE DE ÉXITO */}
      {orderSuccess && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top-5 fade-in">
          <div className="bg-green-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 font-bold text-lg">
            <CheckCircle2 />
            ¡Pedido enviado a cocina!
          </div>
        </div>
      )}

      {/* CABECERA */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary">
            <ChefHat size={28} />
            <h1 className="text-xl font-black tracking-tight">Menú Digital</h1>
          </div>
          <div className="bg-zinc-100 px-4 py-2 rounded-full font-bold text-zinc-800 flex items-center gap-2 border border-zinc-200">
            {getTableName(currentTableId)}
          </div>
        </div>
      </header>

      {/* CATÁLOGO */}
      <main className="max-w-4xl mx-auto p-4 mt-4">
        <h2 className="text-2xl font-bold mb-6">Nuestra Carta</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {catalog.map((product) => (
            <Card 
              key={product.id} 
              className="p-4 flex gap-4 cursor-pointer hover:shadow-md transition active:scale-[0.98] border-zinc-200"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="w-24 h-24 bg-zinc-200 rounded-lg flex-shrink-0"></div>
              
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                    {product.ingredients?.map((i:any) => i.name).join(', ') || 'Delicioso plato preparado al momento.'}
                  </p>
                </div>
                <div className="font-black text-lg mt-2">${product.price.toFixed(2)}</div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* BOTÓN FLOTANTE DEL CARRITO */}
      {items.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 animate-in slide-in-from-bottom-5">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm text-zinc-500 font-medium">{items.length} producto(s)</span>
              <span className="text-2xl font-black">${getTotal().toFixed(2)}</span>
            </div>
            <Button size="lg" className="px-8 text-lg rounded-full font-bold shadow-md" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="mr-2" />
              Ver Bandeja
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DEL CARRITO DE LA COMPRA (Resumen antes de pagar) */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl h-[85vh] sm:h-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Tu Bandeja</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between items-start border-b border-zinc-100 pb-4">
                <div className="flex-1">
                  <div className="font-bold text-lg">
                    <span className="text-primary mr-2">{item.quantity}x</span>
                    {item.name}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {item.customizations.added.length > 0 && <span className="text-green-600 block">+ Extra Queso</span>}
                    {item.customizations.removed.length > 0 && <span className="text-red-500 line-through block">- Sin algún ingrediente</span>}
                  </div>
                  <div className="font-medium mt-1">${(item.finalPrice * item.quantity).toFixed(2)}</div>
                </div>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeItem(item.cartItemId)}>
                  <Trash2 size={20} />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col gap-3 sm:gap-0 pt-4 border-t mt-auto">
            <div className="flex justify-between items-center w-full mb-4 px-2">
              <span className="text-lg font-bold text-zinc-500">Total a pagar</span>
              <span className="text-3xl font-black">${getTotal().toFixed(2)}</span>
            </div>
            <Button 
              className="w-full text-xl h-16 rounded-2xl font-black shadow-lg" 
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando a cocina..." : "Confirmar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PERSONALIZACIÓN DE PRODUCTO (Se queda igual que ayer) */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{selectedProduct?.name}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {selectedProduct?.ingredients && selectedProduct.ingredients.length > 0 && (
              <div>
                <h4 className="font-bold mb-3 uppercase text-xs text-zinc-500 tracking-wider">Ingredientes (Toca para quitar)</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.ingredients.map((ing: any) => {
                    const isRemoved = removedIngredients.includes(ing.id);
                    return (
                      <Badge 
                        key={ing.id}
                        variant={isRemoved ? "outline" : "default"}
                        className={`cursor-pointer px-3 py-1 text-sm ${isRemoved ? 'line-through text-red-400 bg-red-50 border-red-200' : 'bg-zinc-800'}`}
                        onClick={() => toggleIngredient(ing.id)}
                      >
                        {isRemoved ? `Sin ${ing.name}` : ing.name}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold mb-3 uppercase text-xs text-zinc-500 tracking-wider">Añadir Extras</h4>
              <div 
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${wantsExtraCheese ? 'border-green-500 bg-green-50' : 'border-zinc-200'}`}
                onClick={() => setWantsExtraCheese(!wantsExtraCheese)}
              >
                <div>
                  <p className="font-bold">Extra de Queso Cheddar</p>
                  <p className="text-sm text-zinc-500">+ $1.50</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${wantsExtraCheese ? 'border-green-500 bg-green-500 text-white' : 'border-zinc-300'}`}>
                  {wantsExtraCheese && <Plus size={16} />}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-bold">Cantidad</span>
              <div className="flex items-center gap-4 bg-zinc-100 rounded-full p-1">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus size={18} />
                </Button>
                <span className="font-bold w-4 text-center">{quantity}</span>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQuantity(quantity + 1)}>
                  <Plus size={18} />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full text-lg h-14 rounded-xl font-bold" onClick={handleAddToCart}>
              Añadir por ${( (selectedProduct?.price + (wantsExtraCheese ? 1.50 : 0)) * quantity ).toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}