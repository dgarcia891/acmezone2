import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Product, useProducts } from '@/hooks/useProducts';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductEditorProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ProductEditor = ({ product, open, onClose, onSave }: ProductEditorProps) => {
  const { updateProduct, createProduct } = useProducts();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    slug: '',
    summary: '',
    description: '',
    features: [''],
    tags: [''],
    category: '',
    price_label: '',
    image: '',
    images: [''],
    seo_title: '',
    seo_description: '',
    type: '',
    link: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name,
        slug: product.slug,
        summary: product.summary,
        description: product.description,
        features: product.features.length > 0 ? product.features : [''],
        tags: product.tags.length > 0 ? product.tags : [''],
        category: product.category,
        price_label: product.price_label || '',
        image: product.image,
        images: product.images && product.images.length > 0 ? product.images : [''],
        seo_title: product.seo_title || '',
        seo_description: product.seo_description || '',
        type: product.type || '',
        link: product.link || '',
        is_active: product.is_active,
        display_order: product.display_order,
      });
    } else {
      setFormData({
        id: '',
        name: '',
        slug: '',
        summary: '',
        description: '',
        features: [''],
        tags: [''],
        category: '',
        price_label: '',
        image: '',
        images: [''],
        seo_title: '',
        seo_description: '',
        type: '',
        link: '',
        is_active: true,
        display_order: 0,
      });
    }
  }, [product, open]);

  const handleArrayChange = (
    field: 'features' | 'tags' | 'images',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleArrayAdd = (field: 'features' | 'tags' | 'images') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const handleArrayRemove = (field: 'features' | 'tags' | 'images', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        ...formData,
        features: formData.features.filter(f => f.trim() !== ''),
        tags: formData.tags.filter(t => t.trim() !== ''),
        images: formData.images.filter(i => i.trim() !== ''),
        price_label: formData.price_label || null,
        seo_title: formData.seo_title || null,
        seo_description: formData.seo_description || null,
        type: formData.type || null,
        link: formData.link || null,
      };

      let success: boolean;
      if (product) {
        success = await updateProduct(product.id, productData);
      } else {
        success = await createProduct(productData);
      }

      if (success) {
        toast({
          title: product ? 'Product Updated' : 'Product Created',
          description: `${formData.name} has been ${product ? 'updated' : 'created'} successfully.`,
        });
        onSave();
        onClose();
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Create Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Make changes to this product.' : 'Add a new product to your catalog.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id">Product ID</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="unique-product-id"
                    disabled={!!product}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="product-url-slug"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief product summary..."
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Full product description with markdown support..."
                  rows={8}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Extensions"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="Chrome Extension"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_label">Price Label</Label>
                  <Input
                    id="price_label"
                    value={formData.price_label}
                    onChange={e => setFormData(prev => ({ ...prev, price_label: e.target.value }))}
                    placeholder="From $15"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Features</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleArrayAdd('features')}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Feature
                </Button>
              </div>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={e => handleArrayChange('features', index, e.target.value)}
                    placeholder="Feature description..."
                  />
                  {formData.features.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArrayRemove('features', index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Tags</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleArrayAdd('tags')}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Tag
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <div key={index} className="flex gap-1 items-center">
                    <Input
                      value={tag}
                      onChange={e => handleArrayChange('tags', index, e.target.value)}
                      placeholder="tag"
                      className="w-32"
                    />
                    {formData.tags.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleArrayRemove('tags', index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Images</h3>
              
              <div className="space-y-2">
                <Label htmlFor="image">Main Image URL</Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={e => setFormData(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="/lovable-uploads/image.png"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Additional Images</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleArrayAdd('images')}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Image
                  </Button>
                </div>
                {formData.images.map((img, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={img}
                      onChange={e => handleArrayChange('images', index, e.target.value)}
                      placeholder="/lovable-uploads/image.png"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArrayRemove('images', index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Links</h3>
              <div className="space-y-2">
                <Label htmlFor="link">External Link (optional)</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="https://chrome.google.com/webstore/..."
                />
              </div>
            </div>

            {/* SEO */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">SEO</h3>
              
              <div className="space-y-2">
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={formData.seo_title}
                  onChange={e => setFormData(prev => ({ ...prev, seo_title: e.target.value }))}
                  placeholder="Product Name - Acme Zone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  value={formData.seo_description}
                  onChange={e => setFormData(prev => ({ ...prev, seo_description: e.target.value }))}
                  placeholder="Meta description for search engines..."
                  rows={2}
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active (visible to public)</Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditor;
