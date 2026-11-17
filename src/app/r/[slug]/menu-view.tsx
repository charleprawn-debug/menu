"use client";

import { useMemo, useRef, useState } from "react";
import { Clock, MapPin, Phone, Search, Star, UtensilsCrossed } from "lucide-react";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { LogoMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  tags: string[];
  isFeatured: boolean;
  prepMinutes: number | null;
  calories: number | null;
  rating: number | null;
}

interface PublicCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  products: PublicProduct[];
}

interface MenuViewProps {
  locale: string;
  restaurant: {
    name: string;
    slug: string;
    description: string | null;
    cuisineType: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    coverUrl: string;
    logoUrl: string | null;
    currency: string;
    isOpen: boolean;
    todayHours: string | null;
    theme: { layout?: string; footerText?: string };
  };
  categories: PublicCategory[];
}

export function MenuView({ locale, restaurant, categories }: MenuViewProps) {
  const ar = locale === "ar";
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        products: category.products.filter(
          (product) => !q || product.name.toLowerCase().includes(q) || (product.description ?? "").toLowerCase().includes(q)
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [categories, query]);

  const featured = categories.flatMap((category) => category.products.filter((product) => product.isFeatured)).slice(0, 6);
  const totalProducts = categories.reduce((acc, category) => acc + category.products.length, 0);

  const scrollTo = (id: string) => {
    setActiveCategory(id);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-ink-900 dark:bg-background dark:text-foreground">
      {/* Cover */}
      <div className="relative h-[300px] w-full overflow-hidden sm:h-[380px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={restaurant.coverUrl} alt={restaurant.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/45 to-ink-950/10" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <LogoMark size={16} />
            DineFlow
          </span>
          <div className="flex items-center gap-2 rounded-full bg-white/15 px-2 py-1 text-white backdrop-blur [&_button]:text-white [&_button:hover]:bg-white/15">
            <LocaleSwitcher compact />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-2.5 flex items-center gap-2.5">
              {restaurant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logoUrl} alt="" className="size-11 shrink-0 rounded-xl border-2 border-white/30 object-cover" />
              ) : (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-white/30 bg-white/15 text-base font-bold backdrop-blur">
                  {restaurant.name.slice(0, 2)}
                </span>
              )}
              <Badge className={cn("gap-1 border-0 text-[10px]", restaurant.isOpen ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                <span className="size-1.5 rounded-full bg-white" />
                {restaurant.isOpen ? (ar ? "مفتوح الآن" : "Open now") : ar ? "مغلق حالياً" : "Closed"}
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold text-amber-300 backdrop-blur">
                <Star className="size-3 fill-current" /> 4.8
              </span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">{restaurant.name}</h1>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/75 sm:text-sm">{restaurant.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/80">
              {restaurant.cuisineType ? (
                <span className="inline-flex items-center gap-1">
                  <UtensilsCrossed className="size-3.5" /> {restaurant.cuisineType}
                </span>
              ) : null}
              {restaurant.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {restaurant.city}
                </span>
              ) : null}
              {restaurant.todayHours ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {restaurant.todayHours}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Star className="size-3.5 fill-current" /> 4.8 · {totalProducts} {ar ? "صنف" : "items"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 border-b bg-[#fbfaf7]/90 backdrop-blur dark:bg-background/90">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={ar ? "ابحث في المنيو…" : "Search the menu…"}
              className="h-10 w-full rounded-xl border bg-card ps-9 pe-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => scrollTo("all")}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                activeCategory === "all" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {ar ? "الكل" : "All"}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollTo(category.id)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  activeCategory === category.id ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
        {/* Featured */}
        {!query && featured.length > 0 ? (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-bold">{ar ? "الأكثر طلباً" : "Most popular"}</h2>
              <Badge variant="warning" className="text-[10px]">
                {ar ? "مميز" : "Featured"}
              </Badge>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {featured.map((product) => (
                <article key={product.id} className="w-[220px] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-soft">
                  <div className="relative h-28 bg-muted">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <UtensilsCrossed className="size-6" />
                      </div>
                    )}
                    <span className="absolute end-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-ink-900">
                      {formatMoney(product.price, restaurant.currency, locale)}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{product.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">{ar ? "لا توجد نتائج مطابقة" : "No matching items"}</p>
          </div>
        ) : (
          filtered.map((category) => (
            <section
              key={category.id}
              ref={(element) => {
                sectionRefs.current[category.id] = element;
              }}
              className="mb-10 scroll-mt-32"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{category.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {category.products.length} {ar ? "صنف" : "items"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {category.products.map((product) => (
                  <article
                    key={product.id}
                    className="group flex gap-3 rounded-2xl border bg-card p-2.5 shadow-soft transition-all hover:border-primary/25 hover:shadow-card"
                  >
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <UtensilsCrossed className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
                        {product.rating ? (
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                            <Star className="size-3 fill-current" />
                            {product.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                      {product.description ? (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{product.description}</p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {product.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                            {tag}
                          </span>
                        ))}
                        {product.calories ? <span className="text-[9px] text-muted-foreground">{product.calories} kcal</span> : null}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{formatMoney(product.price, restaurant.currency, locale)}</span>
                        {product.compareAtPrice ? (
                          <span className="text-[11px] text-muted-foreground line-through">
                            {formatMoney(product.compareAtPrice, restaurant.currency, locale)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}

        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center">
          {restaurant.phone ? (
            <a
              href={`tel:${restaurant.phone}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              <Phone className="size-4" />
              {ar ? "اتصل بالمطعم" : "Call restaurant"}
            </a>
          ) : null}
          {restaurant.address ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" /> {restaurant.address}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">{restaurant.theme.footerText ?? (ar ? "شكراً لزيارتكم" : "Thank you for visiting")}</p>
        </div>
      </main>

      <footer className="border-t bg-card py-6 text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {ar ? "مدعوم بواسطة" : "Powered by"} <span className="font-bold text-foreground">DineFlow</span>
        </p>
      </footer>
    </div>
  );
}
