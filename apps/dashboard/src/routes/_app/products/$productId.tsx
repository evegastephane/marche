import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, PackageX } from 'lucide-react';
import { motion } from 'motion/react';
import { useProduct } from '@/features/products/api';
import { ProductForm } from '@/features/products/product-form';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApiError, errorMessage } from '@/shared/api/client';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/products/$productId')({
  component: ProduitDetail,
});

function ProduitDetail() {
  const { productId } = Route.useParams();
  const product = useProduct(productId);
  const store = useCurrentStore();

  return (
    <div className="flex flex-col gap-6">
      <motion.div variants={riseIn} className="self-start">
        <Link
          to="/products"
          className="group inline-flex items-center gap-1.5 text-[0.875rem] font-[560] text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} /> Produits
        </Link>
      </motion.div>
      {product.error ? (
        product.error instanceof ApiError && product.error.code === 'NOT_FOUND' ? (
          <div className="panel">
            <EmptyState icon={PackageX} title="Produit introuvable">
              Il a peut-être été supprimé, ou appartient à une autre boutique.
            </EmptyState>
          </div>
        ) : (
          <LoadError message={errorMessage(product.error)} onRetry={() => void product.refetch()} />
        )
      ) : product.data && store.data ? (
        // La clé réinitialise le formulaire si le produit change de version.
        <ProductForm
          key={`${product.data.id}-${product.data.version}`}
          product={product.data}
          currency={store.data.currency}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-96" />
        </div>
      )}
    </div>
  );
}
