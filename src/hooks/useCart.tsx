import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
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

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const productExists = newCart.find(product => product.id === productId);
      const productStock: Stock = (await api.get(`stock/${productId}`)).data;
      const currentStockAmount = productExists ? productExists.amount : 0;
      const newAmount = currentStockAmount + 1;

      if (newAmount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (!!productExists) {
        productExists.amount = newAmount;
        setCart(newCart);
        return;
      }

      const selectedProduct = (await api.get(`products/${productId}`)).data;
      newCart.push({
        ...selectedProduct,
        amount: newAmount
      });

      setCart(newCart)

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(product => product.id === productId)
      if (productExists === false) {
        throw Error();
      }
      const newCart = cart.filter(product => product.id !== productId)
      setCart(newCart)

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock: Stock = (await api.get(`stock/${productId}`)).data;

      if (amount < 1) {
        return
      }
      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        throw Error();
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product
      })

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
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
