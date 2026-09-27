import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, PackageX } from 'lucide-react';
import { useProduct } from '@/features/products/api';
import { ProductForm } from '@/features/products/product-form';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApiError, errorMessage } from '@/shared/api/client';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';

export const Route = createFileRoute('/_app/products/$productId')({ component: ProduitDetail });

function ProduitDetail() {
  const { productId } = Route.useParams();
  const product = useProduct(productId);
  const store = useCurrentStore();

  return (
    <div className="flex flex-col gap-6">
      <Link to="/products" className="inline-flex items-center gap-1.5 self-start text-[0.875rem] font-semibold text-encre-2 hover:text-encre">
        <ArrowLeft className="size-4" /> Produits
      </Link>
      {product.error ? (
        product.error instanceof ApiError && product.error.code === 'NOT_FOUND' ? (
          <div className="planche">
            <EmptyState icon={PackageX} title="Produit introuvable">
              Il a peut-être été supprimé, ou appartient à une autre boutique.
            </EmptyState>
          </div>
        ) : (
          <LoadError message={errorMessage(product.error)} onRetry={() => void product.refetch()} />
        )
      ) : product.data && store.data ? (
        // La clé réinitialise le formulaire si le produit change de version.
        <ProductForm key={`${product.data.id}-${product.data.version}`} product={product.data} currency={store.data.currency} />
      ) : (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-96" />
        </div>
      )}
    </div>
  );
}
