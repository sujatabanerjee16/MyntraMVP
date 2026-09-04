import { useEffect, useMemo, useRef, useState } from "react";
import { unwrap, type WishlistView } from "../api";
import type { JeansLook } from "../domain/jeansLooks";
import { lookKindLabel, lookKindOf, lookSourceLabel, pairingAllowed } from "../domain/jeansLooks";
import { compareCards, compareClusters, parseClusterKey, recommendFromHistory } from "../domain/compare";
import { qualityBrief } from "../domain/qualityTrust";
import { fitFromPastBuys } from "../domain/fitJudgement";
import { occasionBrief } from "../domain/occasionBrief";
import type { PurchaseRecord, ProductReview, SizingReturn } from "../domain/stylist";
import { similarVariationLabel } from "../domain/similarItems";
import type { StyleReview, StyleShot } from "../domain/stylingLooks";
import { sizeChartFor, sizesFor, type SizeChart } from "../domain/sizeChart";
import type { OrderRecOffer } from "../domain/orderRecs";
import {
  TAG_EMOJI,
  TAG_LABEL,
  formatInr,
  isLiveTag,
  type ContextTag,
  type InboxRow,
  type NotificationPrefs,
  type PushType,
} from "../domain/models";
import { createAppRuntime, type ShopperRuntime } from "../runtime";
import { awaitApi, isThenable, peekApi, thenApi } from "../thenApi";
import {
  PERSONAS,
  SITE_HEROES,
  UNSAVED_CATALOG,
  allCatalog,
  searchCatalog,
  type CatalogProduct,
  type HeroSlide,
  type ShopperOrder,
  type ShopperPersona,
  type SiteCat,
} from "../store";
import { ShopperRuntimeProvider, useShopperRuntime } from "./runtimeContext";

const SITE_CATS = ["MEN", "WOMEN", "KIDS", "BEAUTY", "GENZ"] as const;

function wishItemCategory(item: { productId: string }): SiteCat | undefined {
  return allCatalog().find((row) => row.productId === item.productId)?.category;
}

function shopCatLabel(cat: SiteCat) {
  return cat[0] + cat.slice(1).toLowerCase();
}

function heroSearchTerm(slide: HeroSlide): string {
  const fromTitle = slide.title
    .toLowerCase()
    .match(/kurta|saree|dress|shirt|polo|denim|jean|suit|sherwani|hoodie|sneaker|cargo|lipstick|serum|palette|tee|bootie|maxi|ethnic|silk|summer|festive|baby|party|check|glow|skin|makeup|campus|chunky/)?.[0];
  if (fromTitle) return fromTitle;
  return slide.brand.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).find((word) => word.length > 2) ?? slide.title;
}

const CAT_BRANDS: Record<SiteCat, string[]> = {
  WOMEN: ["Libas", "Biba", "Kalini", "Mitera"],
  MEN: ["Roadster", "Levi's", "WROGN", "Raymond"],
  KIDS: ["Mothercare", "Hopscotch", "Max", "Babyhug"],
  BEAUTY: ["Maybelline", "Lakme", "Nykaa", "Sugar"],
  GENZ: ["Sassafras", "Urbanic", "Puma", "H&M"],
  HOME: ["Good Homes", "D'Decor", "Random"],
  STUDIO: ["Studio"],
};

function brandChipsFor(cat: SiteCat) {
  return CAT_BRANDS[cat];
}

const TAG_CHOICES: { id: ContextTag; emoji: string; label: string; hint: string }[] = [
  { id: "quality_trust", emoji: "🔎", label: "Check quality first", hint: "Reviews, fabric, and whether it looks like the photos" },
  { id: "size_wait", emoji: "📦", label: "Check the fit", hint: "From your past buys — whether this size should fit you" },
  { id: "compare", emoji: "🆚", label: "Compare", hint: "Same type side by side — pick the one that fits you" },
  { id: "occasion", emoji: "🎉", label: "Upcoming Occasion", hint: "When will you wear it? We'll keep it ready for that day" },
];

type Screen =
  | { name: "home" }
  | { name: "wishlist"; focusIds?: string[]; pingType?: PushType }
  | { name: "compare"; clusterKey: string }
  | { name: "pdp"; itemId: string; highlight?: boolean }
  | { name: "catalog"; sku: string }
  | { name: "bag" }
  | { name: "checkout" }
  | { name: "orders" }
  | { name: "success"; orderId: string; extras?: string[] }
  | { name: "settings" }
  | { name: "similar"; fromId: string };

type TagSheet =
  | { mode: "add"; itemId: string }
  | { mode: "edit"; itemId: string };

function emptyShopper() {
  return {
    wishlist: [] as WishlistView[],
    restocking: [] as WishlistView[],
    dead: [] as WishlistView[],
    inbox: [] as InboxRow[],
    bag: [] as WishlistView[],
    bagAddons: [] as CatalogProduct[],
    orders: [] as ShopperOrder[],
    catalog: [] as CatalogProduct[],
    prefs: { priceDropAlerts: true, sizeRestockAlerts: true, occasionReminders: true } as NotificationPrefs,
    filterOccasion: false,
  };
}

function readShopper(runtime: ShopperRuntime, occasionOnly = false) {
  const list = unwrap(runtime.api.getWishlist(occasionOnly ? "occasion" : undefined));
  const bagState = unwrap(runtime.api.getBag());
  return {
    wishlist: list.items,
    restocking: list.restocking,
    dead: list.dead,
    inbox: unwrap(runtime.api.getInbox()).items,
    bag: bagState.items ?? (bagState.item ? [bagState.item] : []),
    bagAddons: bagState.addons,
    orders: unwrap(runtime.api.getOrders()).items,
    catalog: unwrap(runtime.api.getCatalog()).products,
    prefs: unwrap(runtime.api.getPreferences()),
    filterOccasion: occasionOnly,
  };
}

async function readShopperAsync(runtime: ShopperRuntime, occasionOnly = false) {
  const list = await awaitApi(Promise.resolve(runtime.api.getWishlist(occasionOnly ? "occasion" : undefined)));
  const bagState = await awaitApi(Promise.resolve(runtime.api.getBag()));
  const inbox = await awaitApi(Promise.resolve(runtime.api.getInbox()));
  const catalog = await awaitApi(Promise.resolve(runtime.api.getCatalog()));
  const prefs = await awaitApi(Promise.resolve(runtime.api.getPreferences()));
  const orders = await awaitApi(Promise.resolve(runtime.api.getOrders()));
  return {
    wishlist: list.items,
    restocking: list.restocking,
    dead: list.dead,
    inbox: inbox.items,
    bag: bagState.items ?? (bagState.item ? [bagState.item] : []),
    bagAddons: bagState.addons,
    orders: orders.items,
    catalog: catalog.products,
    prefs,
    filterOccasion: occasionOnly,
  };
}

export function ShopperApp({ runtime: injected }: { runtime?: ShopperRuntime }) {
  const runtime = useMemo(() => injected ?? createAppRuntime(), [injected]);
  return (
    <ShopperRuntimeProvider runtime={runtime}>
      <Shell />
    </ShopperRuntimeProvider>
  );
}

