import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductForm } from '@/features/products/product-form';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { Skeleton } from '@/shared/ui/feedback';
import { riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/products/new')({
  component: NouveauProduit,
});

function NouveauProduit() {
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
      {store.data ? <ProductForm currency={store.data.currency} /> : <Skeleton className="h-96" />}
    </div>
  );
}
