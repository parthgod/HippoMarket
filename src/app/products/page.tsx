import MaxWIdthWrapper from "@/components/MaxWIdthWrapper";
import ProductReel from "@/components/ProductReel";
import { PRODUCT_CATEGORIES } from "@/config";

type Param = string | string[] | undefined;

interface ProductPageProps {
  searchParams: { [key: string]: Param };
}

const parse = (param: Param) => {
  return typeof param === "string" ? param : undefined;
};

const ProductsPage = ({ searchParams }: ProductPageProps) => {
  const sort = parse(searchParams.sort);
  const category = parse(searchParams.category);

  const label = PRODUCT_CATEGORIES.find(({ value }) => value === category)?.label;

  return (
    <MaxWIdthWrapper>
      <ProductReel
        title={label ?? "Browse high quality assets"}
        query={{ category, limit: 40, sort: sort === "desc" || sort === "asc" ? sort : undefined }}
      />
    </MaxWIdthWrapper>
  );
};

export default ProductsPage;
