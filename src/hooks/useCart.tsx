import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      
      const productExistsInCart = updatedCart.find(product => product.id === productId);
      const productAmount = productExistsInCart?.amount ? productExistsInCart.amount : 0;

      const {data: productStock} = await api.get(`/stock/${productId}`);

      const productStockAmount = productStock.amount;

      if (!(productAmount < productStockAmount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistsInCart) {
        productExistsInCart.amount += 1;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        const {data: product} = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product,
          amount: 1,
        }

        setCart([newProduct, ...updatedCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([newProduct, ...updatedCart]));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex < 0) {
        throw new Error();
      }

      updatedCart.splice(productIndex, 1);
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex < 0) {
        throw new Error();
      }

      if (amount <= 0) {
        throw new Error();
      }

      const productStock = await api.get(`/stock/${productId}`).then(response => {
        const { data } = response;

        return data as Stock;
      });

      if (!(amount < productStock.amount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      updatedCart[productIndex].amount = amount;
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}