function Shell() {
  const runtime = useShopperRuntime();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [data, setData] = useState(() => {
    try {
      return readShopper(runtime);
    } catch {
      return emptyShopper();
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<TagSheet | null>(null);
  const [couponOn, setCouponOn] = useState(false);
  const [query, setQuery] = useState("");
  const [searchInCat, setSearchInCat] = useState(false);
  const [bagBack, setBagBack] = useState<"home" | "wishlist">("wishlist");
  const [catalogBack, setCatalogBack] = useState<Screen>({ name: "home" });
  const [activeCat, setActiveCat] = useState<SiteCat>("WOMEN");
  const [personaId, setPersonaId] = useState(runtime.store.personaId);
  const persona = PERSONAS.find((row) => row.id === personaId) ?? PERSONAS[0];
  const fetchGen = useRef(0);

  function applyFetched(next: ReturnType<typeof emptyShopper>, gen: number) {
    if (gen !== fetchGen.current) return;
    setData(next);
  }

  function refresh() {
    const gen = ++fetchGen.current;
    void readShopperAsync(runtime).then((next) => applyFetched(next, gen));
  }

  useEffect(() => {
    const gen = ++fetchGen.current;
    void Promise.resolve(runtime.hydrate()).then(() => {
      if (gen !== fetchGen.current) return undefined;
      setPersonaId(runtime.store.personaId);
      return readShopperAsync(runtime);
    }).then((next) => {
      if (!next) return;
      applyFetched(next, gen);
    });
  }, [runtime]);
  const { bag, bagAddons, orders, catalog, prefs } = data;
  const wishlist = data.wishlist;
  const restocking = data.restocking;
  const dead = data.dead;
  const catWishlist = wishlist.filter((row) => wishItemCategory(row) === activeCat);
  const catRestocking = restocking.filter((row) => wishItemCategory(row) === activeCat);
  const catDead = dead.filter((row) => wishItemCategory(row) === activeCat);

  function applyQuery(value: string, opts?: { inCat?: boolean }) {
    setQuery(value);
    setSearchInCat(Boolean(opts?.inCat));
    if (value.trim()) {
      setDrawerOpen(false);
      setSheet(null);
      setScreen({ name: "home" });
    }
  }

  function goBag(from: "home" | "wishlist") {
    setBagBack(from);
    setDrawerOpen(false);
    setSheet(null);
    setScreen({ name: "bag" });
  }

  function openCatalog(sku: string, from: Screen = { name: "home" }) {
    setCatalogBack(from);
    setScreen({ name: "catalog", sku });
  }

  function pickPersona(id: string) {
    void Promise.resolve(runtime.switchPersona(id)).then(() => {
      const next = runtime.store.persona();
      setPersonaId(next.id);
      setActiveCat(next.defaultCat);
      setQuery("");
      setSearchInCat(false);
      setSheet(null);
      setDrawerOpen(false);
      setCouponOn(false);
      setScreen({ name: "home" });
      refresh();
    });
  }

  function resetDemo() {
    void Promise.resolve(runtime.reset()).then(() => {
      setPersonaId("sujata");
      setSheet(null);
      setDrawerOpen(false);
      setCouponOn(false);
      setQuery("");
      setSearchInCat(false);
      setActiveCat("WOMEN");
      setScreen({ name: "home" });
      refresh();
    });
  }

  function goHome() {
    setDrawerOpen(false);
    setSheet(null);
    setActiveCat(persona.defaultCat);
    setQuery("");
    setSearchInCat(false);
    setScreen({ name: "home" });
    refresh();
  }

  function openCat(cat: SiteCat) {
    setActiveCat(cat);
    setQuery("");
    setSearchInCat(false);
    setSheet(null);
    setDrawerOpen(false);
    setScreen((current) => {
      if (current.name === "wishlist" || current.name === "compare" || current.name === "pdp") {
        return { name: "wishlist" };
      }
      return { name: "home" };
    });
  }

  function goWishlist(next?: { focusIds?: string[]; pingType?: PushType }) {
    const focusId = next?.focusIds?.[0];
    if (focusId) {
      const item = [...wishlist, ...restocking, ...dead].find((row) => row.id === focusId);
      const cat = item ? wishItemCategory(item) : undefined;
      if (cat && (SITE_CATS as readonly string[]).includes(cat)) setActiveCat(cat);
    }
    setDrawerOpen(false);
    setScreen({ name: "wishlist", ...next });
  }

  function startAdd(product: CatalogProduct) {
    thenApi(Promise.resolve(runtime.api.addItem(product, null, null)), (added) => {
      setSheet({ mode: "add", itemId: added.item.id });
      refresh();
    });
  }

  function addArrivalToBag(product: CatalogProduct) {
    if (product.sizeOos) {
      startAdd(product);
      return;
    }
    const existing = [...wishlist, ...restocking, ...dead].find((row) => row.productId === product.productId)?.id;
    if (existing) {
      thenApi(Promise.resolve(runtime.api.addToBag(existing)), () => {
        goBag("home");
        refresh();
      });
      return;
    }
    thenApi(Promise.resolve(runtime.api.addItem(product, null, null)), (added) => {
      thenApi(Promise.resolve(runtime.api.addToBag(added.item.id)), () => {
        goBag("home");
        refresh();
      });
    });
  }

  const shownCatalog = query.trim()
    ? searchCatalog(query, searchInCat ? activeCat : undefined)
    : UNSAVED_CATALOG.filter((row) => row.category === activeCat);
  const allSaved = [...wishlist, ...restocking, ...dead];
  const compareGroups = compareClusters([...wishlist, ...restocking]);
  const savedByProduct = new Map(allSaved.map((row) => [row.productId, row.id]));
  const savedTags = new Map(allSaved.map((row) => [row.productId, row.tag]));

  const pages = (
    <>
          {screen.name === "home" ? (
            <Home
              catalog={shownCatalog}
              saved={homeWishlistRail(
                wishlist.filter((row) => wishItemCategory(row) === activeCat),
                restocking.filter((row) => wishItemCategory(row) === activeCat),
              )}
              couponOn={couponOn}
              query={query}
              activeCat={activeCat}
              persona={persona}
              savedByProduct={savedByProduct}
              savedTags={savedTags}
              onQuery={applyQuery}
              onSelectCat={openCat}
              onPickPersona={pickPersona}
              onApplyCoupon={() => setCouponOn(true)}
              onOpenSaved={(id) => setScreen({ name: "pdp", itemId: id })}
              onOpenCatalog={(sku) => openCatalog(sku, { name: "home" })}
              onAdd={startAdd}
              onAddToBag={addArrivalToBag}
              onOpenWishlist={(id) => goWishlist(id ? { focusIds: [id] } : undefined)}
            />
          ) : null}
          {screen.name === "wishlist" ? (
            <Wishlist
              key={activeCat}
              items={catWishlist}
              restocking={catRestocking}
              dead={catDead}
              category={activeCat}
              hiddenCount={wishlist.length + restocking.length + dead.length - catWishlist.length - catRestocking.length - catDead.length}
              focusIds={screen.focusIds}
              pingType={screen.pingType}
              onOpenPdp={(id) => setScreen({ name: "pdp", itemId: id })}
              onAddToBag={(id) => {
                thenApi(Promise.resolve(runtime.api.addToBag(id)), () => {
                  goBag("wishlist");
                  refresh();
                });
              }}
              onEditTag={(id) => setSheet({ mode: "edit", itemId: id })}
              onRemove={(id) => {
                thenApi(Promise.resolve(runtime.api.removeItem(id)), () => refresh());
              }}
              onSeeSimilar={(id) => {
                thenApi(Promise.resolve(runtime.api.dismissDead(id)), () => {
                  setScreen({ name: "similar", fromId: id });
                  refresh();
                });
              }}
              onOpenCompare={(key) => setScreen({ name: "compare", clusterKey: key })}
              reviews={runtime.store.reviews}
              purchases={runtime.store.purchases.filter((row) => row.userId === runtime.store.userId)}
              sizingReturns={runtime.store.sizingReturns.filter((row) => row.userId === runtime.store.userId)}
              nowIso={runtime.now().toISOString()}
              onSetOccasionDate={(id, date) => {
                thenApi(Promise.resolve(runtime.api.updateTag(id, "occasion", date)), () => refresh());
              }}
            />
          ) : null}
          {screen.name === "compare" ? (
            <ComparePage
              items={[...catWishlist, ...catRestocking]}
              clusterKey={screen.clusterKey}
              purchases={runtime.store.purchases.filter((row) => row.userId === runtime.store.userId)}
              reviews={runtime.store.reviews}
              onBack={() => goWishlist()}
              onOpenPdp={(id) => setScreen({ name: "pdp", itemId: id })}
              onAddToBag={(id) => {
                thenApi(Promise.resolve(runtime.api.addToBag(id)), () => {
                  goBag("wishlist");
                  refresh();
                });
              }}
            />
          ) : null}
          {screen.name === "pdp" ? (
            <Pdp
              item={
                wishlist.find((row) => row.id === screen.itemId) ??
                restocking.find((row) => row.id === screen.itemId) ??
                dead.find((row) => row.id === screen.itemId)
              }
              highlight={screen.highlight}
              onBack={() => goWishlist({ focusIds: [screen.itemId] })}
              onAddToBag={(id) => {
                thenApi(Promise.resolve(runtime.api.addToBag(id)), () => {
                  goBag("wishlist");
                  refresh();
                });
              }}
            />
          ) : null}
          {screen.name === "catalog" ? (
            <CatalogPdp
              product={
                allCatalog().find((row) => row.sku === screen.sku) ??
                catalog.find((row) => row.sku === screen.sku) ??
                shownCatalog.find((row) => row.sku === screen.sku)
              }
              onBack={() => setScreen(catalogBack)}
              onAdd={startAdd}
              onAddToBag={addArrivalToBag}
            />
          ) : null}
          {screen.name === "bag" ? (
            <Bag
              items={bag}
              addons={bagAddons}
              onBack={() => (bagBack === "home" ? setScreen({ name: "home" }) : goWishlist())}
              onCheckout={() => setScreen({ name: "checkout" })}
              onAddAddon={(sku) => {
                thenApi(Promise.resolve(runtime.api.addOrderAddon(sku)), () => refresh());
              }}
            />
          ) : null}
          {screen.name === "checkout" ? (
            <Checkout
              items={bag}
              addons={bagAddons}
              persona={persona}
              onBack={() => setScreen({ name: "bag" })}
              onPay={() => {
                thenApi(Promise.resolve(runtime.api.checkoutSuccess()), (result) => {
                  refresh();
                  setScreen({ name: "success", orderId: result.order_id, extras: result.extras });
                });
              }}
            />
          ) : null}
          {screen.name === "orders" ? <OrdersList orders={orders} onBack={goHome} /> : null}
          {screen.name === "success" ? (
            <Success orderId={screen.orderId} extras={screen.extras} onHome={goHome} />
          ) : null}
          {screen.name === "settings" ? (
            <Settings
              prefs={prefs}
              first={persona.first}
              onBack={goHome}
              onToggle={(key, value) => {
                thenApi(Promise.resolve(runtime.api.setPreferences({ [key]: value })), () => refresh());
              }}
            />
          ) : null}
          {screen.name === "similar" ? (
            <Similar
              fromId={screen.fromId}
              onBack={() => goWishlist()}
              onOpenCatalog={(sku) => openCatalog(sku, { name: "similar", fromId: screen.fromId })}
              onAdd={startAdd}
              onAddToBag={addArrivalToBag}
            />
          ) : null}
    </>
  );

  const overlays = (
    <>
        {drawerOpen ? (
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
            <aside className="drawer" onClick={(event) => event.stopPropagation()}>
              <div className="drawer-head">
                <h2>Profile</h2>
                <PageBack onBack={() => setDrawerOpen(false)} />
              </div>
              <div className="drawer-profile">
                {wishlist[0] ? (
                  <span className="drawer-avatar has-photo">
                    <img src={wishlist.find((row) => row.catalog.brand === "H&M")?.catalog.image_url ?? wishlist[0].catalog.image_url} alt="" />
                  </span>
                ) : (
                  <span className="drawer-avatar">{persona.first[0]}</span>
                )}
                <div>
                  <strong>{persona.name}</strong>
                  <span className="meta">
                    {persona.age} · {persona.city}
                  </span>
                  <span className="meta">{persona.email}</span>
                </div>
              </div>
              {compareGroups.length ? (
                <div className="drawer-compares">
                  <p className="drawer-kicker">Compare your saves</p>
                  {compareGroups.map((cluster) => (
                    <button
                      key={cluster.key}
                      type="button"
                      className="drawer-compare-link"
                      onClick={() => {
                        const parsed = parseClusterKey(cluster.key);
                        if (parsed) setActiveCat(parsed.category);
                        setDrawerOpen(false);
                        setScreen({ name: "compare", clusterKey: cluster.key });
                      }}
                    >
                      {cluster.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {wishlist.length ? (
                <div className="drawer-saves">
                  <p className="drawer-kicker">From your wishlist</p>
                  <div className="saved-rail is-drawer">
                    {wishlist.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="saved-tile"
                        onClick={() => {
                          setDrawerOpen(false);
                          setScreen({ name: "pdp", itemId: item.id });
                        }}
                      >
                        <ProductThumb brand={item.catalog.brand} title={item.catalog.title} image={item.catalog.image_url} />
                        <strong>{item.catalog.brand}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <nav>
                <button type="button" onClick={goHome}>
                  <IconHome /> Home
                </button>
                <button type="button" onClick={() => goWishlist()}>
                  <IconHeart /> Wishlist
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setScreen({ name: "orders" });
                  }}
                >
                  <IconBag /> Orders
                </button>
              </nav>
              <div className="drawer-demo">
                <button type="button" className="ghost reset-demo" onClick={resetDemo}>
                  Reset demo
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {sheet ? (
          <TagSheet
            sheet={sheet}
            onPick={(tag, occasionDate) => {
              const itemId = sheet.itemId;
              thenApi(Promise.resolve(runtime.api.updateTag(itemId, tag, occasionDate)), () => {
                setSheet(null);
                refresh();
              });
            }}
            onDismiss={() => {
              setSheet(null);
              refresh();
            }}
          />
        ) : null}
    </>
  );

  const tools = (
          <div className="header-tools site-tools">
            <button type="button" className="icon-btn tool-label" aria-label="Profile" onClick={() => {
              setDrawerOpen(true);
            }}>
              <IconProfile />
              <span>Profile</span>
            </button>
            <button type="button" className="icon-btn tool-label" aria-label="Wishlist" onClick={() => goWishlist()}>
              <IconHeart />
              {allSaved.length ? <span className="badge-count">{allSaved.length}</span> : null}
              <span>Wishlist</span>
            </button>
            <button
              type="button"
              className="icon-btn tool-label"
              aria-label="Bag"
              onClick={() => {
                setScreen({ name: "bag" });
              }}
            >
              <IconBag />
              {bag.length ? <span className="badge-count">{bag.length + bagAddons.length}</span> : null}
              <span>Bag</span>
            </button>
          </div>
  );

  return (
    <div className="shopper-stage is-web">
      <div className="browser">
        <header className="web-header">
          <div className="web-header-inner">
            <button className="m-logo is-web" type="button" aria-label="MYNTRA" onClick={goHome}>
              <IconMyntraM />
              <span className="m-wordmark">Myntra</span>
            </button>
            <nav className="web-cats" aria-label="Categories">
              {SITE_CATS.map((cat) => (
                <div key={cat} className={`web-cat${activeCat === cat ? " is-on" : ""}`}>
                  <button type="button" onClick={() => openCat(cat)}>
                    {cat}
                  </button>
                  {cat === "WOMEN" ? (
                    <div className="mega">
                      <div>
                        <strong>Indian & Fusion Wear</strong>
                        <button type="button" onClick={() => applyQuery("kurta", { inCat: true })}>Kurtas & Suits</button>
                        <button type="button" onClick={() => applyQuery("saree", { inCat: true })}>Sarees</button>
                        <button type="button" onClick={() => applyQuery("dress", { inCat: true })}>Dresses</button>
                      </div>
                      <div>
                        <strong>Western Wear</strong>
                        <button type="button" onClick={() => applyQuery("shirt", { inCat: true })}>Shirts</button>
                        <button type="button" onClick={() => goWishlist()}>Your saved list</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>
            <label className="site-search web-search">
              <IconSearch />
              <input
                type="search"
                placeholder="Search for products, brands and more"
                value={query}
                onChange={(event) => applyQuery(event.target.value)}
              />
            </label>
            {tools}
          </div>
        </header>
        <button type="button" className="offer-tab" onClick={() => setCouponOn(true)}>
          UPTO ₹200 OFF
        </button>
        {overlays}
        <main className={`web-page${screen.name === "home" ? " is-home" : ""}`}>{pages}</main>
      </div>
    </div>
  );
}

function HeroCarousel({
  slides,
  wide,
  onExplore,
}: {
  slides: HeroSlide[];
  wide: boolean;
  onExplore: (slide: HeroSlide) => void;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [slides]);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 3500);
    return () => window.clearInterval(timer);
  }, [slides]);
  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  return (
    <section className={`polo-hero hero-carousel${wide ? " is-wide" : ""}`}>
      <div className="hero-viewport">
        {slides.map((item, slideIndex) => (
          <div key={`${item.title}-${item.image_url}`} className={`hero-slide${slideIndex === index ? " is-on" : ""}`}>
            <img src={item.image_url} alt="" className="hero-photo-fill" aria-hidden="true" />
            <img src={item.image_url} alt="" className="hero-photo" />
          </div>
        ))}
        <span className="polo-logo">{slide.brand}</span>
      </div>
      <div className="polo-copy">
        <h2>{slide.title}</h2>
        <p>{slide.offer}</p>
        <button type="button" className="polo-explore" onClick={() => onExplore(slide)}>
          Shop this look
        </button>
        <div className="hero-dots">
          {slides.map((item, slideIndex) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Show ${item.title}`}
              className={slideIndex === index ? "is-on" : undefined}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function homeWishlistRail(items: WishlistView[], restocking: WishlistView[], limit = 14) {
  const live = [...restocking, ...items].filter((row) => row.tag !== "bookmarking" && row.stockStatus !== "discontinued");
  const picked: WishlistView[] = [];
  const seen = new Set<string>();
  for (const tag of ["quality_trust", "compare", "size_wait", "occasion"] as const) {
    const row = live.find((item) => item.tag === tag && !seen.has(item.id));
    if (!row) continue;
    seen.add(row.id);
    picked.push(row);
  }
  for (const row of live) {
    if (picked.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    picked.push(row);
  }
  return picked;
}

function Home({
  catalog,
  saved,
  couponOn,
  query,
  activeCat,
  persona,
  savedByProduct,
  savedTags,
  onQuery,
  onSelectCat,
  onPickPersona,
  onApplyCoupon,
  onOpenSaved,
  onOpenCatalog,
  onAdd,
  onAddToBag,
  onOpenWishlist,
}: {
  catalog: CatalogProduct[];
  saved: WishlistView[];
  couponOn: boolean;
  query: string;
  activeCat: SiteCat;
  persona: ShopperPersona;
  savedByProduct: Map<string, string>;
  savedTags: Map<string, ContextTag | null>;
  onQuery: (value: string, opts?: { inCat?: boolean }) => void;
  onSelectCat: (cat: SiteCat) => void;
  onPickPersona: (id: string) => void;
  onApplyCoupon: () => void;
  onOpenSaved: (id: string) => void;
  onOpenCatalog: (sku: string) => void;
  onAdd: (product: CatalogProduct) => void;
  onAddToBag: (product: CatalogProduct) => void;
  onOpenWishlist: (itemId?: string) => void;
}) {
  const slides = SITE_HEROES[activeCat];
  const searching = Boolean(query.trim());
  return (
    <>
      {searching ? null : (
        <>
      <div className="home-pad is-first profiles-block">
        <div className="rail-head">
          <h3 className="section-title">Profiles</h3>
          <p className="profiles-kicker">Shop as</p>
        </div>
        <div className="shop-as-card">
          <span className="shop-as-avatar" aria-hidden="true">
            {persona.first[0]}
          </span>
          <div className="shop-as-copy">
            <strong>
              {persona.first} · {persona.age} · {persona.city}
            </strong>
            <span>{persona.blurb}</span>
          </div>
        </div>
        <div className="persona-toggles" role="listbox" aria-label="Shoppers">
          {PERSONAS.map((row) => (
            <button
              key={row.id}
              type="button"
              role="option"
              aria-selected={row.id === persona.id}
              className={`persona-toggle${row.id === persona.id ? " is-on" : ""}`}
              onClick={() => onPickPersona(row.id)}
            >
              <span className="persona-toggle-dot" aria-hidden="true">
                {row.first[0]}
              </span>
              {row.first}
            </button>
          ))}
        </div>
      </div>
      {saved.length ? (
        <div className="home-pad">
          <div className="rail-head">
            <h3 className="section-title">From your wishlist</h3>
            <button type="button" className="text-link" onClick={onOpenWishlist}>
              See wishlist
            </button>
          </div>
          <div className="saved-rail">
            {saved.map((item) => (
              <button key={item.id} type="button" className="saved-tile" onClick={() => onOpenSaved(item.id)}>
                <span className="saved-tile-shot">
                  <ProductThumb brand={item.catalog.brand} title={item.catalog.title} image={item.catalog.image_url} />
                  <span className="wish-heart is-on" aria-hidden="true">
                    <IconHeart filled />
                  </span>
                </span>
                <strong>{item.catalog.brand}</strong>
                {isLiveTag(item.tag) ? (
                  <span className={`tag-chip tag-${item.tag}`}>
                    {TAG_EMOJI[item.tag]} {TAG_LABEL[item.tag]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <section className={`coupon-ticket${couponOn ? " is-on" : ""} is-web`}>
        <div>
          <p className="coupon-off">Get 25% Off</p>
          <p className="coupon-cap">Up To ₹200 Off*</p>
        </div>
        <button type="button" className="coupon-code" onClick={onApplyCoupon}>
          <span>COUPON CODE</span>
          <strong>MYNTRASAVE</strong>
        </button>
        <div className="coupon-percent" aria-hidden="true">
          %
        </div>
        <p className="coupon-fine">
          {couponOn ? "Applied on your first order" : "On Your First Order | T&C Apply"}
        </p>
      </section>
      <HeroCarousel
        slides={slides}
        wide
        onExplore={(slide) => onQuery(heroSearchTerm(slide), { inCat: true })}
      />
      <div className="home-pad">
          <h3 className="medal-title">Medal worthy brands to bag</h3>
          <div className="brand-strip">
            {brandChipsFor(activeCat).map((brand) => (
              <button key={brand} type="button" className="brand-chip" onClick={() => onQuery(brand, { inCat: true })}>
                {brand}
              </button>
            ))}
          </div>
        </div>
        </>
      )}
      <div className="home-pad">
          <h3 className="section-title">
          {searching ? `Results for “${query}”` : `${activeCat[0]}${activeCat.slice(1).toLowerCase()} · New arrivals`}
        </h3>
        <div className="trend-grid is-wide">
          {catalog.length === 0 ? <p className="empty">No matches — try another search</p> : null}
          {catalog.map((product) => (
            <ArrivalCard
              key={product.sku}
              product={product}
              savedId={savedByProduct.get(product.productId)}
              tag={savedTags.get(product.productId)}
              onOpenSaved={onOpenSaved}
              onOpenCatalog={onOpenCatalog}
              onAdd={onAdd}
              onAddToBag={onAddToBag}
              onOpenWishlist={onOpenWishlist}
            />
          ))}
        </div>
      </div>
      <footer className="myntra-foot">
          <div>
            <h4>ONLINE SHOPPING</h4>
            <button type="button" onClick={() => onSelectCat("MEN")}>Men</button>
            <button type="button" onClick={() => onSelectCat("WOMEN")}>Women</button>
            <button type="button" onClick={() => onSelectCat("KIDS")}>Kids</button>
            <button type="button" onClick={() => onSelectCat("BEAUTY")}>Beauty</button>
          </div>
          <div>
            <h4>CUSTOMER POLICIES</h4>
            <p>Contact Us</p>
            <p>FAQ</p>
            <p>T&C</p>
            <p>Terms Of Use</p>
          </div>
          <div>
            <h4>USEFUL LINKS</h4>
            <button type="button" className="text-link" onClick={onOpenWishlist}>
              Open wishlist
            </button>
          </div>
        </footer>
    </>
  );
}

function ArrivalCard({
  product,
  savedId,
  tag,
  onOpenSaved,
  onOpenCatalog,
  onAdd,
  onAddToBag,
  onOpenWishlist,
}: {
  product: CatalogProduct;
  savedId?: string;
  tag?: ContextTag | null;
  onOpenSaved: (id: string) => void;
  onOpenCatalog: (sku: string) => void;
  onAdd: (product: CatalogProduct) => void;
  onAddToBag: (product: CatalogProduct) => void;
  onOpenWishlist: (itemId?: string) => void;
}) {
  const [size, setSize] = useState(() => initialSize(product));
  const chosen = withSelectedSize(product, size);
  const open = () => (savedId ? onOpenSaved(savedId) : onOpenCatalog(product.sku));
  return (
    <article className="trend-card-wrap">
      <div className="trend-media">
        <button type="button" className="trend-shot" onClick={open}>
          <ProductThumb brand={product.brand} title={product.title} image={product.image_url} />
        </button>
        <button
          type="button"
          className={`wish-heart${savedId ? " is-on" : ""}`}
          aria-label={savedId ? "Saved to wishlist" : "Save to wishlist"}
          onClick={() => (savedId ? onOpenWishlist(savedId) : onAdd(chosen))}
        >
          <IconHeart filled={Boolean(savedId)} />
        </button>
      </div>
      <div className="trend-meta">
        <button type="button" className="trend-card" onClick={open}>
          <strong>{product.brand.toUpperCase()}</strong>
          <span className="trend-title">{product.title}</span>
          <div className="trend-price-row">
            <div className="price">{formatInr(product.price)}</div>
            {isLiveTag(tag) ? (
              <span className={`tag-chip tag-${tag}`}>
                {TAG_EMOJI[tag]} {TAG_LABEL[tag]}
              </span>
            ) : null}
          </div>
        </button>
        <SizeSelect
          title={product.title}
          category={product.category}
          selected={size}
          soldOutSize={product.sizeOos ? product.size : null}
          onSelect={setSize}
        />
        <div className="trend-actions">
          {chosen.sizeOos ? (
            savedId ? (
              <button type="button" className="wish-cta is-notify" onClick={() => onOpenWishlist(savedId)}>
                View in wishlist
              </button>
            ) : (
              <button type="button" className="wish-cta is-notify" onClick={() => onAdd(chosen)}>
                Notify when back
              </button>
            )
          ) : (
            <>
              <button type="button" className="wish-cta is-bag" onClick={() => onAddToBag(chosen)}>
                Add to Bag
              </button>
              {savedId ? (
                <button type="button" className="wish-cta is-notify" onClick={() => onOpenWishlist(savedId)}>
                  View in wishlist
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function pingSectionTitle(type?: PushType) {
  if (type === "restock") return "My size";
  if (type === "occasion") return "Occasion";
  return null;
}

const WISH_TABS = ["All", "Compare", "Quality & trust", "My size", "Occasion", "No longer available"] as const;

function wishlistBuckets(items: WishlistView[], restocking: WishlistView[], dead: WishlistView[]) {
  const live = [...restocking, ...items];
  const gone = [...dead, ...live.filter((row) => row.stockStatus === "discontinued")];
  const goneIds = new Set(gone.map((row) => row.id));
  const rest = live.filter((row) => !goneIds.has(row.id));
  const taken = new Set<string>();
  const take = (pred: (row: WishlistView) => boolean) => {
    const rows = rest.filter((row) => !taken.has(row.id) && pred(row));
    for (const row of rows) taken.add(row.id);
    return rows;
  };
  return [
    { title: "Quality & trust", items: take((row) => row.tag === "quality_trust") },
    { title: "My size", items: take((row) => row.tag === "size_wait") },
    { title: "Occasion", items: take((row) => row.tag === "occasion") },
    { title: "", items: take(() => true) },
    { title: "No longer available", items: gone },
  ];
}

function Wishlist({
  items,
  restocking,
  dead,
  category,
  hiddenCount,
  focusIds,
  pingType,
  onOpenPdp,
  onAddToBag,
  onEditTag,
  onRemove,
  onSeeSimilar,
  onOpenCompare,
  reviews,
  purchases,
  sizingReturns,
  nowIso,
  onSetOccasionDate,
}: {
  items: WishlistView[];
  restocking: WishlistView[];
  dead: WishlistView[];
  category: SiteCat;
  hiddenCount: number;
  focusIds?: string[];
  pingType?: PushType;
  onOpenPdp: (id: string) => void;
  onAddToBag: (id: string) => void;
  onEditTag: (id: string) => void;
  onRemove: (id: string) => void;
  onSeeSimilar: (id: string) => void;
  onOpenCompare: (key: string) => void;
  reviews: ProductReview[];
  purchases: PurchaseRecord[];
  sizingReturns: SizingReturn[];
  nowIso: string;
  onSetOccasionDate: (id: string, date: string | null) => void;
}) {
  const buckets = wishlistBuckets(items, restocking, dead);
  const clusters = compareClusters([...restocking, ...items]);
  const total = items.length + restocking.length + dead.length;
  const pingTitle = pingSectionTitle(pingType);
  const focused = new Set(focusIds ?? []);
  const [tab, setTab] = useState<string>(pingTitle ?? "All");

  useEffect(() => {
    if (pingTitle) setTab(pingTitle);
  }, [pingTitle]);

  useEffect(() => {
    const id = focusIds?.[0];
    if (!id) return;
    document.querySelector(`[data-item-id="${id}"]`)?.scrollIntoView?.({ block: "center" });
  }, [focusIds, items, restocking, dead, tab]);

  const shown = tab === "All" ? buckets.filter((row) => row.items.length) : buckets.filter((row) => row.title === tab);
  const countFor = (title: string) => {
    if (title === "All") return total;
    if (title === "Compare") return clusters.length;
    return buckets.find((row) => row.title === title)?.items.length ?? 0;
  };

  return (
    <div className="wishlist-page">
      <div className="page-title">
        <h1>Wishlist</h1>
        <span className="count">{shopCatLabel(category)} · {total} items</span>
      </div>
      <p className="page-hint">
        {tab === "Quality & trust"
          ? "You parked these to check quality. Fabric, customer stars, and whether it looks like the photos — then buy or keep looking."
          : tab === "My size"
            ? "From what you already bought — whether this size should fit you. Not a stock watch."
            : tab === "Occasion"
              ? "Parked for a day you’ll wear it. Set the date — we’ll keep the piece with that occasion."
              : `Showing ${shopCatLabel(category)} saves. Use Men, Women, Kids, Beauty, or GenZ in the menu to switch.`}
      </p>
      {total === 0 ? (
        <p className="empty">
          {hiddenCount > 0
            ? `No ${shopCatLabel(category)} saves yet. Pick another category in the menu to see your other ${hiddenCount} saved items.`
            : "Your wishlist is empty"}
        </p>
      ) : (
        <>
          <div className="wish-tabs" role="tablist" aria-label="Wishlist sections">
            {WISH_TABS.map((title) => {
              const count = countFor(title);
              return (
                <button
                  key={title}
                  type="button"
                  role="tab"
                  aria-selected={tab === title}
                  className={tab === title ? "is-on" : undefined}
                  onClick={() => setTab(title)}
                >
                  {title}
                  {title === "All" || count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
          {tab === "Compare" ? (
            clusters.length === 0 ? (
              <p className="empty">Save two of the same type — kurtas, dresses, shirts — to compare them here.</p>
            ) : (
              <div className="compare-list">
                {clusters.map((cluster) => (
                  <button
                    key={cluster.key}
                    type="button"
                    className="compare-cluster"
                    onClick={() => onOpenCompare(cluster.key)}
                  >
                    <strong>Compare {cluster.label}</strong>
                    <span>Price, ratings, and quality — pick one</span>
                  </button>
                ))}
              </div>
            )
          ) : shown.every((section) => section.items.length === 0) ? (
            <p className="empty">Nothing in {tab.toLowerCase()} yet</p>
          ) : (
            <>
              {tab === "All" && clusters.length ? (
                <div className="compare-banners">
                  {clusters.map((cluster) => (
                    <button key={cluster.key} type="button" className="compare-banner" onClick={() => onOpenCompare(cluster.key)}>
                      Compare {cluster.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {shown.map((section) => (
                <section key={section.title || "rest"} className="wish-group">
                  {tab === "All" && section.title ? <h2 className="wish-section">{section.title}</h2> : null}
                  {section.title === "No longer available"
                    ? section.items.map((item) => (
                        <DeadNudge key={item.id} item={item} onRemove={onRemove} onSeeSimilar={onSeeSimilar} />
                      ))
                    : section.items.map((item) =>
                        tab === "Quality & trust" ? (
                          <QualityCard
                            key={item.id}
                            item={item}
                            reviews={reviews}
                            focused={focused.has(item.id)}
                            onOpenPdp={onOpenPdp}
                            onAddToBag={onAddToBag}
                            onEditTag={onEditTag}
                          />
                        ) : tab === "Occasion" ? (
                          <OccasionCard
                            key={item.id}
                            item={item}
                            nowIso={nowIso}
                            focused={focused.has(item.id)}
                            onOpenPdp={onOpenPdp}
                            onAddToBag={onAddToBag}
                            onEditTag={onEditTag}
                            onSetOccasionDate={onSetOccasionDate}
                          />
                        ) : tab === "My size" ? (
                          <SizeFitCard
                            key={item.id}
                            item={item}
                            purchases={purchases}
                            sizingReturns={sizingReturns}
                            reviews={reviews}
                            focused={focused.has(item.id)}
                            onOpenPdp={onOpenPdp}
                            onAddToBag={onAddToBag}
                            onEditTag={onEditTag}
                          />
                        ) : (
                          <WishlistCard
                            key={item.id}
                            item={item}
                            focused={focused.has(item.id)}
                            onOpenPdp={onOpenPdp}
                            onAddToBag={onAddToBag}
                            onEditTag={onEditTag}
                          />
                        ),
                      )}
                </section>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function StarRating({ average, count, hideCount }: { average: number; count: number; hideCount?: boolean }) {
  const rounded = Math.max(0, Math.min(5, Math.round(average)));
  return (
    <p className="compare-rating" aria-label={`${average.toFixed(1)} out of 5 from ${count} ratings`}>
      <span className="compare-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index < rounded ? "is-on" : undefined}>
            ★
          </span>
        ))}
      </span>
      <strong>{average.toFixed(1)}</strong>
      {hideCount ? null : <span>({count})</span>}
    </p>
  );
}

function PageBack({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="page-back" aria-label="Back" onClick={onBack}>
      <span aria-hidden="true">‹</span>
      Back
    </button>
  );
}

function ComparePage({
  items,
  clusterKey,
  purchases,
  reviews,
  onBack,
  onOpenPdp,
  onAddToBag,
}: {
  items: WishlistView[];
  clusterKey: string;
  purchases: PurchaseRecord[];
  reviews: ProductReview[];
  onBack: () => void;
  onOpenPdp: (id: string) => void;
  onAddToBag: (id: string) => void;
}) {
  const [inStockOnly, setInStockOnly] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const cluster = compareClusters(items).find((row) => row.key === clusterKey) ?? null;
  const raw = cluster ? compareCards(items, cluster, inStockOnly, reviews).filter((row) => !hidden.has(row.itemId)) : [];
  const minPrice = Math.min(...raw.map((row) => row.price));
  const cards = raw.map((row) => ({
    ...row,
    cheapest: raw.length > 1 && row.price === minPrice,
  }));
  const pick = recommendFromHistory(cards, purchases);
  const pickCard = cards.find((row) => row.itemId === pick?.itemId);
  return (
    <>
      <div className="compare-head">
        <PageBack onBack={onBack} />
        <h1>{cluster ? cluster.label : "Compare"}</h1>
      </div>
      <p className="page-hint">Price, customer stars, and a short quality note — side by side.</p>
      {pick && pickCard ? (
        <aside className="compare-pick">
          <strong>Buy this</strong>
          <p>
            {pickCard.brand} {pickCard.title}. {pick.why}
          </p>
          {pickCard.inStock ? (
            <button type="button" className="wish-cta is-bag" onClick={() => onAddToBag(pickCard.itemId)}>
              MOVE TO BAG
            </button>
          ) : null}
        </aside>
      ) : null}
      {cluster ? (
        <label className="compare-filter">
          <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />
          In stock only
        </label>
      ) : null}
      {cards.length < 2 ? (
        <p className="empty">{cluster ? "Need two pieces left to compare." : "This set is gone. Go back to wishlist."}</p>
      ) : (
        <div className="compare-grid">
          {cards.map((card) => (
            <article
              key={card.itemId}
              className={`compare-card${card.cheapest ? " is-cheapest" : ""}${pick?.itemId === card.itemId ? " is-pick" : ""}`}
            >
              <button type="button" className="compare-shot" onClick={() => onOpenPdp(card.itemId)}>
                <img src={card.image_url} alt={card.title} />
              </button>
              <strong>{card.brand.toUpperCase()}</strong>
              <p className="compare-title">{card.title}</p>
              <p className="price">
                {card.priceLabel}
                {card.cheapest ? <span className="compare-flag">Lowest here</span> : null}
              </p>
              <StarRating average={card.rating} count={card.ratingCount} />
              <p className="compare-desc">{card.description}</p>
              {card.inStock ? (
                <button type="button" className="wish-cta is-bag" onClick={() => onAddToBag(card.itemId)}>
                  MOVE TO BAG
                </button>
              ) : (
                <button type="button" className="wish-cta is-notify" disabled>
                  Out of stock
                </button>
              )}
              <button
                type="button"
                className="text-link"
                onClick={() => setHidden((prev) => new Set(prev).add(card.itemId))}
              >
                Not this
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function DeadNudge({
  item,
  onRemove,
  onSeeSimilar,
}: {
  item: WishlistView;
  onRemove: (id: string) => void;
  onSeeSimilar: (id: string) => void;
}) {
  return (
    <article className="card dead-nudge" data-item-id={item.id}>
      <p className="dead-kicker">⚠️ This item won&apos;t be restocked</p>
      <div className="dead-row">
        <ProductThumb brand={item.catalog.brand} title={item.catalog.title} image={item.catalog.image_url} />
        <div>
          <strong>{item.catalog.brand.toUpperCase()}</strong>
          <div>{item.catalog.title}</div>
          <div className="price">{formatInr(item.currentPrice)}</div>
          <p className="oos">No longer sold</p>
        </div>
      </div>
      <div className="dead-actions">
        <button type="button" className="wish-cta is-notify" onClick={() => onSeeSimilar(item.id)}>
          See Similar Items
        </button>
        <button type="button" className="wish-cta is-bag" onClick={() => onRemove(item.id)}>
          Remove ✕
        </button>
      </div>
    </article>
  );
}

function QualityCard({
  item,
  reviews,
  focused,
  onOpenPdp,
  onAddToBag,
  onEditTag,
}: {
  item: WishlistView;
  reviews: ProductReview[];
  focused: boolean;
  onOpenPdp: (id: string) => void;
  onAddToBag: (id: string) => void;
  onEditTag: (id: string) => void;
}) {
  const press = useLongPress(() => onEditTag(item.id));
  const catalogRow = allCatalog().find((row) => row.productId === item.productId);
  const brief = qualityBrief(
    { ...item, category: catalogRow?.category },
    catalogRow?.description,
    reviews,
  );
  return (
    <article
      className={`card quality-card${focused ? " focused" : ""}`}
      data-item-id={item.id}
      {...press}
    >
      <ProductThumb
        brand={item.catalog.brand}
        title={item.catalog.title}
        image={item.catalog.image_url}
        onClick={() => onOpenPdp(item.id)}
      />
      <div className="wish-meta">
        <strong>{item.catalog.brand.toUpperCase()}</strong>
        <div className="wish-title">{item.catalog.title}</div>
        <div className="trend-price-row">
          <div className="price">{formatInr(item.currentPrice)}</div>
          <button
            type="button"
            className="tag-chip tag-quality_trust"
            onClick={(event) => {
              event.stopPropagation();
              onEditTag(item.id);
            }}
          >
            {TAG_EMOJI.quality_trust} {TAG_LABEL.quality_trust}
          </button>
        </div>
        <dl className="quality-facts">
          <div>
            <dt>Fabric</dt>
            <dd>{brief.fabric}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>
              <StarRating average={brief.rating.average} count={brief.rating.count} hideCount />
            </dd>
          </div>
          <div>
            <dt>Reviews</dt>
            <dd>{brief.rating.count} reviews</dd>
          </div>
        </dl>
        {brief.photos.length ? (
          <div className="quality-photos">
            <p>Real customer photo</p>
            <div>
              {brief.photos.map((shot) => (
                <img key={shot.id} src={shot.image_url} alt={`${item.catalog.title} photo`} />
              ))}
            </div>
          </div>
        ) : null}
        {brief.quotes.length ? (
          <ul className="quality-quotes">
            {brief.quotes.map((quote) => (
              <li key={`${quote.author}-${quote.comment}`}>
                <span>
                  {quote.author}, {quote.city}
                </span>
                “{quote.comment}”
              </li>
            ))}
          </ul>
        ) : null}
        {item.stockStatus === "in_stock" ? (
          <button type="button" className={`wish-cta is-bag${focused ? " is-highlight" : ""}`} onClick={() => onAddToBag(item.id)}>
            MOVE TO BAG
          </button>
        ) : (
          <button type="button" className="wish-cta is-notify" disabled>
            {item.sizeWatch?.size ? `Watching size ${item.sizeWatch.size}` : "Out of stock"}
          </button>
        )}
      </div>
    </article>
  );
}

function OccasionCard({
  item,
  nowIso,
  focused,
  onOpenPdp,
  onAddToBag,
  onEditTag,
  onSetOccasionDate,
}: {
  item: WishlistView;
  nowIso: string;
  focused: boolean;
  onOpenPdp: (id: string) => void;
  onAddToBag: (id: string) => void;
  onEditTag: (id: string) => void;
  onSetOccasionDate: (id: string, date: string | null) => void;
}) {
  const press = useLongPress(() => onEditTag(item.id));
  const brief = occasionBrief(item, nowIso);
  const dateValue = item.occasionDate ? item.occasionDate.slice(0, 10) : "";
  return (
    <article
      className={`card occasion-card${focused ? " focused" : ""}`}
      data-item-id={item.id}
      {...press}
    >
      <ProductThumb
        brand={item.catalog.brand}
        title={item.catalog.title}
        image={item.catalog.image_url}
        onClick={() => onOpenPdp(item.id)}
      />
      <div className="wish-meta">
        <strong>{item.catalog.brand.toUpperCase()}</strong>
        <div className="wish-title">{item.catalog.title}</div>
        <div className="trend-price-row">
          <div className="price">{formatInr(item.currentPrice)}</div>
          <button
            type="button"
            className="tag-chip tag-occasion"
            onClick={(event) => {
              event.stopPropagation();
              onEditTag(item.id);
            }}
          >
            {TAG_EMOJI.occasion} {TAG_LABEL.occasion}
          </button>
        </div>
        <p className="occasion-when">{brief.label}</p>
        <p className="occasion-count">
          {brief.countdown && brief.dateLabel
            ? `${brief.countdown} · ${brief.dateLabel}`
            : "When will you wear it?"}
        </p>
        <label className="occasion-date-field">
          <span>Occasion date</span>
          <input
            type="date"
            value={dateValue}
            onChange={(event) => onSetOccasionDate(item.id, event.target.value || null)}
          />
        </label>
        {item.stockStatus === "in_stock" ? (
          <button type="button" className={`wish-cta is-bag${focused ? " is-highlight" : ""}`} onClick={() => onAddToBag(item.id)}>
            MOVE TO BAG
          </button>
        ) : null}
      </div>
    </article>
  );
}

function SizeFitCard({
  item,
  purchases,
  sizingReturns,
  reviews,
  focused,
  onOpenPdp,
  onAddToBag,
  onEditTag,
}: {
  item: WishlistView;
  purchases: PurchaseRecord[];
  sizingReturns: SizingReturn[];
  reviews: ProductReview[];
  focused: boolean;
  onOpenPdp: (id: string) => void;
  onAddToBag: (id: string) => void;
  onEditTag: (id: string) => void;
}) {
  const press = useLongPress(() => onEditTag(item.id));
  const judge = fitFromPastBuys(item, purchases, sizingReturns, reviews);
  return (
    <article
      className={`card size-fit-card is-${judge.verdict}${focused ? " focused" : ""}`}
      data-item-id={item.id}
      {...press}
    >
      <ProductThumb
        brand={item.catalog.brand}
        title={item.catalog.title}
        image={item.catalog.image_url}
        onClick={() => onOpenPdp(item.id)}
      />
      <div className="wish-meta">
        <strong>{item.catalog.brand.toUpperCase()}</strong>
        <div className="wish-title">{item.catalog.title}</div>
        <div className="trend-price-row">
          <div className="price">{formatInr(item.currentPrice)}</div>
          <button
            type="button"
            className="tag-chip tag-size_wait"
            onClick={(event) => {
              event.stopPropagation();
              onEditTag(item.id);
            }}
          >
            {TAG_EMOJI.size_wait} {TAG_LABEL.size_wait}
          </button>
        </div>
        <p className="size-fit-verdict">{judge.headline}</p>
        <p className="size-fit-reason">{judge.reason}</p>
        {item.stockStatus === "in_stock" ? (
          <button type="button" className={`wish-cta is-bag${focused ? " is-highlight" : ""}`} onClick={() => onAddToBag(item.id)}>
            MOVE TO BAG
          </button>
        ) : null}
        <SizeChartLink title={item.catalog.title} category={allCatalog().find((row) => row.productId === item.productId)?.category} />
      </div>
    </article>
  );
}

function WishlistCard({
  item,
  focused,
  onOpenPdp,
  onAddToBag,
  onEditTag,
}: {
  item: WishlistView;
  focused: boolean;
  onOpenPdp: (id: string) => void;
  onAddToBag: (id: string) => void;
  onEditTag: (id: string) => void;
}) {
  const press = useLongPress(() => onEditTag(item.id));
  const catalogRow = allCatalog().find((row) => row.productId === item.productId);
  return (
    <article
      className={`card wishlist-card${focused ? " focused" : ""}`}
      data-item-id={item.id}
      {...press}
    >
      <ProductThumb
        brand={item.catalog.brand}
        title={item.catalog.title}
        image={item.catalog.image_url}
        onClick={() => onOpenPdp(item.id)}
      />
      <div className="wish-meta">
        <strong>{item.catalog.brand.toUpperCase()}</strong>
        <div className="wish-title">{item.catalog.title}</div>
        {catalogRow?.description ? <p className="wish-desc">{catalogRow.description}</p> : null}
        <div className="trend-price-row">
          <div className="price">{formatInr(item.currentPrice)}</div>
          {item.stockStatus === "discontinued" ? null : isLiveTag(item.tag) ? (
            <button
              type="button"
              className={`tag-chip tag-${item.tag}`}
              onClick={(event) => {
                event.stopPropagation();
                onEditTag(item.id);
              }}
            >
              {TAG_EMOJI[item.tag]} {TAG_LABEL[item.tag]}
            </button>
          ) : (
            <button type="button" className="tag-chip is-add" onClick={() => onEditTag(item.id)}>
              + Why you saved this
            </button>
          )}
        </div>
        {item.stockStatus === "discontinued" ? null : item.stockStatus === "in_stock" ? (
          <button type="button" className={`wish-cta is-bag${focused ? " is-highlight" : ""}`} onClick={() => onAddToBag(item.id)}>
            MOVE TO BAG
          </button>
        ) : (
          <button type="button" className="wish-cta is-notify" disabled>
            {item.sizeWatch?.size ? `Watching size ${item.sizeWatch.size}` : "Out of stock"}
          </button>
        )}
        <div className={item.stockStatus === "in_stock" ? "meta" : "oos"}>
          {item.stockStatus === "discontinued" ? "No longer sold" : stockLine(item)}
        </div>
        <SizeChartLink title={item.catalog.title} category={allCatalog().find((row) => row.productId === item.productId)?.category} />
      </div>
    </article>
  );
}

function Pdp({
  item,
  highlight,
  onBack,
  onAddToBag,
}: {
  item?: WishlistView;
  highlight?: boolean;
  onBack: () => void;
  onAddToBag: (id: string) => void;
}) {
  if (!item) {
    return (
      <>
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
        <p className="empty">Item not on wishlist</p>
      </>
    );
  }
  const catalogRow = allCatalog().find((row) => row.productId === item.productId);
  return (
    <>
    <div className="pdp-layout">
      <ProductThumb brand={item.catalog.brand} title={item.catalog.title} image={item.catalog.image_url} tall />
      <div className="pdp-buy">
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>{item.catalog.brand}</h1>
      </div>
      <h2>{item.catalog.title}</h2>
      <div className="price">{formatInr(item.currentPrice)}</div>
      {catalogRow?.description ? <p className="pdp-desc">{catalogRow.description}</p> : null}
      {item.selectedSize ? <p className="size-pill">Size {item.selectedSize}</p> : null}
      <SizeChartLink title={item.catalog.title} category={allCatalog().find((row) => row.productId === item.productId)?.category} />
      <div className={item.stockStatus === "in_stock" ? "meta" : "oos"}>{stockLine(item)}</div>
      {item.stockStatus === "in_stock" || highlight ? (
      <button
        type="button"
        className={`wish-cta is-bag${highlight ? " is-highlight" : ""}`}
        onClick={() => onAddToBag(item.id)}
      >
        Add to Bag
      </button>
      ) : (
        <button type="button" className="wish-cta is-notify" disabled>
          {item.sizeWatch?.size ? `Notify when size ${item.sizeWatch.size} is back` : "Size sold out"}
        </button>
      )}
      </div>
    </div>
    </>
  );
}

function CatalogPdp({
  product,
  onBack,
  onAdd,
  onAddToBag,
}: {
  product?: CatalogProduct;
  onBack: () => void;
  onAdd: (product: CatalogProduct) => void;
  onAddToBag: (product: CatalogProduct) => void;
}) {
  if (!product) {
    return (
      <>
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
        <p className="empty">This style is already in your wishlist</p>
      </>
    );
  }
  return <CatalogPdpBody product={product} onBack={onBack} onAdd={onAdd} onAddToBag={onAddToBag} />;
}

function CatalogPdpBody({
  product,
  onBack,
  onAdd,
  onAddToBag,
}: {
  product: CatalogProduct;
  onBack: () => void;
  onAdd: (product: CatalogProduct) => void;
  onAddToBag: (product: CatalogProduct) => void;
}) {
  const [size, setSize] = useState(() => initialSize(product));
  const chosen = withSelectedSize(product, size);
  return (
    <div className="pdp-layout">
      <div className="pdp-shot-wrap">
        <ProductThumb brand={product.brand} title={product.title} image={product.image_url} tall />
        <button
          type="button"
          className="wish-heart"
          aria-label="Save to wishlist"
          onClick={() => onAdd(chosen)}
        >
          <IconHeart />
        </button>
      </div>
      <div className="pdp-buy">
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>{product.brand}</h1>
      </div>
      <h2>{product.title}</h2>
      <div className="price">{formatInr(product.price)}</div>
      {product.description ? <p className="pdp-desc">{product.description}</p> : null}
      <SizeSelect
        title={product.title}
        category={product.category}
        selected={size}
        soldOutSize={product.sizeOos ? product.size : null}
        onSelect={setSize}
      />
      {chosen.sizeOos ? (
        <button type="button" className="wish-cta is-notify" onClick={() => onAdd(chosen)}>
          Notify when back
        </button>
      ) : (
        <button type="button" className="wish-cta is-bag" onClick={() => onAddToBag(chosen)}>
          Add to Bag
        </button>
      )}
      <p className="meta">Pick a size, then bag it — or tap the heart to save.</p>
      </div>
    </div>
  );
}

function Bag({
  items,
  addons,
  onBack,
  onCheckout,
  onAddAddon,
}: {
  items: WishlistView[];
  addons: CatalogProduct[];
  onBack: () => void;
  onCheckout: () => void;
  onAddAddon: (sku: string) => void;
}) {
  const runtime = useShopperRuntime();
  const [offer, setOffer] = useState<OrderRecOffer | null>(null);
  const [looks, setLooks] = useState<JeansLook[]>([]);
  const [pick, setPick] = useState(0);
  const last = items[items.length - 1] ?? null;
  const addonTotal = addons.reduce((sum, row) => sum + row.price, 0);
  const itemsTotal = items.reduce((sum, row) => sum + row.currentPrice, 0);

  useEffect(() => {
    if (!last) {
      setOffer(null);
      setLooks([]);
      return;
    }
    const recs = runtime.api.getOrderRecs();
    thenApi(Promise.resolve(recs), (body) => {
      if (body.picks.length) setOffer(body);
    });
    const pairs = runtime.api.getLookPairs(last.id);
    thenApi(Promise.resolve(pairs), (body) => setLooks(body.items));
  }, [runtime, last?.id]);

  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Shopping Bag</h1>
      </div>
      {!items.length ? (
        <p className="empty">Your bag is empty</p>
      ) : (
        <>
          <div className="bag-layout">
          <div className="bag-col">
          {items.map((item) => {
            const bagDesc = allCatalog().find((row) => row.productId === item.productId)?.description;
            return (
              <article key={item.id} className="card bag-item">
                <ProductThumb brand={item.catalog.brand} title={item.catalog.title} image={item.catalog.image_url} />
                <div>
                <strong>{item.catalog.brand.toUpperCase()}</strong>
                <div>{item.catalog.title}</div>
                {bagDesc ? <p className="wish-desc">{bagDesc}</p> : null}
                <div className="price">{formatInr(item.currentPrice)}</div>
                {item.selectedSize ? <p className="meta">Size {item.selectedSize}</p> : null}
                </div>
              </article>
            );
          })}
          {addons.map((row) => (
            <p key={row.sku} className="meta bag-addon-line">
              + {row.title} · {formatInr(row.price)}
            </p>
          ))}
          {items.length > 1 || addons.length ? (
            <div className="price bag-total">Total {formatInr(itemsTotal + addonTotal)}</div>
          ) : null}
          <button className="cta bag-place" type="button" onClick={onCheckout}>
            Place order
          </button>
          </div>
          {offer && last ? (
            <OrderRecSheet
              offer={offer}
              pick={pick}
              looks={looks}
              bagTitle={last.catalog.title}
              bagCategory={allCatalog().find((row) => row.productId === last.productId)?.category}
              onPick={setPick}
              onAdd={(sku) => {
                setOffer(null);
                onAddAddon(sku);
              }}
              onSkip={() => setOffer(null)}
            />
          ) : null}
          </div>
        </>
      )}
    </>
  );
}

function Checkout({
  items,
  addons,
  persona,
  onBack,
  onPay,
}: {
  items: WishlistView[];
  addons: CatalogProduct[];
  persona: ShopperPersona;
  onBack: () => void;
  onPay: () => void;
}) {
  const [method, setMethod] = useState<"upi" | "cod">("upi");
  const addonTotal = addons.reduce((sum, row) => sum + row.price, 0);
  const itemsTotal = items.reduce((sum, row) => sum + row.currentPrice, 0);
  const total = itemsTotal + addonTotal;
  return (
    <div className="checkout-page">
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Checkout</h1>
      </div>
      {!items.length ? (
        <p className="empty">Your bag is empty</p>
      ) : (
        <>
          <section className="checkout-block">
            <p className="checkout-kicker">Delivery address</p>
            <strong>{persona.name}</strong>
            <p>{persona.address}</p>
            <div className="checkout-lines">
              {items.map((item) => (
                <p key={item.id} className="meta">
                  {item.catalog.brand} · {item.catalog.title} · {formatInr(item.currentPrice)}
                </p>
              ))}
              {addons.map((row) => (
                <p key={row.sku} className="meta">
                  + {row.title} · {formatInr(row.price)}
                </p>
              ))}
            </div>
          </section>
          <section className="checkout-block">
            <p className="checkout-kicker">Payment method</p>
            <div className="pay-methods" role="radiogroup" aria-label="Payment method">
              <button
                type="button"
                role="radio"
                aria-checked={method === "upi"}
                className={`pay-option${method === "upi" ? " is-on" : ""}`}
                onClick={() => setMethod("upi")}
              >
                <span className="pay-dot" aria-hidden="true" />
                UPI (Google Pay, PhonePe)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={method === "cod"}
                className={`pay-option${method === "cod" ? " is-on" : ""}`}
                onClick={() => setMethod("cod")}
              >
                <span className="pay-dot" aria-hidden="true" />
                Cash on Delivery
              </button>
            </div>
          </section>
          <button className="cta checkout-pay" type="button" onClick={onPay}>
            PAY {formatInr(total)}
          </button>
        </>
      )}
    </div>
  );
}

function recFromLook(look: JeansLook, bagTitle: string): OrderRecOffer["picks"][number] {
  return {
    product: {
      productId: look.productId,
      sku: look.sku,
      brand: look.brand,
      title: look.title,
      price: look.price,
      size: "OS",
      sizeOos: false,
      image_url: look.image_url,
      category: look.category ?? "STUDIO",
    },
    categoryLabel: lookKindLabel(look.kind),
    blurb: look.title,
    why: `You're checking out ${bagTitle}. ${look.title} is a ${lookKindLabel(look.kind).toLowerCase()} pick for this order.`,
    match: "Strong match for today's order",
  };
}

function uniqueLookTiles(looks: JeansLook[]) {
  const seen = new Set<string>();
  return looks.filter((look) => {
    if (look.kind === "bag") return false;
    if (seen.has(look.image_url)) return false;
    seen.add(look.image_url);
    return true;
  });
}

function OrderRecSheet({
  offer,
  pick,
  looks,
  bagTitle,
  bagCategory,
  onPick,
  onAdd,
  onSkip,
}: {
  offer: OrderRecOffer;
  pick: number;
  looks: JeansLook[];
  bagTitle: string;
  bagCategory?: string;
  onPick: (index: number) => void;
  onAdd: (sku: string) => void;
  onSkip: () => void;
}) {
  const [extra, setExtra] = useState<JeansLook | null>(null);
  const fromPick = offer.picks[pick];
  const rec = extra ? recFromLook(extra, bagTitle) : fromPick;
  if (!rec) return null;
  const tiles = uniqueLookTiles(
    looks.length > 0
      ? looks
      : offer.picks.map((row) => ({
          productId: row.product.productId,
          sku: row.product.sku,
          brand: row.product.brand,
          title: row.product.title,
          image_url: row.product.image_url,
          price: row.product.price,
          kind: lookKindOf(row.product.title) ?? "top",
          source: "catalog" as const,
          wishlistItemId: null,
        })),
  )
    .filter((look) => look.productId !== rec.product.productId && look.image_url !== rec.product.image_url)
    .filter((look) => pairingAllowed(bagCategory ?? rec.product.category, look.category, look.title))
    .filter((look) => {
      if (bagCategory === "KIDS") return look.category === "KIDS" && look.kind !== "earrings" && look.kind !== "beauty";
      if (!/shirt|polo|tee|linen/i.test(bagTitle)) return true;
      return look.kind !== "earrings" && look.kind !== "beauty" && look.kind !== "home";
    });
  return (
    <section className="rec-inline" aria-label="Recommended for this purchase">
      <div className="rec-card rec-compact">
        <h2>Recommended for this purchase</h2>
        <div className="rec-row">
          <ProductThumb brand={rec.product.brand} title={rec.product.title} image={rec.product.image_url} />
          <div className="rec-copy">
            <strong>{rec.product.title}</strong>
            <div className="price">{formatInr(rec.product.price)}</div>
            <p className="kicker">Why we picked this</p>
            <p className="meta">{rec.why}</p>
            <span className="rec-match">{rec.match}</span>
            <div className="rec-chart">
              <SizeChartLink title={rec.product.title} category={rec.product.category} />
            </div>
          </div>
        </div>
        {tiles.length ? (
          <div className="look-carousel rec-looks">
            <p className="look-kicker">More recommendations</p>
            <div className="look-scroller">
              {tiles.map((look) => (
                <button
                  key={`${look.source}-${look.productId}`}
                  type="button"
                  className={`look-tile${rec.product.productId === look.productId ? " is-on" : ""}`}
                  onClick={() => {
                    const index = offer.picks.findIndex((row) => row.product.productId === look.productId);
                    if (index >= 0) {
                      setExtra(null);
                      onPick(index);
                      return;
                    }
                    setExtra(look);
                  }}
                >
                  <ProductThumb brand={look.brand} title={look.title} image={look.image_url} />
                  <strong>{look.brand}</strong>
                  <span>
                    {lookSourceLabel(look.source)} · {lookKindLabel(look.kind)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="rec-actions">
          {offer.picks.length > 1 ? (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setExtra(null);
                onPick((pick + 1) % offer.picks.length);
              }}
            >
              Show me other options
            </button>
          ) : null}
          <button className="cta" type="button" onClick={() => onAdd(rec.product.sku)}>
            Add · {formatInr(rec.product.price)}
          </button>
          <button className="ghost" type="button" onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
    </section>
  );
}

function OrdersList({ orders, onBack }: { orders: ShopperOrder[]; onBack: () => void }) {
  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Orders</h1>
      </div>
      {orders.length === 0 ? (
        <p className="empty">No orders yet</p>
      ) : (
        orders.map((order) => (
          <article key={order.id} className="card order-card">
            <p className="order-id">
              {order.id} · {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {order.items.map((row) => (
              <div key={`${order.id}-${row.title}`} className="order-line">
                <ProductThumb brand={row.brand} title={row.title} image={row.image_url} />
                <div>
                  <strong>{row.brand.toUpperCase()}</strong>
                  <div>{row.title}</div>
                  <div className="price">{formatInr(row.price)}</div>
                </div>
              </div>
            ))}
          </article>
        ))
      )}
    </>
  );
}

function Success({
  orderId,
  extras,
  onHome,
}: {
  orderId: string;
  extras?: string[];
  onHome: () => void;
}) {
  return (
    <div className="success">
      <div className="success-mark" aria-hidden="true">
        ✓
      </div>
      <h1>Order successful</h1>
      <p className="lede">Your order #{orderId.slice(0, 8)} has been placed.</p>
      {extras?.length ? <p className="meta">Also added: {extras.join(", ")}</p> : null}
      <button className="outline-pink" type="button" onClick={onHome}>
        Back to home
      </button>
    </div>
  );
}

function Settings({
  prefs,
  first,
  onBack,
  onToggle,
}: {
  prefs: NotificationPrefs;
  first: string;
  onBack: () => void;
  onToggle: (key: keyof NotificationPrefs, value: boolean) => void;
}) {
  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Wishlist alerts</h1>
      </div>
      <p className="lede">
        Choose which wishlist alerts {first} gets. Items that won&apos;t be restocked stay in the list — they are never sent as an alert.
      </p>
      <article className="card prefs-card">
        <h2>Wishlist Notifications</h2>
        <PrefRow
          label="📦 Size Back-in-Stock"
          checked={prefs.sizeRestockAlerts}
          onChange={(value) => onToggle("sizeRestockAlerts", value)}
        />
      </article>
    </>
  );
}

function PrefRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="pref-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch${checked ? " is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function Similar({
  fromId,
  onBack,
  onOpenCatalog,
  onAdd,
  onAddToBag,
}: {
  fromId: string;
  onBack: () => void;
  onOpenCatalog: (sku: string) => void;
  onAdd: (product: CatalogProduct) => void;
  onAddToBag: (product: CatalogProduct) => void;
}) {
  const runtime = useShopperRuntime();
  const initial = peekApi(runtime.api.getSimilar(fromId));
  const [products, setProducts] = useState<CatalogProduct[]>(initial?.products ?? []);
  const [query, setQuery] = useState(initial?.query ?? "similar");

  useEffect(() => {
    const result = runtime.api.getSimilar(fromId);
    if (!isThenable(result)) {
      if (result.ok) {
        setProducts(result.body.products);
        setQuery(result.body.query);
      }
      return;
    }
    let cancelled = false;
    void result.then((row) => {
      if (!cancelled && row.ok) {
        setProducts(row.body.products);
        setQuery(row.body.query);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runtime, fromId]);

  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Similar items</h1>
      </div>
      <p className="lede">More like {query} — colour, cut, and style variations.</p>
      {products.length === 0 ? (
        <p className="empty">No similar styles right now</p>
      ) : (
        <div className="similar-grid">
          {products.map((product) => (
            <article key={product.sku} className="similar-card">
              <button type="button" className="similar-shot" onClick={() => onOpenCatalog(product.sku)}>
                <ProductThumb brand={product.brand} title={product.title} image={product.image_url} />
                <span className="similar-chip">{similarVariationLabel(product.title)}</span>
              </button>
              <strong>{product.brand.toUpperCase()}</strong>
              <div className="wish-title">{product.title}</div>
              <div className="price">{formatInr(product.price)}</div>
              <SizeChartLink title={product.title} category={product.category} />
              <div className="similar-actions">
                {product.sizeOos ? (
                  <button type="button" className="wish-cta is-notify" onClick={() => onAdd(product)}>
                    Notify when back
                  </button>
                ) : (
                  <button type="button" className="wish-cta is-bag" onClick={() => onAddToBag(product)}>
                    Add to Bag
                  </button>
                )}
                <button type="button" className="wish-cta is-notify" onClick={() => onAdd(product)}>
                  Add to Wishlist
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function usePressClick(action: (id: string) => void) {
  const pressed = useRef<string | null>(null);
  return (id: string) => ({
    onPointerDown: () => {
      pressed.current = id;
    },
    onClick: (event: { detail: number; preventDefault?: () => void }) => {
      const fromThis = pressed.current === id;
      pressed.current = null;
      // Only accept a click that also pressed this control — blocks leftover open-sheet clicks.
      if (!fromThis) return;
      action(id);
    },
  });
}

function TagSheet({
  sheet,
  onPick,
  onDismiss,
}: {
  sheet: TagSheet;
  onPick: (tag: ContextTag | null, occasionDate: string | null) => void;
  onDismiss: () => void;
}) {
  const touched = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const [askDate, setAskDate] = useState(false);
  const [date, setDate] = useState("");

  useEffect(() => {
    touched.current = false;
    setAskDate(false);
    setDate("");
  }, [sheet.mode, sheet.itemId]);

  useEffect(() => {
    if (sheet.mode !== "add" || askDate) return;
    const timer = window.setTimeout(() => {
      // Timeout only closes the sheet — never picks a reason for the shopper.
      if (!touched.current) dismissRef.current();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [sheet.mode, sheet.itemId, askDate]);

  function choose(tag: ContextTag) {
    touched.current = true;
    if (tag === "occasion") {
      setAskDate(true);
      return;
    }
    onPick(tag, null);
  }

  const bindReason = usePressClick((id) => choose(id as ContextTag));
  const bindSheet = usePressClick((id) => {
    if (id === "dismiss") {
      touched.current = true;
      onDismiss();
    }
  });

  return (
    <div
      className="sheet-backdrop"
      onClick={() => {
        touched.current = true;
        onDismiss();
      }}
    >
      <div
        className="sheet tag-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        {askDate ? (
          <div className="occasion-date">
            <h2>When is the occasion?</h2>
            <p className="tag-lede">Pick the day you’ll wear it. Skip if you only know it’s for later.</p>
            <label className="occasion-date-field">
              <span>Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <div className="occasion-date-actions">
              <button type="button" className="wish-cta is-bag" onClick={() => onPick("occasion", date || null)}>
                Save date
              </button>
              <button type="button" className="ghost" onClick={() => onPick("occasion", null)}>
                Skip date
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2>Saving this for…?</h2>
            <p className="tag-lede">Why did you save this? Quality, fit, compare, or an upcoming occasion.</p>
            <div className="tag-options">
              {TAG_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={`tag-option tag-option-${choice.id}`}
                  {...bindReason(choice.id)}
                >
                  <span className="tag-emoji">{choice.emoji}</span>
                  <strong>{choice.label}</strong>
                  <em>{choice.hint}</em>
                </button>
              ))}
            </div>
            <button type="button" className="ghost tag-skip" {...bindSheet("dismiss")}>
              {sheet.mode === "add" ? "Skip" : "Cancel"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function initialSize(product: CatalogProduct): string {
  const sizes = sizesFor(product.title, product.category);
  if (sizes.includes(product.size)) return product.size;
  return sizes[0] ?? product.size;
}

function withSelectedSize(product: CatalogProduct, size: string): CatalogProduct {
  return {
    ...product,
    size,
    sizeOos: Boolean(product.sizeOos && size === product.size),
  };
}

function SizeSelect({
  title,
  category,
  selected,
  soldOutSize,
  onSelect,
}: {
  title: string;
  category?: string;
  selected: string;
  soldOutSize?: string | null;
  onSelect: (size: string) => void;
}) {
  const sizes = sizesFor(title, category);
  if (sizes.length === 0) return null;
  return (
    <div className="size-select">
      <div className="size-select-head">
        <span>Select size</span>
        <SizeChartLink title={title} category={category} />
      </div>
      <div className="size-chips" role="group" aria-label="Select size">
        {sizes.map((size) => {
          const oos = soldOutSize === size;
          return (
            <button
              key={size}
              type="button"
              className={`size-chip${selected === size ? " is-on" : ""}${oos ? " is-oos" : ""}`}
              aria-pressed={selected === size}
              aria-label={oos ? `${size} sold out` : `Size ${size}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(size);
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SizeChartLink({ title, category }: { title: string; category?: string }) {
  const chart = sizeChartFor(title, category);
  const [open, setOpen] = useState(false);
  if (!chart) return null;
  return (
    <>
      <button
        type="button"
        className="size-chart-link"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        Size chart
      </button>
      {open ? <SizeChartSheet chart={chart} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SizeChartSheet({ chart, onClose }: { chart: SizeChart; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tag-sheet size-chart-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Size chart</h2>
        <p className="tag-lede">
          {chart.label} · {chart.unit}
        </p>
        <div className="size-chart-wrap">
          <table className="size-chart">
            <thead>
              <tr>
                {chart.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={`${row[0]}-${index}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="meta">{chart.note}</p>
        <button type="button" className="wish-cta is-bag" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function ProductThumb({
  brand,
  title,
  image,
  onClick,
  tall,
}: {
  brand: string;
  title: string;
  image: string;
  onClick?: () => void;
  tall?: boolean;
}) {
  const className = `thumb has-photo ${thumbClass(brand)}${tall ? " thumb-hero" : ""}`;
  const img = <img src={image} alt={title} />;
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {img}
      </button>
    );
  }
  return <div className={className}>{img}</div>;
}

function useLongPress(onLong: () => void) {
  const timer = useRef<number | null>(null);
  function clear() {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }
  return {
    onPointerDown: () => {
      timer.current = window.setTimeout(onLong, 500);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onContextMenu: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      onLong();
    },
  };
}

function stockLine(item: WishlistView) {
  if (item.stockStatus === "discontinued") return "No longer sold";
  if (item.stockStatus === "oos") {
    return item.sizeWatch?.active
      ? `Out of stock · watching ${item.sizeWatch.size}`
      : "Out of stock";
  }
  return item.selectedSize ? `In stock · Size ${item.selectedSize}` : "In stock";
}

function stars(rating: number) {
  const full = Math.round(rating);
  return `${"★".repeat(full)}${"☆".repeat(Math.max(0, 5 - full))}`;
}

export function StyleLooks({ itemId }: { itemId: string }) {
  const runtime = useShopperRuntime();
  const [shots, setShots] = useState<StyleShot[]>([]);
  const [reviews, setReviews] = useState<StyleReview[]>([]);
  const [open, setOpen] = useState<StyleShot | null>(null);
  useEffect(() => {
    thenApi(Promise.resolve(runtime.api.getStylingLooks(itemId)), (body) => {
      setShots(body.items);
      setReviews(body.reviews ?? []);
    });
  }, [runtime, itemId]);
  if (!shots.length) return null;
  const avg = reviews.length ? reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length : 0;
  return (
    <div className="look-carousel style-looks">
      <p className="look-kicker">See how it looks — customer photos</p>
      <div className="ugc-strip">
        {shots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            className={`ugc-tile${shot.crop === "top" ? " crop-top" : shot.crop === "side" ? " crop-side" : shot.crop === "close" ? " crop-close" : ""}`}
            onClick={() => setOpen(shot)}
          >
            <img src={shot.image_url} alt={`${shot.wearer} wearing this look`} />
            <span>
              {shot.wearer} · {shot.city}
            </span>
          </button>
        ))}
      </div>
      {reviews.length ? (
        <div className="style-reviews">
          <p className="look-kicker">
            Customer reviews · {stars(avg)} {avg.toFixed(1)} ({reviews.length})
          </p>
          {reviews.map((row) => (
            <article key={`${row.author}-${row.comment}`} className="style-review">
              <strong>
                {row.author} · {row.city}
              </strong>
              <span>{stars(row.rating)}</span>
              <p>{row.comment}</p>
            </article>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="ugc-lightbox" onClick={() => setOpen(null)}>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={open.image_url} alt={`${open.wearer} wearing this look`} />
            <figcaption>
              {open.wearer} · {open.city} · {open.occasion}
            </figcaption>
            <p className="ugc-label">Customer photo</p>
            <button type="button" className="ghost" onClick={() => setOpen(null)}>
              Close
            </button>
          </figure>
        </div>
      ) : null}
    </div>
  );
}

function thumbClass(brand: string) {
  return `thumb-${brand.toLowerCase().replace(/[^a-z]/g, "")}`;
}

function IconMyntraM() {
  return (
    <svg viewBox="0 0 56 42" width="36" height="27" aria-hidden="true" overflow="visible">
      <defs>
        <linearGradient id="myn-magenta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9b1048" />
          <stop offset="16%" stopColor="#e2187d" />
          <stop offset="100%" stopColor="#e2187d" />
        </linearGradient>
        <linearGradient id="myn-coral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c45a12" />
          <stop offset="16%" stopColor="#f47820" />
          <stop offset="100%" stopColor="#f47820" />
        </linearGradient>
        <linearGradient id="myn-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d46a00" />
          <stop offset="16%" stopColor="#ff8c1a" />
          <stop offset="100%" stopColor="#ff8c1a" />
        </linearGradient>
        <linearGradient id="myn-pink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b01070" />
          <stop offset="16%" stopColor="#f218a8" />
          <stop offset="100%" stopColor="#f218a8" />
        </linearGradient>
      </defs>
      <g transform="translate(0 42) scale(1 -1)">
        <ellipse cx="10.5" cy="22" rx="6.6" ry="19" transform="rotate(-20 10.5 22)" fill="url(#myn-magenta)" />
        <ellipse cx="22" cy="21.2" rx="6.6" ry="19" transform="rotate(20 22 21.2)" fill="url(#myn-coral)" />
        <ellipse cx="34" cy="21.2" rx="6.6" ry="19" transform="rotate(-20 34 21.2)" fill="url(#myn-orange)" />
        <ellipse cx="45.5" cy="22" rx="6.6" ry="19" transform="rotate(20 45.5 22)" fill="url(#myn-pink)" />
      </g>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm6.3-1.8 4 4"
      />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0"
      />
    </svg>
  );
}
function IconHeart({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 7a4 4 0 0 1 7 3.8C19 15.6 12 20 12 20Z"
      />
    </svg>
  );
}
function IconBag() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        d="M6 8h12l-1 12H7L6 8Zm3 0V7a3 3 0 0 1 6 0v1"
      />
    </svg>
  );
}
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M4 11 12 4l8 7v9H4z" />
    </svg>
  );
}
