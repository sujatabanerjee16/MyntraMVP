import { useEffect, useMemo, useRef, useState } from "react";
import { unwrap, type WishlistView } from "../api";
import type { JeansLook } from "../domain/jeansLooks";
import type { OrderRecOffer } from "../domain/orderRecs";
import type { StylistRec } from "../domain/stylist";
import {
  TAG_EMOJI,
  TAG_LABEL,
  WISHLIST_BUCKETS,
  formatInr,
  type ContextTag,
  type InboxRow,
  type NotificationPrefs,
  type WishlistBucketId,
} from "../domain/models";
import { createAppRuntime, type ShopperRuntime } from "../runtime";
import { awaitApi, isThenable, peekApi, thenApi } from "../thenApi";
import {
  PERSONAS,
  SITE_HEROES,
  allCatalog,
  searchCatalog,
  type CatalogProduct,
  type HeroSlide,
  type ShopperPersona,
  type SiteCat,
} from "../store";
import { ShopperRuntimeProvider, useShopperRuntime } from "./runtimeContext";

const SITE_CATS = ["MEN", "WOMEN", "KIDS", "HOME", "BEAUTY", "GENZ", "STUDIO"] as const;

const TAG_CHOICES: { id: ContextTag; emoji: string; label: string }[] = [
  { id: "occasion", emoji: "🎉", label: "Upcoming Occasion" },
  { id: "price_drop", emoji: "💸", label: "Waiting for Price Drop" },
  { id: "size_wait", emoji: "📦", label: "Waiting for My Size" },
  { id: "bookmarking", emoji: "🤔", label: "Just Bookmarking" },
];

type Screen =
  | { name: "home" }
  | { name: "wishlist"; focusId?: string; occasionOnly?: boolean }
  | { name: "pdp"; itemId: string; highlight?: boolean }
  | { name: "catalog"; sku: string }
  | { name: "bag" }
  | { name: "checkout" }
  | { name: "success"; orderId: string; extras?: string[] }
  | { name: "settings" }
  | { name: "similar"; fromId: string }
  | { name: "stylist" };

type TagSheet =
  | { mode: "add"; itemId: string }
  | { mode: "edit"; itemId: string };

function emptyShopper() {
  return {
    wishlist: [] as WishlistView[],
    restocking: [] as WishlistView[],
    dead: [] as WishlistView[],
    inbox: [] as InboxRow[],
    bag: null as WishlistView | null,
    bagAddons: [] as CatalogProduct[],
    catalog: [] as CatalogProduct[],
    prefs: { priceDropAlerts: true, sizeRestockAlerts: true, occasionReminders: true } as NotificationPrefs,
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
    bag: bagState.item,
    bagAddons: bagState.addons,
    catalog: unwrap(runtime.api.getCatalog()).products,
    prefs: unwrap(runtime.api.getPreferences()),
  };
}

