import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '@/features/products/product-form';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { Skeleton } from '@/shared/ui/feedback';

export const Route = createFileRoute('/_app/products/new')({ component: NouveauProduit });

function NouveauProduit() {
  const store = useCurrentStore();
  return (
    <div className="flex flex-col gap-6">
      <Link to="/products" className="inline-flex items-center gap-1.5 self-start text-[0.875rem] font-semibold text-encre-2 hover:text-encre">
        <ArrowLeft className="size-4" /> Produits
      </Link>
      {store.data ? <ProductForm currency={store.data.currency} /> : <Skeleton className="h-96" />}
    </div>
  );
}
