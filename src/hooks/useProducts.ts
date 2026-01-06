import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  features: string[];
  tags: string[];
  category: string;
  price_label?: string;
  image: string;
  images?: string[];
  seo_title?: string;
  seo_description?: string;
  type?: string;
  link?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('az_products')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      
      setProducts((data as Product[]) || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const getProductBySlug = async (slug: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('az_products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    } catch (err) {
      console.error('Error fetching product:', err);
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('az_products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchProducts();
      return true;
    } catch (err) {
      console.error('Error updating product:', err);
      return false;
    }
  };

  const createProduct = async (product: Omit<Product, 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('az_products')
        .insert(product);

      if (error) throw error;
      
      await fetchProducts();
      return true;
    } catch (err) {
      console.error('Error creating product:', err);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('az_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchProducts();
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    getProductBySlug,
    updateProduct,
    createProduct,
    deleteProduct,
  };
};