async function readShopperAsync(runtime: ShopperRuntime, occasionOnly = false) {
  const list = await awaitApi(Promise.resolve(runtime.api.getWishlist(occasionOnly ? "occasion" : undefined)));
  const bagState = await awaitApi(Promise.resolve(runtime.api.getBag()));
  const inbox = await awaitApi(Promise.resolve(runtime.api.getInbox()));
  const catalog = await awaitApi(Promise.resolve(runtime.api.getCatalog()));
  const prefs = await awaitApi(Promise.resolve(runtime.api.getPreferences()));
  return {
    wishlist: list.items,
    restocking: list.restocking,
    dead: list.dead,
    inbox: inbox.items,
    bag: bagState.item,
    bagAddons: bagState.addons,
    catalog: catalog.products,
    prefs,
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
  const [inboxOpen, setInboxOpen] = useState(false);
  const [sheet, setSheet] = useState<TagSheet | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [quiet, setQuiet] = useState<string | null>(null);
  const [surface, setSurface] = useState<"web" | "phone">("web");
  const [couponOn, setCouponOn] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<SiteCat>("WOMEN");
  const [personaId, setPersonaId] = useState(runtime.store.personaId);
  const occasionOnly = screen.name === "wishlist" && Boolean(screen.occasionOnly);
  const persona = PERSONAS.find((row) => row.id === personaId) ?? PERSONAS[0];

  function refresh() {
    void readShopperAsync(runtime, occasionOnly).then(setData);
  }

  useEffect(() => {
    void Promise.resolve(runtime.hydrate()).then(() => {
      setPersonaId(runtime.store.personaId);
      return readShopperAsync(runtime, occasionOnly);
    }).then(setData);
  }, [runtime, occasionOnly]);

  const { wishlist, restocking, dead, inbox, bag, bagAddons, catalog, prefs } = data;

  function applyQuery(value: string) {
    setQuery(value);
    if (value.trim()) {
      setDrawerOpen(false);
      setInboxOpen(false);
      setSheet(null);
      setScreen({ name: "home" });
    }
  }

  function pickPersona(id: string) {
    void Promise.resolve(runtime.switchPersona(id)).then(() => {
      const next = runtime.store.persona();
      setPersonaId(next.id);
      setActiveCat(next.defaultCat);
      setQuery("");
      setSheet(null);
      setInboxOpen(false);
      setDrawerOpen(false);
      setLockOpen(false);
      setQuiet(null);
      setCouponOn(false);
      setSurface("web");
      setScreen({ name: "home" });
      refresh();
    });
  }

  function goHome() {
    setDrawerOpen(false);
    setInboxOpen(false);
    setSheet(null);
    setActiveCat(persona.defaultCat);
    setQuery("");
    setScreen({ name: "home" });
  }

  function openCat(cat: SiteCat) {
    setActiveCat(cat);
    setQuery("");
    setSheet(null);
    setInboxOpen(false);
    setDrawerOpen(false);
    setScreen({ name: "home" });
  }

  function goWishlist(next?: { focusId?: string; occasionOnly?: boolean }) {
    setDrawerOpen(false);
    setInboxOpen(false);
    setScreen({ name: "wishlist", ...next });
  }

  function startAdd(product: CatalogProduct) {
    thenApi(Promise.resolve(runtime.api.addItem(product, null, null)), (added) => {
      setSheet({ mode: "add", itemId: added.item.id });
      setScreen({ name: "wishlist", focusId: added.item.id });
      refresh();
    });
  }

  function addArrivalToBag(product: CatalogProduct) {
    const existing = wishlist.find((row) => row.productId === product.productId)?.id;
    if (existing) {
      thenApi(Promise.resolve(runtime.api.addToBag(existing)), () => {
        setDrawerOpen(false);
        setInboxOpen(false);
        setSheet(null);
        setScreen({ name: "bag" });
        refresh();
      });
      return;
    }
    thenApi(Promise.resolve(runtime.api.addItem(product, null, null)), (added) => {
      thenApi(Promise.resolve(runtime.api.addToBag(added.item.id)), () => {
        setDrawerOpen(false);
        setInboxOpen(false);
        setSheet(null);
        setScreen({ name: "bag" });
        refresh();
      });
    });
  }

  function openInboxRow(row: InboxRow) {
    thenApi(Promise.resolve(runtime.api.openNotification(row.id)), () => {
      setInboxOpen(false);
      setLockOpen(false);
      if (row.type === "occasion") {
        setScreen({ name: "wishlist", occasionOnly: true, focusId: row.itemIds[0] });
      } else {
        setScreen({ name: "pdp", itemId: row.itemIds[0], highlight: true });
      }
      refresh();
    });
  }

  function applyPush(result: { sent: number; quiet: string | null }) {
    setDrawerOpen(false);
    setInboxOpen(false);
    setSheet(null);
    refresh();
    if (result.sent > 0) {
      setQuiet(null);
      setSurface("phone");
      setLockOpen(true);
    } else {
      setLockOpen(false);
      setQuiet(result.quiet);
    }
  }

  useEffect(() => {
    if (!quiet) return;
    const timer = window.setTimeout(() => setQuiet(null), 4500);
    return () => window.clearTimeout(timer);
  }, [quiet]);

  const unread = inbox.filter((row) => !row.openedAt);
  const shownCatalog = query.trim()
    ? searchCatalog(query)
    : catalog.filter((row) => row.category === activeCat);
  const savedByProduct = new Map(wishlist.map((row) => [row.productId, row.id]));

  function goLaptop() {
    setSurface("web");
    setLockOpen(false);
    setInboxOpen(false);
  }

  const pages = (
    <>
          {screen.name === "home" ? (
            <Home
              variant={surface}
              catalog={shownCatalog}
              saved={wishlist.slice(0, 4)}
              couponOn={couponOn}
              query={query}
              activeCat={activeCat}
              savedByProduct={savedByProduct}
              onQuery={applyQuery}
              onSelectCat={openCat}
              onApplyCoupon={() => setCouponOn(true)}
              onOpenSaved={(id) => setScreen({ name: "pdp", itemId: id })}
              onOpenCatalog={(sku) => setScreen({ name: "catalog", sku })}
              onAdd={startAdd}
              onAddToBag={addArrivalToBag}
              onOpenWishlist={() => goWishlist()}
              onOpenStylist={() => {
                setDrawerOpen(false);
                setScreen({ name: "stylist" });
              }}
            />
          ) : null}
          {screen.name === "wishlist" ? (
            <Wishlist
              items={wishlist}
              restocking={restocking}
              dead={dead}
              focusId={screen.focusId}
              occasionOnly={Boolean(screen.occasionOnly)}
              onClearFilter={() => goWishlist({ focusId: screen.focusId })}
              onOpenSettings={() => setScreen({ name: "settings" })}
              onOpenPdp={(id) => setScreen({ name: "pdp", itemId: id })}
              onOpenCatalog={(sku) => setScreen({ name: "catalog", sku })}
              onAddToBag={(id) => {
                thenApi(Promise.resolve(runtime.api.addToBag(id)), () => {
                  setScreen({ name: "bag" });
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
              onBack={() => goWishlist({ focusId: screen.itemId })}
              onAddToBag={(id) => {
                thenApi(Promise.resolve(runtime.api.addToBag(id)), () => {
                  setScreen({ name: "bag" });
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
              onBack={goHome}
              onAdd={startAdd}
            />
          ) : null}
          {screen.name === "bag" ? (
            <Bag
              item={bag}
              onBack={() => goWishlist()}
              onCheckout={() => setScreen({ name: "checkout" })}
            />
          ) : null}
          {screen.name === "checkout" && bag ? (
            <Checkout
              item={bag}
              addons={bagAddons}
              persona={persona}
              onBack={() => setScreen({ name: "bag" })}
              onPlaceOrder={(sku) => {
                const finish = (result: { order_id: string; extras: string[] }) => {
                  refresh();
                  setScreen({ name: "success", orderId: result.order_id, extras: result.extras });
                };
                if (!sku) {
                  thenApi(Promise.resolve(runtime.api.checkoutSuccess()), finish);
                  return;
                }
                thenApi(Promise.resolve(runtime.api.addOrderAddon(sku)), () => {
                  thenApi(Promise.resolve(runtime.api.checkoutSuccess()), finish);
                });
              }}
            />
          ) : null}
          {screen.name === "success" ? (
            <Success orderId={screen.orderId} extras={screen.extras} onHome={goHome} />
          ) : null}
          {screen.name === "settings" ? (
            <Settings
              prefs={prefs}
              first={persona.first}
              onBack={() => goWishlist()}
              onToggle={(key, value) => {
                thenApi(Promise.resolve(runtime.api.setPreferences({ [key]: value })), () => refresh());
              }}
            />
          ) : null}
          {screen.name === "similar" ? (
            <Similar
              fromId={screen.fromId}
              onBack={() => goWishlist()}
              onOpenCatalog={(sku) => setScreen({ name: "catalog", sku })}
              onAdd={startAdd}
            />
          ) : null}
          {screen.name === "stylist" ? (
            <StylistPicks
              onBack={goHome}
              onOpenCatalog={(sku) => setScreen({ name: "catalog", sku })}
              onAdd={startAdd}
            />
          ) : null}
    </>
  );

  const overlays = (
    <>
        {drawerOpen ? (
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
            <aside className="drawer" onClick={(event) => event.stopPropagation()}>
              <div className="drawer-profile">
                <span className="drawer-avatar">{persona.first[0]}</span>
                <div>
                  <strong>{persona.name}</strong>
                  <span className="meta">{persona.email}</span>
                </div>
              </div>
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
                    setScreen({ name: "stylist" });
                  }}
                >
                  <IconSparkle /> Stylist
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setScreen({ name: "bag" });
                  }}
                >
                  <IconBag /> Orders
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setInboxOpen(true);
                  }}
                >
                  <IconBell /> Notifications
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setScreen({ name: "settings" });
                  }}
                >
                  <IconGear /> Control alerts
                </button>
              </nav>
            </aside>
          </div>
        ) : null}

        {inboxOpen ? (
          <div className="inbox-backdrop" onClick={() => setInboxOpen(false)}>
            <div className="inbox-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="inbox-head">
                <h2>Notifications</h2>
                {inbox.length ? <span className="inbox-new">{inbox.length} New</span> : null}
              </div>
              {inbox.length === 0 ? (
                <p className="empty">You&apos;re all caught up</p>
              ) : (
                inbox.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="card notif-button"
                    onClick={() => openInboxRow(row)}
                  >
                    <div className="notif-type">{notifLabel(row.type)}</div>
                    <h2>{row.title}</h2>
                    <p className="meta">{row.body}</p>
                  </button>
                ))
              )}
              <DemoPushes
                onPush={(run) => {
                  void Promise.resolve(run()).then((result) =>
                    applyPush(
                      pushOutcome(
                        result as {
                          ok: boolean;
                          body?: { sent?: number; reason?: string; suppressed?: string[] };
                        },
                      ),
                    ),
                  );
                }}
              />
            </div>
          </div>
        ) : null}

        {sheet ? (
          <TagSheet
            sheet={sheet}
            onPick={(tag, occasionDate) => {
              thenApi(Promise.resolve(runtime.api.updateTag(sheet.itemId, tag, occasionDate)), () => {
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
            <button type="button" className="icon-btn tool-label" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
              <IconProfile />
              <span>Profile</span>
            </button>
            <button type="button" className="icon-btn tool-label" aria-label="Wishlist" onClick={() => goWishlist()}>
              <IconHeart />
              <span>Wishlist</span>
            </button>
            <button
              type="button"
              className="icon-btn tool-label"
              aria-label="Notifications"
              onClick={() => {
                setDrawerOpen(false);
                setInboxOpen(true);
              }}
            >
              <IconBell />
              {unread.length ? <span className="badge-count">{unread.length}</span> : null}
              <span>Alerts</span>
            </button>
            <button
              type="button"
              className="icon-btn tool-label"
              aria-label="Bag"
              onClick={() => {
                setInboxOpen(false);
                setScreen({ name: "bag" });
              }}
            >
              <IconBag />
              {bag ? <span className="badge-count">1</span> : null}
              <span>Bag</span>
            </button>
          </div>
  );

  return (
    <div className={`shopper-stage is-${surface}`}>
      <div className="stage-bar">
        <div className="surface-switch" role="tablist" aria-label="Device">
          <button
            type="button"
            role="tab"
            aria-selected={surface === "web"}
            className={surface === "web" ? "is-on" : undefined}
            onClick={goLaptop}
          >
            Laptop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={surface === "phone"}
            className={surface === "phone" ? "is-on" : undefined}
            onClick={() => setSurface("phone")}
          >
            Phone
          </button>
        </div>
        <p className="device-caption">
          {lockOpen
            ? "Lock screen — tap the Myntra notification"
            : surface === "web"
              ? `${persona.first} is shopping on myntra.com`
              : persona.phoneLine}
        </p>
        <div className="stage-actions">
          <ShopperSwitch persona={persona} onPick={pickPersona} onAccount={() => setDrawerOpen(true)} />
          <button
            type="button"
            className="ghost reset-demo"
            onClick={() => {
              void Promise.resolve(runtime.reset()).then(() => {
                setPersonaId("sujata");
                setSheet(null);
                setInboxOpen(false);
                setLockOpen(false);
                setQuiet(null);
                setCouponOn(false);
                setQuery("");
                setActiveCat("WOMEN");
                setSurface("web");
                setScreen({ name: "home" });
                refresh();
              });
            }}
          >
            Reset demo
          </button>
        </div>
      </div>

      {surface === "web" ? (
        <div className="browser">
          <div className="browser-bar">
            <span className="browser-dots" aria-hidden="true" />
            <div className="browser-url">myntra.com</div>
          </div>
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
                      {cat === "STUDIO" ? <i>NEW</i> : null}
                    </button>
                    {cat === "WOMEN" ? (
                      <div className="mega">
                        <div>
                          <strong>Indian & Fusion Wear</strong>
                          <button type="button" onClick={() => applyQuery("kurta")}>Kurtas & Suits</button>
                          <button type="button" onClick={() => applyQuery("saree")}>Sarees</button>
                          <button type="button" onClick={() => applyQuery("dress")}>Dresses</button>
                        </div>
                        <div>
                          <strong>Western Wear</strong>
                          <button type="button" onClick={() => applyQuery("shirt")}>Shirts</button>
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
          {quiet ? <p className="quiet-toast is-web">{quiet}</p> : null}
          <button type="button" className="offer-tab" onClick={() => setCouponOn(true)}>
            UPTO ₹200 OFF
          </button>
          {overlays}
          <main className={`web-page${screen.name === "home" ? " is-home" : ""}`}>{pages}</main>
          {screen.name !== "home" ? (
            <div className="web-jump">
              <button type="button" className="ghost" onClick={() => setSurface("phone")}>
                Continue on her phone
              </button>
            </div>
          ) : null}
        </div>
      ) : (
      <div className="device-wrap">
        <div className={`device${lockOpen ? " is-locked" : ""}`}>
          <div className="device-notch" aria-hidden="true" />
          <div className={`phone${lockOpen ? " is-locked" : ""}`}>
        {lockOpen ? (
          <LockScreen
            alerts={unread.length ? unread : inbox.slice(0, 1)}
            onOpen={openInboxRow}
            onIgnore={() => setLockOpen(false)}
            onControlAlerts={() => {
              setLockOpen(false);
              setScreen({ name: "settings" });
            }}
          />
        ) : null}
        <div className="status-bar" aria-hidden="true">
          <span>10:00</span>
          <span>5G ●●●●</span>
        </div>
        {quiet ? <p className="quiet-toast">{quiet}</p> : null}
        <header className="app-header site-header">
          <button className="m-logo" type="button" aria-label="MYNTRA" onClick={goHome}>
            <IconMyntraM />
          </button>
          <label className="site-search">
            <IconSearch />
            <input
              type="search"
              placeholder="Search for products, brands and more"
              value={query}
              onChange={(event) => applyQuery(event.target.value)}
            />
          </label>
          {tools}
        </header>
        {overlays}
        <main className={`phone-page${screen.name === "home" ? " is-home" : ""}`}>{pages}</main>
        {screen.name !== "home" ? (
          <div className="phone-jump">
            <button type="button" className="ghost" onClick={goLaptop}>
              Continue on laptop
            </button>
          </div>
        ) : null}
          </div>
          <div className="device-home" aria-hidden="true" />
        </div>
      </div>
      )}
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
  onExplore: () => void;
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
            <img src={item.image_url} alt="" className="hero-photo" />
          </div>
        ))}
        <span className="polo-logo">{slide.brand}</span>
      </div>
      <div className="polo-copy">
        <h2>{slide.title}</h2>
        <p>{slide.offer}</p>
        <button type="button" className="polo-explore" onClick={onExplore}>
          + Explore
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

function Home({
  variant,
  catalog,
  saved,
  couponOn,
  query,
  activeCat,
  savedByProduct,
  onQuery,
  onSelectCat,
  onApplyCoupon,
  onOpenSaved,
  onOpenCatalog,
  onAdd,
  onAddToBag,
  onOpenWishlist,
  onOpenStylist,
}: {
  variant: "web" | "phone";
  catalog: CatalogProduct[];
  saved: WishlistView[];
  couponOn: boolean;
  query: string;
  activeCat: SiteCat;
  savedByProduct: Map<string, string>;
  onQuery: (value: string) => void;
  onSelectCat: (cat: SiteCat) => void;
  onApplyCoupon: () => void;
  onOpenSaved: (id: string) => void;
  onOpenCatalog: (sku: string) => void;
  onAdd: (product: CatalogProduct) => void;
  onAddToBag: (product: CatalogProduct) => void;
  onOpenWishlist: () => void;
  onOpenStylist: () => void;
}) {
  const slides = SITE_HEROES[activeCat];
  const searching = Boolean(query.trim());
  return (
    <>
      {variant === "phone" ? (
        <nav className="site-cats" aria-label="Categories">
          {SITE_CATS.map((cat) => (
            <button
              key={cat}
              type="button"
              className={activeCat === cat ? "is-on" : undefined}
              onClick={() => onSelectCat(cat)}
            >
              {cat}
              {cat === "STUDIO" ? <i>NEW</i> : null}
            </button>
          ))}
        </nav>
      ) : null}
      {searching ? null : (
        <>
      <section className={`coupon-ticket${couponOn ? " is-on" : ""}${variant === "web" ? " is-web" : ""}`}>
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
        wide={variant === "web"}
        onExplore={() => onQuery(slides[0]?.brand.split(" ")[0] ?? "")}
      />
      {variant === "web" ? (
        <div className="home-pad">
          <h3 className="medal-title">Medal worthy brands to bag</h3>
          <div className="brand-strip">
            {["Libas", "Biba", "H&M", "Roadster", "Anouk", "U.S. Polo Assn."].map((brand) => (
              <button key={brand} type="button" className="brand-chip" onClick={() => onQuery(brand.split(" ")[0])}>
                {brand}
              </button>
            ))}
          </div>
        </div>
      ) : null}
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
                <ProductThumb brand={item.catalog.brand} title={item.catalog.title} image={item.catalog.image_url} />
                <strong>{item.catalog.brand}</strong>
                {item.tag ? (
                  <span className={`tag-chip tag-${item.tag}`}>
                    {TAG_EMOJI[item.tag]} {TAG_LABEL[item.tag]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="home-pad">
        <div className="rail-head">
          <h3 className="section-title">Styled for you</h3>
          <button type="button" className="text-link" onClick={onOpenStylist}>
            See picks
          </button>
        </div>
        <p className="lede stylist-lede">Picks from your purchases, 60-day prices, and fit reviews — not another kurta you already bought.</p>
      </div>
        </>
      )}
      <div className="home-pad">
        <h3 className="section-title">
          {searching ? `Results for “${query}”` : `${activeCat[0]}${activeCat.slice(1).toLowerCase()} · New arrivals`}
        </h3>
        <div className={`trend-grid${variant === "web" ? " is-wide" : ""}`}>
          {catalog.length === 0 ? <p className="empty">No matches — try another search</p> : null}
          {catalog.map((product) => {
            const savedId = savedByProduct.get(product.productId);
            return (
            <article key={product.sku} className="trend-card-wrap">
              <div className="trend-media">
                <button
                  type="button"
                  className="trend-shot"
                  onClick={() => (savedId ? onOpenSaved(savedId) : onOpenCatalog(product.sku))}
                >
                  <ProductThumb brand={product.brand} title={product.title} image={product.image_url} />
                </button>
                <button
                  type="button"
                  className={`wish-heart${savedId ? " is-on" : ""}`}
                  aria-label={savedId ? "Saved to wishlist" : "Save to wishlist"}
                  onClick={() => (savedId ? onOpenSaved(savedId) : onAdd(product))}
                >
                  <IconHeart filled={Boolean(savedId)} />
                </button>
              </div>
              <button type="button" className="trend-card" onClick={() => (savedId ? onOpenSaved(savedId) : onOpenCatalog(product.sku))}>
                <strong>{product.brand.toUpperCase()}</strong>
                <span>{product.title}</span>
                <div className="price">{formatInr(product.price)}</div>
                <div className="oos">{product.sizeOos ? `Size ${product.size} sold out` : "\u00a0"}</div>
              </button>
              <div className="trend-actions">
                <button type="button" className="wish-cta is-bag" onClick={() => onAddToBag(product)}>
                  Add to Bag
                </button>
                {savedId ? (
                  <button type="button" className="wish-cta" onClick={() => onOpenSaved(savedId)}>
                    In wishlist
                  </button>
                ) : (
                  <button type="button" className="wish-cta is-notify" onClick={() => onAdd(product)}>
                    Add to Wishlist
                  </button>
                )}
              </div>
            </article>
            );
          })}
        </div>
      </div>
      {variant === "web" ? (
        <footer className="myntra-foot">
          <div>
            <h4>ONLINE SHOPPING</h4>
            <button type="button" onClick={() => onSelectCat("MEN")}>Men</button>
            <button type="button" onClick={() => onSelectCat("WOMEN")}>Women</button>
            <button type="button" onClick={() => onSelectCat("KIDS")}>Kids</button>
            <button type="button" onClick={() => onSelectCat("HOME")}>Home & Living</button>
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
            <h4>EXPERIENCE MYNTRA APP</h4>
            <p>Wishlist alerts stay on her phone — never a blast.</p>
            <button type="button" className="text-link" onClick={onOpenWishlist}>
              Open wishlist
            </button>
          </div>
        </footer>
      ) : null}
    </>
  );
}

function Wishlist({
  items,
  restocking,
  dead,
  focusId,
  occasionOnly,
  onClearFilter,
  onOpenSettings,
  onOpenPdp,
  onOpenCatalog,
  onAddToBag,
  onEditTag,
  onRemove,
  onSeeSimilar,
}: {
  items: WishlistView[];
  restocking: WishlistView[];
  dead: WishlistView[];
  focusId?: string;
  occasionOnly: boolean;
  onClearFilter: () => void;
  onOpenSettings: () => void;
  onOpenPdp: (id: string) => void;
  onOpenCatalog: (sku: string) => void;
  onAddToBag: (id: string) => void;
  onEditTag: (id: string) => void;
  onRemove: (id: string) => void;
  onSeeSimilar: (id: string) => void;
}) {
  const focusRestocking = Boolean(focusId && restocking.some((row) => row.id === focusId));
  const [tab, setTab] = useState<"available" | "restocking">(focusRestocking ? "restocking" : "available");
  const [bucket, setBucket] = useState<"all" | WishlistBucketId>("all");

  useEffect(() => {
    if (focusRestocking) setTab("restocking");
  }, [focusRestocking, focusId]);

  const allLive = [...items, ...restocking, ...dead];
  const inBucket = (item: WishlistView) => bucket === "all" || item.bucketId === bucket;
  const shownItems = items.filter(inBucket);
  const shownRestocking = restocking.filter(inBucket);
  const shownDead = dead.filter(inBucket);
  const shown = tab === "available" ? shownItems : shownRestocking;
  const total = allLive.length;

  return (
    <>
      <div className="page-title">
        <h1>Wishlist</h1>
        <span className="count">{total} items</span>
        <button type="button" className="icon-btn settings-btn" aria-label="Notification settings" onClick={onOpenSettings}>
          <IconGear />
        </button>
      </div>
      {occasionOnly ? (
        <div className="filter-bar">
          <span>Items saved for your occasion</span>
          <button type="button" className="ghost" onClick={onClearFilter}>
            Show all
          </button>
        </div>
      ) : null}
      <div className="bucket-row" role="tablist" aria-label="Wishlist collections">
        <button
          type="button"
          role="tab"
          aria-selected={bucket === "all"}
          className={bucket === "all" ? "is-on" : undefined}
          onClick={() => {
            setBucket("all");
            setTab("available");
          }}
        >
          All
        </button>
        {WISHLIST_BUCKETS.map((row) => {
          const count = allLive.filter((item) => item.bucketId === row.id).length;
          return (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={bucket === row.id}
              className={bucket === row.id ? "is-on" : undefined}
              onClick={() => {
                setBucket(row.id);
                setTab("available");
              }}
            >
              {row.label}
              <i>{count}</i>
            </button>
          );
        })}
      </div>
      <div className="wish-tabs" role="tablist" aria-label="Wishlist stock">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "available"}
          className={tab === "available" ? "is-on" : undefined}
          onClick={() => setTab("available")}
        >
          All available ({shownItems.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "restocking"}
          className={tab === "restocking" ? "is-on" : undefined}
          onClick={() => setTab("restocking")}
        >
          Restocking Soon ({shownRestocking.length})
        </button>
      </div>
      {tab === "available"
        ? shownDead.map((item) => (
            <DeadNudge key={item.id} item={item} onRemove={onRemove} onSeeSimilar={onSeeSimilar} />
          ))
        : null}
      {shown.length === 0 ? (
        <p className="empty">
          {tab === "restocking"
            ? "Nothing waiting on a restock in this collection."
            : shownRestocking.length
              ? "No in-stock sizes in this collection — check Restocking Soon."
              : bucket === "all"
                ? "Your wishlist is empty"
                : `Nothing in ${WISHLIST_BUCKETS.find((row) => row.id === bucket)?.label ?? "this collection"} yet`}
        </p>
      ) : (
        shown.map((item) => (
          <WishlistCard
            key={item.id}
            item={item}
            focused={focusId === item.id}
            onOpenPdp={onOpenPdp}
            onOpenCatalog={onOpenCatalog}
            onAddToBag={onAddToBag}
            onEditTag={onEditTag}
          />
        ))
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

function WishlistCard({
  item,
  focused,
  onOpenPdp,
  onOpenCatalog,
  onAddToBag,
  onEditTag,
}: {
  item: WishlistView;
  focused: boolean;
  onOpenPdp: (id: string) => void;
  onOpenCatalog: (sku: string) => void;
  onAddToBag: (id: string) => void;
  onEditTag: (id: string) => void;
}) {
  const runtime = useShopperRuntime();
  const [looks, setLooks] = useState<JeansLook[]>(() => peekApi(runtime.api.getLookPairs(item.id))?.items ?? []);
  const press = useLongPress(() => onEditTag(item.id));

  useEffect(() => {
    const result = runtime.api.getLookPairs(item.id);
    if (!isThenable(result)) {
      setLooks(result.ok ? result.body.items : []);
      return;
    }
    let cancelled = false;
    void result.then((row) => {
      if (!cancelled && row.ok) setLooks(row.body.items);
    });
    return () => {
      cancelled = true;
    };
  }, [runtime, item.id]);
  return (
    <div className={`wish-block${looks.length ? " has-looks" : ""}`}>
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
        <div>
          <strong>{item.catalog.brand.toUpperCase()}</strong>
          <div>{item.catalog.title}</div>
          <div className="price">
            {item.dropped ? <span className="price-was">{formatInr(item.priceAtSave)}</span> : null}
            {formatInr(item.currentPrice)}
            {item.dropped ? <span className="off-tag">{dropPercent(item)}% OFF</span> : null}
          </div>
          {item.tag ? (
            <span className={`tag-chip tag-${item.tag}`}>
              {TAG_EMOJI[item.tag]} {TAG_LABEL[item.tag]}
            </span>
          ) : null}
          <div className={item.stockStatus === "in_stock" ? "meta" : "oos"}>
            {stockLine(item)}
          </div>
          <button type="button" className="wish-cta is-bag" onClick={() => onAddToBag(item.id)}>
            MOVE TO BAG
          </button>
        </div>
      </article>
      {looks.length ? (
        <div className="look-carousel" aria-label={`Complete the look for ${item.catalog.title}`}>
          <p className="look-kicker">Complete the look</p>
          <div className="look-scroller">
            {looks.map((look) => (
              <button
                key={`${look.source}-${look.productId}`}
                type="button"
                className="look-tile"
                onClick={() => (look.wishlistItemId ? onOpenPdp(look.wishlistItemId) : onOpenCatalog(look.sku))}
              >
                <ProductThumb brand={look.brand} title={look.title} image={look.image_url} />
                <strong>{look.brand}</strong>
                <span>
                  {look.source === "wishlist" ? "In your wishlist" : "Same brand"} · {look.kind === "shoes" ? "Shoes" : "Top"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
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
  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>{item.catalog.brand}</h1>
      </div>
      <ProductThumb brand={item.catalog.brand} title={item.catalog.title} image={item.catalog.image_url} tall />
      <h2>{item.catalog.title}</h2>
      <div className="price">
        {item.dropped ? <span className="price-was">{formatInr(item.priceAtSave)}</span> : null}
        {formatInr(item.currentPrice)}
        {item.dropped ? <span className="off-tag">{dropPercent(item)}% OFF</span> : null}
      </div>
      {item.selectedSize ? <p className="size-pill">Size {item.selectedSize}</p> : null}
      <div className={item.stockStatus === "in_stock" ? "meta" : "oos"}>{stockLine(item)}</div>
      <button
        type="button"
        className={`wish-cta is-bag${highlight ? " is-highlight" : ""}`}
        onClick={() => onAddToBag(item.id)}
      >
        Add to Bag
      </button>
    </>
  );
}

function CatalogPdp({
  product,
  onBack,
  onAdd,
}: {
  product?: CatalogProduct;
  onBack: () => void;
  onAdd: (product: CatalogProduct) => void;
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
  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>{product.brand}</h1>
      </div>
      <ProductThumb brand={product.brand} title={product.title} image={product.image_url} tall />
      <h2>{product.title}</h2>
      <div className="price">{formatInr(product.price)}</div>
      <p className="size-pill">Size {product.size}</p>
      {product.sizeOos ? <p className="oos">Size {product.size} is currently sold out</p> : null}
      <button type="button" className="wish-cta is-notify" onClick={() => onAdd(product)}>
        Add to Wishlist
      </button>
    </>
  );
}

function Bag({
  item,
  onBack,
  onCheckout,
}: {
  item: WishlistView | null;
  onBack: () => void;
  onCheckout: () => void;
}) {
  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Shopping Bag</h1>
      </div>
      {!item ? (
        <p className="empty">Your bag is empty</p>
      ) : (
        <>
          <article className="card">
            <strong>{item.catalog.brand.toUpperCase()}</strong>
            <div>{item.catalog.title}</div>
            <div className="price">{formatInr(item.currentPrice)}</div>
          </article>
          <button className="cta" type="button" onClick={onCheckout}>
            Continue to checkout
          </button>
        </>
      )}
    </>
  );
}

function Checkout({
  item,
  addons,
  persona,
  onBack,
  onPlaceOrder,
}: {
  item: WishlistView;
  addons: CatalogProduct[];
  persona: ShopperPersona;
  onBack: () => void;
  onPlaceOrder: (addonSku?: string) => void;
}) {
  const runtime = useShopperRuntime();
  const [offer, setOffer] = useState<OrderRecOffer | null>(null);
  const [pick, setPick] = useState(0);
  const addonTotal = addons.reduce((sum, row) => sum + row.price, 0);

  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Checkout</h1>
      </div>
      <article className="card">
        <p className="kicker">Delivery address</p>
        <strong>{persona.name}</strong>
        <p className="meta">{persona.address}</p>
      </article>
      <article className="card">
        <p className="kicker">Paying</p>
        <p>{formatInr(item.currentPrice + addonTotal + 20)} · UPI</p>
        {addons.length ? (
          <p className="meta">Includes {addons.map((row) => row.title).join(", ")}</p>
        ) : null}
      </article>
      <button
        className="cta"
        type="button"
        onClick={() => {
          thenApi(Promise.resolve(runtime.api.getOrderRecs()), (recs) => {
            if (recs.picks.length === 0) {
              onPlaceOrder();
              return;
            }
            setPick(0);
            setOffer(recs);
          });
        }}
      >
        Place order
      </button>
      {offer ? (
        <OrderRecSheet
          offer={offer}
          pick={pick}
          onPick={setPick}
          onAdd={() => {
            const sku = offer.picks[pick]?.product.sku;
            setOffer(null);
            onPlaceOrder(sku);
          }}
          onSkip={() => {
            setOffer(null);
            onPlaceOrder();
          }}
        />
      ) : null}
    </>
  );
}

function OrderRecSheet({
  offer,
  pick,
  onPick,
  onAdd,
  onSkip,
}: {
  offer: OrderRecOffer;
  pick: number;
  onPick: (index: number) => void;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const rec = offer.picks[pick];
  if (!rec) return null;
  return (
    <div className="rec-sheet" role="dialog" aria-label="Recommended for today's order">
      <div className="rec-card">
        <div className="rec-head">
          <h2>Recommended for today's order</h2>
          <span className="rec-mode">Demo rec</span>
        </div>
        <p className="rec-read">{offer.cartRead}</p>
        <div className="rec-pick">
          {offer.picks.length > 1 ? (
            <button
              type="button"
              className="rec-nav"
              aria-label="Previous recommendation"
              onClick={() => onPick((pick - 1 + offer.picks.length) % offer.picks.length)}
            >
              ‹
            </button>
          ) : null}
          <div className="rec-product">
            <span className="rec-badge">Top pick</span>
            <p className="kicker">{rec.categoryLabel}</p>
            <ProductThumb brand={rec.product.brand} title={rec.product.title} image={rec.product.image_url} />
            <strong>{rec.product.title}</strong>
            <div className="price">{formatInr(rec.product.price)}</div>
            <p className="meta">{rec.blurb}</p>
            <div className="rec-why">
              <p className="kicker">Why we picked this</p>
              <p>{rec.why}</p>
              <span className="rec-match">{rec.match}</span>
            </div>
          </div>
          {offer.picks.length > 1 ? (
            <button
              type="button"
              className="rec-nav"
              aria-label="Next recommendation"
              onClick={() => onPick((pick + 1) % offer.picks.length)}
            >
              ›
            </button>
          ) : null}
        </div>
        {offer.picks.length > 1 ? (
          <button type="button" className="text-link rec-shuffle" onClick={() => onPick((pick + 1) % offer.picks.length)}>
            Show me other options
          </button>
        ) : null}
        <button className="cta" type="button" onClick={onAdd}>
          Add to this order · {formatInr(rec.product.price)}
        </button>
        <button className="ghost" type="button" onClick={onSkip}>
          Maybe next time
        </button>
      </div>
    </div>
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
        {first} wants a ping when it is time to buy — not a pile of alerts. Turn off any type. Dead items never reach this
        phone.
      </p>
      <article className="card prefs-card">
        <h2>Wishlist Notifications</h2>
        <PrefRow
          label="💸 Price Drop Alerts"
          checked={prefs.priceDropAlerts}
          onChange={(value) => onToggle("priceDropAlerts", value)}
        />
        <PrefRow
          label="📦 Size Back-in-Stock"
          checked={prefs.sizeRestockAlerts}
          onChange={(value) => onToggle("sizeRestockAlerts", value)}
        />
        <PrefRow
          label="🎉 Occasion Reminders"
          checked={prefs.occasionReminders}
          onChange={(value) => onToggle("occasionReminders", value)}
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

function StylistPicks({
  onBack,
  onOpenCatalog,
  onAdd,
}: {
  onBack: () => void;
  onOpenCatalog: (sku: string) => void;
  onAdd: (product: CatalogProduct) => void;
}) {
  const runtime = useShopperRuntime();
  const [items, setItems] = useState<StylistRec[]>(() => peekApi(runtime.api.getStylistRecs(5))?.items ?? []);

  useEffect(() => {
    const result = runtime.api.getStylistRecs(5);
    if (!isThenable(result)) {
      setItems(result.ok ? result.body.items : []);
      return;
    }
    let cancelled = false;
    void result.then((row) => {
      if (!cancelled && row.ok) setItems(row.body.items);
    });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Styled for you</h1>
      </div>
      <p className="lede">
        Ranked from purchase history, 60-day price trend, and size/fit reviews. Weights start at 40 / 30 / 30.
      </p>
      {items.length === 0 ? (
        <p className="empty">No stylist picks right now</p>
      ) : (
        items.map((row) => <StylistCard key={row.product.sku} row={row} onOpenCatalog={onOpenCatalog} onAdd={onAdd} />)
      )}
    </>
  );
}

function StylistCard({
  row,
  onOpenCatalog,
  onAdd,
}: {
  row: StylistRec;
  onOpenCatalog: (sku: string) => void;
  onAdd: (product: CatalogProduct) => void;
}) {
  return (
    <article className="card wishlist-card" data-product-id={row.product.productId}>
      <ProductThumb
        brand={row.product.brand}
        title={row.product.title}
        image={row.product.image_url}
        onClick={() => onOpenCatalog(row.product.sku)}
      />
      <div>
        <strong>{row.product.brand.toUpperCase()}</strong>
        <div>{row.product.title}</div>
        <div className="price">{formatInr(row.product.price)}</div>
        {row.flags.genuineDiscount ? <span className="stylist-chip">60-day deal</span> : null}
        {row.flags.fakeSale ? <span className="stylist-chip is-warn">Not a real drop</span> : null}
        <p className="stylist-reason">{row.reason}</p>
        <button type="button" className="wish-cta is-notify" onClick={() => onAdd(row.product as CatalogProduct)}>
          Add to Wishlist
        </button>
      </div>
    </article>
  );
}

function Similar({
  fromId,
  onBack,
  onOpenCatalog,
  onAdd,
}: {
  fromId: string;
  onBack: () => void;
  onOpenCatalog: (sku: string) => void;
  onAdd: (product: CatalogProduct) => void;
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
      <p className="lede">More like {query.replace(" similar", "")}.</p>
      {products.length === 0 ? (
        <p className="empty">No similar styles right now</p>
      ) : (
        products.map((product) => (
          <article key={product.sku} className="card wishlist-card">
            <ProductThumb
              brand={product.brand}
              title={product.title}
              image={product.image_url}
              onClick={() => onOpenCatalog(product.sku)}
            />
            <div>
              <strong>{product.brand.toUpperCase()}</strong>
              <div>{product.title}</div>
              <div className="price">{formatInr(product.price)}</div>
              <button type="button" className="wish-cta is-notify" onClick={() => onAdd(product)}>
                Add to Wishlist
              </button>
            </div>
          </article>
        ))
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
    onClick: (event: { detail: number }) => {
      const fromThis = pressed.current === id;
      pressed.current = null;
      // Ignore hover and the leftover mouse-up from the control that opened this sheet.
      if (event.detail > 0 && !fromThis) return;
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
  const [step, setStep] = useState<"tags" | "date">("tags");
  const [date, setDate] = useState("2026-09-05");
  const touched = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (sheet.mode !== "add") return;
    const timer = window.setTimeout(() => {
      if (!touched.current) dismissRef.current();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [sheet.mode, sheet.itemId]);

  function choose(tag: ContextTag) {
    touched.current = true;
    if (tag === "occasion") {
      setStep("date");
      return;
    }
    onPick(tag, null);
  }

  const bindReason = usePressClick((id) => choose(id as ContextTag));
  const bindSheet = usePressClick((id) => {
    if (id === "dismiss") onDismiss();
    else if (id === "save-date") onPick("occasion", date);
    else if (id === "skip-date") onPick("occasion", null);
  });

  return (
    <div
      className="sheet-backdrop"
      onClick={() => {
        if (sheet.mode === "add") onDismiss();
        else onDismiss();
      }}
    >
      <div
        className="sheet tag-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        {step === "tags" ? (
          <>
            <h2>Saving this for…?</h2>
            <div className="tag-options">
              {TAG_CHOICES.map((choice) => (
                <button key={choice.id} type="button" className="tag-option" {...bindReason(choice.id)}>
                  <span>{choice.emoji}</span>
                  {choice.label}
                </button>
              ))}
            </div>
            <button type="button" className="ghost" {...bindSheet("dismiss")}>
              {sheet.mode === "add" ? "Skip" : "Cancel"}
            </button>
          </>
        ) : (
          <>
            <h2>When is the occasion?</h2>
            <label className="date-label">
              Date
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <button type="button" className="cta" {...bindSheet("save-date")}>
              Save date
            </button>
            <button type="button" className="ghost" {...bindSheet("skip-date")}>
              Skip date
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function pushOutcome(result: {
  ok: boolean;
  body?: { sent?: number; reason?: string; suppressed?: string[] };
}): { sent: number; quiet: string | null } {
  if (!result.ok) return { sent: 0, quiet: "No phone notification sent." };
  const sent = result.body?.sent ?? 0;
  if (sent > 0) return { sent, quiet: null };
  return { sent: 0, quiet: quietMessage(result.body?.reason ?? result.body?.suppressed?.[0]) };
}

function quietMessage(reason?: string) {
  if (reason === "pref_off") {
    return "No phone notification. This shopper turned this alert off in Settings.";
  }
  if (reason === "wrong_size") {
    return "Correct: no push. Warehouse restocked L; she is watching S.";
  }
  if (reason === "cooldown") return "No second notification. Price-drop alerts are capped at one every 48 hours.";
  if (reason === "already_sent") return "Already notified for this restock.";
  if (reason === "no_watch") {
    return "No phone notification. This item is not watching a size.";
  }
  if (reason === "none_due") return "No occasion is due yet.";
  if (reason === "threshold") return "Drop was too small to notify.";
  return "No phone notification sent.";
}

function LockScreen({
  alerts,
  onOpen,
  onIgnore,
  onControlAlerts,
}: {
  alerts: InboxRow[];
  onOpen: (row: InboxRow) => void;
  onIgnore: () => void;
  onControlAlerts: () => void;
}) {
  return (
    <div className="lock-screen" role="dialog" aria-label="Phone lock screen">
      <div className="lock-clock">
        <div className="lock-time">10:00</div>
        <div className="lock-date">Sunday 30 August</div>
      </div>
      <div className="lock-alerts">
        {alerts.map((row) => (
          <button
            key={row.id}
            type="button"
            className="lock-card"
            aria-label={row.title}
            onClick={() => onOpen(row)}
          >
            <span className="lock-app">myntra</span>
            <span className="lock-now">now</span>
            <strong>{row.title}</strong>
            <p>{row.body}</p>
          </button>
        ))}
      </div>
      <p className="lock-hint">One useful ping — not a feed. Tap to open Myntra.</p>
      <button type="button" className="lock-ignore" onClick={onControlAlerts}>
        Too many notifications? Choose what reaches this phone
      </button>
      <button type="button" className="lock-ignore" onClick={onIgnore}>
        Unlock without opening
      </button>
    </div>
  );
}

function ShopperSwitch({
  persona,
  onPick,
  onAccount,
}: {
  persona: ShopperPersona;
  onPick: (id: string) => void;
  onAccount: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const shown = PERSONAS.filter((row) => {
    const hay = `${row.name} ${row.city} ${row.blurb}`.toLowerCase();
    return hay.includes(filter.trim().toLowerCase());
  });

  return (
    <div className="persona-switch">
      <button
        type="button"
        className="persona-trigger"
        aria-label="Switch shopper"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="persona-face" aria-hidden="true">
          {persona.first[0]}
        </span>
        {persona.first}
        <span className="persona-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <>
          <div className="persona-backdrop" onClick={() => setOpen(false)} />
          <div className="persona-menu" role="listbox" aria-label="Shoppers">
            <p className="persona-hint">Demo: switch the shopper to see the wishlist adapt to a different order history.</p>
            <label className="persona-search">
              <input
                type="search"
                placeholder="Search shoppers"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </label>
            {shown.length === 0 ? <p className="persona-empty">No shopper matches</p> : null}
            {shown.map((row) => (
              <button
                key={row.id}
                type="button"
                role="option"
                aria-selected={row.id === persona.id}
                className={`persona-row${row.id === persona.id ? " is-on" : ""}`}
                onClick={() => {
                  onPick(row.id);
                  setFilter("");
                  setOpen(false);
                }}
              >
                <strong>
                  {row.first} · {row.age} · {row.city}
                </strong>
                <span>{row.blurb}</span>
              </button>
            ))}
            <button
              type="button"
              className="persona-account"
              onClick={() => {
                setOpen(false);
                onAccount();
              }}
            >
              Account & notifications
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DemoPushes({
  onPush,
}: {
  onPush: (run: () => unknown) => void;
}) {
  const runtime = useShopperRuntime();
  return (
    <div className="inbox-demo">
      <p className="inbox-demo-kicker">Demo · simulate a lock-screen push</p>
      <p className="inbox-demo-note">
        In the live app these fire from the server. Shoppers only see them on the lock screen and in this Alerts tray.
      </p>
      <button
        type="button"
        onClick={() => onPush(() => runtime.dropLibas())}
      >
        Drop Libas price
      </button>
      <button
        type="button"
        onClick={() => onPush(() => runtime.restockBiba())}
      >
        Restock her saved size (S)
      </button>
      <button
        type="button"
        onClick={() => onPush(() => runtime.runOccasion())}
      >
        Send occasion reminder
      </button>
      <p className="inbox-demo-kicker is-silent">Stays silent on purpose</p>
      <button
        type="button"
        onClick={() => onPush(() => runtime.restockBibaWrongSize())}
      >
        Other size restocked (L) — no push
      </button>
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
  if (item.stockStatus === "discontinued") return "Discontinued";
  if (item.stockStatus === "oos") {
    return item.sizeWatch?.active
      ? `Out of stock · watching ${item.sizeWatch.size}`
      : "Out of stock";
  }
  return item.selectedSize ? `In stock · Size ${item.selectedSize}` : "In stock";
}

function dropPercent(item: WishlistView) {
  return Math.max(1, Math.round((1 - item.currentPrice / item.priceAtSave) * 100));
}

function thumbClass(brand: string) {
  return `thumb-${brand.toLowerCase().replace(/[^a-z]/g, "")}`;
}

function notifLabel(type: InboxRow["type"]) {
  if (type === "price_drop") return "Price drop";
  if (type === "restock") return "Restock";
  return "Occasion";
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
      <ellipse cx="10.5" cy="22" rx="6.6" ry="19" transform="rotate(-20 10.5 22)" fill="url(#myn-magenta)" />
      <ellipse cx="22" cy="21.2" rx="6.6" ry="19" transform="rotate(20 22 21.2)" fill="url(#myn-coral)" />
      <ellipse cx="34" cy="21.2" rx="6.6" ry="19" transform="rotate(-20 34 21.2)" fill="url(#myn-orange)" />
      <ellipse cx="45.5" cy="22" rx="6.6" ry="19" transform="rotate(20 45.5 22)" fill="url(#myn-pink)" />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2 13.4 8 18 9.4 13.4 10.8 12 15.6 10.6 10.8 6 9.4 10.6 8 12 3.2Zm6.4 9.2 0.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3ZM5.6 13.6 6.1 15l1.4.4-1.4.4-.5 1.4-.5-1.4-1.4-.4 1.4-.4.5-1.4Z"
      />
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
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a6 6 0 0 1 6 6v3.1l1.6 2.4A1 1 0 0 1 18.8 16H5.2a1 1 0 0 1-.8-1.5L6 12.1V9a6 6 0 0 1 6-6Zm-1.7 16h3.4a1.7 1.7 0 0 1-3.4 0Z"
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
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.1 12.6a7.4 7.4 0 0 0 .1-.6 7.4 7.4 0 0 0-.1-.6l2-1.6-1.9-3.3-2.4 1a7 7 0 0 0-1.1-.6l-.4-2.6H10.7l-.4 2.6a7 7 0 0 0-1.1.6l-2.4-1-1.9 3.3 2 1.6a7.4 7.4 0 0 0-.1.6 7.4 7.4 0 0 0 .1.6l-2 1.6 1.9 3.3 2.4-1c.3.2.7.5 1.1.6l.4 2.6h4.6l.4-2.6c.4-.2.8-.4 1.1-.6l2.4 1 1.9-3.3-2-1.6ZM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4Z"
      />
    </svg>
  );
}
