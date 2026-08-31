import { useEffect, useMemo, useState } from "react";
import { parseDeepLink } from "../domain/deepLink";
import { ENGAGEMENT_CONFIG } from "../domain/engagementConfig";
import { localDateKey } from "../domain/localTime";
import { ITEM_A_ID } from "../domain/models";
import { thisMonthWindow, thisWeekWindow } from "../domain/occasion";
import { NOTE_MAX_LENGTH, truncateNote } from "../domain/saveContext";
import { SIMILAR_COPY, SIMILAR_DEMO_QUERY } from "../domain/similar";
import {
  PDP_DEMO_PRODUCT_ID,
  SEARCH_DEMO_QUERY,
  CATALOG_PRODUCTS,
  catalogById,
} from "../store/catalog";
import { formatDisplayPrice } from "../store/seed";
import { formatRate } from "../domain/metrics";
import { unwrap } from "../api/v1";
import { createRuntime, type AppRuntime } from "../runtime";
import { RuntimeProvider, useRuntime } from "./runtimeContext";

const SHOPPER = {
  name: "Sujata Banerjee",
  email: "sujata@example.com",
  first: "Sujata",
};

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
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

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
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
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M4 11 12 4l8 7v9H4z"
      />
    </svg>
  );
}

function thumbClass(brand: string) {
  const key = brand.toLowerCase().replace(/[^a-z]/g, "");
  return `thumb thumb-${key}`;
}

type Screen =
  | { name: "home" }
  | { name: "notifications" }
  | { name: "wishlist"; focusId?: string }
  | { name: "bag" }
  | { name: "checkout" }
  | { name: "success"; orderId: string }
  | { name: "pdp"; productId: string; size?: string }
  | { name: "search"; query?: string }
  | { name: "shop"; productId: string };

export function App({ runtime: injected }: { runtime?: AppRuntime }) {
  const runtime = useMemo(
    () => injected ?? createRuntime(),
    [injected],
  );
  return (
    <RuntimeProvider runtime={runtime}>
      <AppShell />
    </RuntimeProvider>
  );
}

function AppShell() {
  const runtime = useRuntime();
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [bagItemId, setBagItemId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const userId = runtime.sessionUserId;

  const wishlist = unwrap(runtime.api.getWishlist(userId)).items;
  const inbox = unwrap(runtime.api.getNotifications(userId)).items;
  const unread = inbox.filter((row) => !row.expired).length;

  function openDeepLink(raw: string) {
    const parsed = parseDeepLink(raw);
    if (parsed.kind === "wishlist_item") {
      const item = runtime.api.getWishlistItem(userId, parsed.itemId);
      if (!item.ok) {
        setScreen({
          name: "pdp",
          productId: parsed.itemId,
          size: parsed.size,
        });
        return;
      }
      setScreen({ name: "wishlist", focusId: parsed.itemId });
      return;
    }
    if (parsed.kind === "pdp") {
      setScreen({
        name: "pdp",
        productId: parsed.productId,
        size: parsed.size,
      });
      return;
    }
    setScreen({ name: "wishlist" });
  }

  function goHome() {
    setDrawerOpen(false);
    setInboxOpen(false);
    setScreen({ name: "home" });
  }

  return (
    <div className="shopper-stage">
      <div className="phone">
      <header className="app-header">
        <button
          type="button"
          className="icon-btn"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          <IconMenu />
        </button>
        <button className="brand" type="button" aria-label="MYNTRA" onClick={goHome}>
          myntra
        </button>
        <div className="header-tools">
          <button
            type="button"
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => setInboxOpen(true)}
          >
            <IconBell />
            {unread > 0 ? <span className="badge-count">{unread}</span> : null}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setDrawerOpen(false);
              setScreen({ name: "wishlist" });
            }}
          >
            <IconHeart />
            <span className="sr-only">Wishlist</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Bag"
            onClick={() => setScreen({ name: "bag" })}
          >
            <IconBag />
            {bagItemId ? <span className="badge-count">1</span> : null}
          </button>
        </div>
      </header>

      {drawerOpen ? (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-profile">
              <span className="drawer-avatar">P</span>
              <div>
                <strong>{SHOPPER.name}</strong>
                <span className="meta">{SHOPPER.email}</span>
              </div>
            </div>
            <nav>
              <button type="button" onClick={goHome}>
                <IconHome /> Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setScreen({ name: "wishlist" });
                }}
              >
                <IconHeart /> Saved
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
            </nav>
          </aside>
        </div>
      ) : null}

      {inboxOpen || screen.name === "notifications" ? (
        <div className="inbox-backdrop" onClick={() => setInboxOpen(false)}>
          <div className="inbox-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="inbox-head">
              <h2>Notifications</h2>
              {unread > 0 ? <span className="inbox-new">{unread} New</span> : null}
            </div>
            <Notifications
              items={inbox}
              onOpen={(id) => {
                const result = runtime.api.clickNotification(userId, id);
                refresh();
                setInboxOpen(false);
                if (result.ok) openDeepLink(result.body.deep_link);
              }}
              onDismissOccasion={(itemId) => {
                runtime.api.dismissOccasion(userId, itemId);
                refresh();
              }}
            />
          </div>
        </div>
      ) : null}

      <main className="phone-page">
        {screen.name === "home" && (
          <Home
            onOpenShop={(productId) => setScreen({ name: "shop", productId })}
          />
        )}
        {screen.name === "wishlist" && (
          <Wishlist
            items={wishlist}
            focusId={screen.focusId}
            occasionEnabled={runtime.flags.isOn("reeng.occasion")}
            onAddToBag={(id) => {
              const result = runtime.api.addToBag(userId, id);
              if (!result.ok) return;
              setBagItemId(id);
              setScreen({ name: "bag" });
              refresh();
            }}
            onRefresh={refresh}
          />
        )}
        {screen.name === "bag" && (
          <Bag
            item={wishlist.find((row) => row.id === bagItemId) ?? null}
            onBack={() => setScreen({ name: "wishlist" })}
            onCheckout={() => setScreen({ name: "checkout" })}
          />
        )}
        {screen.name === "checkout" && bagItemId && (
          <Checkout
            item={wishlist.find((row) => row.id === bagItemId) ?? null}
            onBack={() => setScreen({ name: "bag" })}
            onPlaceOrder={() => {
              const result = runtime.api.checkoutSuccess(userId, bagItemId);
              refresh();
              if (result.ok) {
                setBagItemId(null);
                setScreen({ name: "success", orderId: result.body.order_id });
              }
            }}
          />
        )}
        {screen.name === "success" && (
          <Success
            orderId={screen.orderId}
            onHome={goHome}
          />
        )}
        {screen.name === "pdp" && (
          <PdpFallback productId={screen.productId} size={screen.size} />
        )}
        {screen.name === "search" && (
          <SearchSave
            initialQuery={screen.query ?? SEARCH_DEMO_QUERY}
            savedProductIds={new Set(wishlist.map((row) => row.product_id))}
            onRefresh={refresh}
            onOpenHint={(deepLink) => openDeepLink(deepLink)}
          />
        )}
        {screen.name === "shop" && (
          <ShopPdp
            productId={screen.productId}
            alreadySaved={wishlist.some((row) => row.product_id === screen.productId)}
            onRefresh={refresh}
          />
        )}
      </main>
      </div>

      <aside className="demo-rail">
        <DemoRail
          onRefresh={refresh}
          onOpenSearch={() => setScreen({ name: "search", query: SEARCH_DEMO_QUERY })}
          onOpenJacketSearch={() =>
            setScreen({ name: "search", query: SIMILAR_DEMO_QUERY })
          }
          onOpenShop={() => setScreen({ name: "shop", productId: PDP_DEMO_PRODUCT_ID })}
        />
        <AnalyticsDock events={runtime.analytics.events} />
      </aside>
    </div>
  );
}

function Home({
  onOpenShop,
}: {
  onOpenShop: (productId: string) => void;
}) {
  const trending = CATALOG_PRODUCTS.filter((row) =>
    ["prod-kurta", "prod-gown"].includes(row.product_id),
  );
  return (
    <>
      <section className="welcome">
        <h2>Welcome back, {SHOPPER.first}!</h2>
        <p>Check out what&apos;s new today.</p>
      </section>
      <h3 className="section-title">Trending Now</h3>
      <div className="trend-grid">
        {trending.map((product) => (
          <button
            key={product.product_id}
            type="button"
            className="trend-card"
            onClick={() => onOpenShop(product.product_id)}
          >
            <div className={thumbClass(product.catalog.brand)}>
              {product.catalog.image_label}
            </div>
            <strong>{product.catalog.brand.toUpperCase()}</strong>
            <span>{product.catalog.title}</span>
            <div className="price">{formatDisplayPrice(product.catalog.price.amount)}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function DemoRail({
  onRefresh,
  onOpenSearch,
  onOpenJacketSearch,
  onOpenShop,
}: {
  onRefresh: () => void;
  onOpenSearch: () => void;
  onOpenJacketSearch: () => void;
  onOpenShop: () => void;
}) {
  const runtime = useRuntime();
  return (
    <>
      <FrequencyInspector />
      <MeasurementPanel />
      <div className="demo-bar">
        <strong>Demo controls</strong>
        <div className="demo-actions">
          <button
            type="button"
            className="cta"
            onClick={() => {
              runtime.pretendTripIn3Days();
              onRefresh();
            }}
          >
            Pretend trip is in 3 days
          </button>
          <button
            type="button"
            className="cta"
            onClick={() => onOpenSearch()}
          >
            Search “linen shirt”
          </button>
          <button
            type="button"
            className="cta"
            onClick={() => onOpenJacketSearch()}
          >
            Search jacket
          </button>
          <button
            type="button"
            className="cta"
            onClick={() => onOpenShop()}
          >
            Open a product page
          </button>
          <button
            type="button"
            className="cta"
            onClick={() => {
              runtime.triggerBothRestocks();
              onRefresh();
            }}
          >
            Restock both items
          </button>
          <button
            type="button"
            className="cta"
            onClick={() => {
              runtime.triggerRestock("M");
              onRefresh();
            }}
          >
            Back in stock — Size M
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              runtime.markOos();
              onRefresh();
            }}
          >
            Mark OOS
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              runtime.reset();
              onRefresh();
            }}
          >
            Reset demo
          </button>
        </div>
        <details className="lab">
          <summary>Lab (QA)</summary>
          <div className="demo-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.triggerRestock("L", "sku-linen-l");
                onRefresh();
              }}
            >
              Restock Size L (should not notify)
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.api.removeItem(runtime.sessionUserId, ITEM_A_ID);
                onRefresh();
              }}
            >
              Remove linen shirt
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.flags.set(
                  "reeng.stock_alerts",
                  !runtime.flags.isOn("reeng.stock_alerts"),
                );
                onRefresh();
              }}
            >
              Toggle stock alerts (now{" "}
              {runtime.flags.isOn("reeng.stock_alerts") ? "on" : "off"})
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.flags.set(
                  "reeng.occasion",
                  !runtime.flags.isOn("reeng.occasion"),
                );
                onRefresh();
              }}
            >
              Toggle occasion (now{" "}
              {runtime.flags.isOn("reeng.occasion") ? "on" : "off"})
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.flags.set(
                  "reeng.save_context",
                  !runtime.flags.isOn("reeng.save_context"),
                );
                onRefresh();
              }}
            >
              Toggle save context (now{" "}
              {runtime.flags.isOn("reeng.save_context") ? "on" : "off"})
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.flags.set(
                  "reeng.similar_nudge",
                  !runtime.flags.isOn("reeng.similar_nudge"),
                );
                onRefresh();
              }}
            >
              Toggle similar nudge (now{" "}
              {runtime.flags.isOn("reeng.similar_nudge") ? "on" : "off"})
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.resetFrequency();
                onRefresh();
              }}
            >
              Reset frequency
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.api.assignExperiment(runtime.sessionUserId, "control");
                onRefresh();
              }}
            >
              Assign experiment: control
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.api.assignExperiment(runtime.sessionUserId, "t1");
                onRefresh();
              }}
            >
              Assign experiment: T1
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.api.assignExperiment(runtime.sessionUserId, "t2");
                onRefresh();
              }}
            >
              Assign experiment: T2 (after P∥)
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.setClock("2026-08-29T02:00:00+05:30");
                onRefresh();
              }}
            >
              Clock 02:00
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.setClock("2026-08-30T10:00:00+05:30");
                runtime.flushPending();
                onRefresh();
              }}
            >
              Next day 10:00 + deliver pending
            </button>
          </div>
        </details>
      </div>
    </>
  );
}

function FrequencyInspector() {
  const runtime = useRuntime();
  const stats = unwrap(runtime.api.frequencyStats());
  const reasons = Object.entries(stats.suppressed)
    .map(([reason, count]) => `${reason}:${count}`)
    .join(" · ");
  return (
    <p className="meta" style={{ marginTop: 0, marginBottom: 12 }}>
      Inspector — sent {stats.sent}, pending {stats.pending}
      {reasons ? `, suppressed ${reasons}` : ""}
      {stats.alerts.length ? ` · alerts ${stats.alerts.join(",")}` : ""}
    </p>
  );
}

function Notifications({
  items,
  onOpen,
  onDismissOccasion,
}: {
  items: {
    id: string;
    title: string;
    body: string;
    type: string;
    expired: boolean;
    wishlist_item_id: string;
  }[];
  onOpen: (id: string) => void;
  onDismissOccasion: (itemId: string) => void;
}) {
  return (
    <>
      {items.length === 0 ? (
        <p className="empty">No notifications</p>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            <button
              type="button"
              className={`card notif-button${item.expired ? " expired" : ""}`}
              onClick={() => onOpen(item.id)}
            >
              <div className="notif-type">
                {item.expired ? "Expired" : item.type.replaceAll("_", " ")}
              </div>
              <h2>{item.title}</h2>
              <p className="meta">{item.body}</p>
            </button>
            {item.type === "occasion_approaching" && !item.expired ? (
              <button
                type="button"
                className="ghost"
                onClick={() => onDismissOccasion(item.wishlist_item_id)}
              >
                Dismiss reminder
              </button>
            ) : null}
          </div>
        ))
      )}
    </>
  );
}

function Wishlist({
  items,
  focusId,
  occasionEnabled,
  onAddToBag,
  onRefresh,
}: {
  items: {
    id: string;
    catalog: { brand: string; title: string; price: { amount: number } };
    preferred_size: string | null;
    sellable: boolean;
    active_signal: { label: string; type?: string } | null;
    occasion: { label: string; target_date: string | null } | null;
    occasion_signal: { label: string } | null;
    save_context: {
      source: string;
      summary: string;
      note: string | null;
    } | null;
  }[];
  focusId?: string;
  occasionEnabled: boolean;
  onAddToBag: (id: string) => void;
  onRefresh: () => void;
}) {
  const runtime = useRuntime();
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  return (
    <>
      <div className="page-title">
        <h1>My Wishlist</h1>
        <span className="count">{items.length} items</span>
      </div>
      <WishlistScroll focusId={focusId} />
      {items.length === 0 ? (
        <p className="empty">No active wishlist items</p>
      ) : (
        items.map((item) => (
          <article
            className={`card wishlist-card${focusId === item.id ? " focused" : ""}`}
            key={item.id}
            data-item-id={item.id}
          >
            <CardImpression
              itemId={item.id}
              hasActiveSignal={Boolean(item.active_signal)}
            />
            <div className={thumbClass(item.catalog.brand)}>
              {item.catalog.title.split(" ").at(-1)}
            </div>
            <div>
              {item.active_signal ? (
                <div
                  className={`signal-badge${item.active_signal.type === "occasion_approaching" ? " occasion" : ""}`}
                >
                  {item.active_signal.label}
                </div>
              ) : null}
              {item.occasion_signal ? (
                <div className="signal-badge occasion">
                  {item.occasion_signal.label}
                </div>
              ) : null}
              <strong>{item.catalog.brand.toUpperCase()}</strong>
              <div>{item.catalog.title}</div>
              <div className="price">
                {formatDisplayPrice(item.catalog.price.amount)}
              </div>
              <div className="meta">Size: {item.preferred_size ?? "—"}</div>
              {!item.sellable ? (
                <p className="oos">Size {item.preferred_size ?? ""} Out of Stock</p>
              ) : null}
              <SaveContextLine context={item.save_context} />
              <button
                className={item.sellable ? "wish-cta is-bag" : "wish-cta is-notify"}
                type="button"
                disabled={!item.sellable}
                aria-label={item.sellable ? undefined : "Currently unavailable"}
                onClick={() => onAddToBag(item.id)}
              >
                {item.sellable ? "Add to Bag" : "Notify Me"}
              </button>
              <div className="occasion-actions">
                {occasionEnabled ? (
                  <>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setSheetFor(item.id)}
                    >
                      {item.occasion ? "Edit occasion" : "Add occasion"}
                    </button>
                    {item.occasion ? (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          runtime.api.dismissOccasion(
                            runtime.sessionUserId,
                            item.id,
                          );
                          onRefresh();
                        }}
                      >
                        Dismiss
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
              <details className="overflow-menu">
                <summary>More</summary>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setNoteFor(item.id)}
                >
                  {item.save_context?.note ? "Edit note" : "Add a note"}
                </button>
              </details>
            </div>
          </article>
        ))
      )}
      {sheetFor ? (
        <OccasionSheet
          itemId={sheetFor}
          onClose={() => setSheetFor(null)}
          onSaved={onRefresh}
        />
      ) : null}
      {noteFor ? (
        <NoteSheet
          itemId={noteFor}
          initialNote={
            items.find((row) => row.id === noteFor)?.save_context?.note ?? ""
          }
          onClose={() => setNoteFor(null)}
          onSaved={onRefresh}
        />
      ) : null}
    </>
  );
}

function OccasionSheet({
  itemId,
  onClose,
  onSaved,
}: {
  itemId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const runtime = useRuntime();
  const existing = unwrap(
    runtime.api.getWishlistItem(runtime.sessionUserId, itemId),
  ).item;
  const [label, setLabel] = useState(existing.occasion?.label ?? "Vacation");
  const [date, setDate] = useState(existing.occasion?.target_date ?? "");
  const today = localDateKey(runtime.now(), ENGAGEMENT_CONFIG.timezone);
  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-label="Add occasion">
        <h2>Need this for an occasion?</h2>
        <p className="meta">
          We’ll remind you a few times as the date gets close — not every day.
          You can skip this entirely.
        </p>
        <div className="preset-row">
          {["Vacation", "Wedding", "Work", "Festive", "Other"].map((preset) => (
            <button
              key={preset}
              type="button"
              className={label === preset ? "ghost active" : "ghost"}
              onClick={() => setLabel(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <label className="meta">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <div className="demo-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              runtime.api.putOccasion(runtime.sessionUserId, itemId, {
                label,
                ...thisWeekWindow(today),
              });
              runtime.api.runOccasionScheduler();
              onSaved();
              onClose();
            }}
          >
            This week
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              runtime.api.putOccasion(runtime.sessionUserId, itemId, {
                label,
                ...thisMonthWindow(today),
              });
              runtime.api.runOccasionScheduler();
              onSaved();
              onClose();
            }}
          >
            This month
          </button>
          <button
            type="button"
            className="cta"
            onClick={() => {
              runtime.pretendTripIn3Days(itemId);
              onSaved();
              onClose();
            }}
          >
            Pretend in 3 days
          </button>
        </div>
        <div className="demo-actions">
          <button
            type="button"
            className="cta"
            disabled={!date}
            onClick={() => {
              runtime.api.putOccasion(runtime.sessionUserId, itemId, {
                label,
                target_date: date,
              });
              runtime.api.runOccasionScheduler();
              onSaved();
              onClose();
            }}
          >
            Save occasion
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function Bag({
  item,
  onBack,
  onCheckout,
}: {
  item: {
    catalog: { brand: string; title: string; price: { amount: number } };
    preferred_size?: string | null;
  } | null;
  onBack: () => void;
  onCheckout: () => void;
}) {
  if (!item) {
    return (
      <>
        <div className="subhead">
          <button type="button" onClick={onBack} aria-label="Back">
            ‹
          </button>
          <h1>Shopping Bag</h1>
        </div>
        <p className="empty">Your bag is empty</p>
      </>
    );
  }
  const mrp = item.catalog.price.amount;
  const fee = 20;
  return (
    <>
      <div className="subhead">
        <button type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1>Shopping Bag</h1>
      </div>
      <article className="card wishlist-card">
        <div className={thumbClass(item.catalog.brand)}>{item.catalog.title.split(" ").at(-1)}</div>
        <div>
          <strong>{item.catalog.brand.toUpperCase()}</strong>
          <div>{item.catalog.title}</div>
          <div className="meta">Size: {item.preferred_size ?? "—"}</div>
          <div className="price">{formatDisplayPrice(mrp)}</div>
        </div>
      </article>
      <article className="card">
        <p className="kicker">Price details</p>
        <div className="price-row">
          <span>Total MRP</span>
          <span>{formatDisplayPrice(mrp)}</span>
        </div>
        <div className="price-row">
          <span className="meta">Platform Fee</span>
          <span>{formatDisplayPrice(fee)}</span>
        </div>
        <div className="price-row total">
          <span>Total Amount</span>
          <span>{formatDisplayPrice(mrp + fee)}</span>
        </div>
      </article>
      <button className="cta sticky-pay" type="button" onClick={onCheckout}>
        Continue to checkout
      </button>
    </>
  );
}

function Checkout({
  item,
  onBack,
  onPlaceOrder,
}: {
  item: { catalog: { price: { amount: number } } } | null;
  onBack: () => void;
  onPlaceOrder: () => void;
}) {
  const [method, setMethod] = useState<"upi" | "cod">("upi");
  const total = (item?.catalog.price.amount ?? 0) + 20;
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
        <strong>{SHOPPER.name}</strong>
        <p className="meta">42, Koramangala 5th Block, Bengaluru, 560095</p>
      </article>
      <article className="card">
        <p className="kicker">Payment method</p>
        <button
          type="button"
          className={method === "upi" ? "pay-option is-on" : "pay-option"}
          onClick={() => setMethod("upi")}
        >
          UPI (Google Pay, PhonePe)
        </button>
        <button
          type="button"
          className={method === "cod" ? "pay-option is-on" : "pay-option"}
          onClick={() => setMethod("cod")}
        >
          Cash on Delivery
        </button>
      </article>
      <button className="cta sticky-pay" type="button" onClick={onPlaceOrder}>
        Place order
      </button>
      <p className="meta" style={{ textAlign: "center", marginTop: 8 }}>
        Pay {formatDisplayPrice(total)} · prototype, no charge
      </p>
    </>
  );
}

function Success({
  orderId,
  onHome,
}: {
  orderId: string;
  onHome: () => void;
}) {
  return (
    <div className="success">
      <div className="success-mark" aria-hidden="true">
        ✓
      </div>
      <h1>Order successful</h1>
      <p className="lede">Your order #{orderId.slice(0, 8).toUpperCase()} has been placed.</p>
      <button className="outline-pink" type="button" onClick={onHome}>
        Back to home
      </button>
    </div>
  );
}

function WishlistScroll({ focusId }: { focusId?: string }) {
  useEffect(() => {
    if (!focusId) return;
    const node = document.querySelector(`[data-item-id="${focusId}"]`);
    if (node && "scrollIntoView" in node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "center" });
    }
  }, [focusId]);
  return null;
}

function PdpFallback({
  productId,
  size,
}: {
  productId: string;
  size?: string;
}) {
  return (
    <>
      <h1>Product</h1>
      <div className="banner">
        This item is no longer on your wishlist.
        {size ? ` Size ${size} was requested.` : ""}
      </div>
      <article className="card">
        <div className="meta">Product {productId}</div>
        {size ? <div>Size {size}</div> : null}
      </article>
    </>
  );
}

function SaveContextLine({
  context,
}: {
  context: { summary: string; note: string | null } | null;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!context) return null;
  if (context.note) {
    const shown = truncateNote(context.note);
    return (
      <p className="save-context">
        {expanded || !shown.truncated ? context.note : shown.text}
        {shown.truncated ? (
          <button
            type="button"
            className="expand"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "less" : "more"}
          </button>
        ) : null}
      </p>
    );
  }
  return <p className="save-context">{context.summary}</p>;
}

function CardImpression({
  itemId,
  hasActiveSignal,
}: {
  itemId: string;
  hasActiveSignal: boolean;
}) {
  const runtime = useRuntime();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      runtime.api.touchViewed(runtime.sessionUserId, itemId);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [itemId, hasActiveSignal, runtime]);
  return null;
}

function NoteSheet({
  itemId,
  initialNote,
  onClose,
  onSaved,
}: {
  itemId: string;
  initialNote: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const runtime = useRuntime();
  const [note, setNote] = useState(initialNote);
  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-label="Add a note">
        <h2>Add a note</h2>
        <p className="meta">
          Optional — this stays on the card so you remember why you saved it.
        </p>
        <textarea
          aria-label="Note"
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. For the Goa trip"
        />
        <p className="meta">
          {note.length}/{NOTE_MAX_LENGTH}
        </p>
        <div className="demo-actions">
          <button
            type="button"
            className="cta"
            onClick={() => {
              runtime.api.patchNote(runtime.sessionUserId, itemId, {
                note: note.trim() ? note : null,
              });
              onSaved();
              onClose();
            }}
          >
            Save note
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchSave({
  initialQuery,
  savedProductIds,
  onRefresh,
  onOpenHint,
}: {
  initialQuery: string;
  savedProductIds: Set<string>;
  onRefresh: () => void;
  onOpenHint: (deepLink: string) => void;
}) {
  const runtime = useRuntime();
  const [query, setQuery] = useState(initialQuery);
  const [hint, setHint] = useState<{
    wishlist_item_id: string;
    copy: string;
    deep_link: string;
  } | null>(null);
  const [results, setResults] = useState(() => {
    const first = unwrap(
      runtime.api.search(runtime.sessionUserId, initialQuery),
    );
    return first.results;
  });

  useEffect(() => {
    const next = unwrap(runtime.api.search(runtime.sessionUserId, query));
    setResults(next.results);
    setHint(next.similar_wishlist_hint);
  }, [query, runtime]);

  return (
    <>
      <h1>Search</h1>
      <p className="lede">
        Saving from search remembers the query. If you already saved something
        similar, we’ll hint — without blocking results.
      </p>
      <input
        className="search-field"
        aria-label="Search query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {hint ? (
        <div className="similar-hint" role="status">
          <strong>{hint.copy || SIMILAR_COPY}</strong>
          <div className="similar-hint-actions">
            <button
              type="button"
              className="cta"
              onClick={() => {
                const tapped = runtime.api.tapSimilarNudge(
                  runtime.sessionUserId,
                  hint.wishlist_item_id,
                );
                if (tapped.ok) onOpenHint(tapped.body.deep_link);
              }}
            >
              View saved item
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                runtime.api.dismissSimilarNudge(
                  runtime.sessionUserId,
                  hint.wishlist_item_id,
                );
                const next = unwrap(
                  runtime.api.search(runtime.sessionUserId, query),
                );
                setHint(next.similar_wishlist_hint);
                setResults(next.results);
                onRefresh();
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {results.map((product) => {
        const saved = savedProductIds.has(product.product_id);
        return (
          <article className="card search-result" key={product.product_id}>
            <div>
              <strong>{product.catalog.brand}</strong>
              <div>{product.catalog.title}</div>
              <div className="price">
                {formatDisplayPrice(product.catalog.price.amount)}
              </div>
            </div>
            {saved ? (
              <span className="meta">On wishlist</span>
            ) : (
              <button
                type="button"
                className="cta"
                onClick={() => {
                  runtime.api.addWishlistItem(runtime.sessionUserId, {
                    product_id: product.product_id,
                    source: "search",
                    referring_query: query,
                    preferred_size: product.preferred_size,
                  });
                  onRefresh();
                }}
              >
                Save {product.catalog.title}
              </button>
            )}
          </article>
        );
      })}
    </>
  );
}

function ShopPdp({
  productId,
  alreadySaved,
  onRefresh,
}: {
  productId: string;
  alreadySaved: boolean;
  onRefresh: () => void;
}) {
  const runtime = useRuntime();
  const product = catalogById(productId);
  if (!product) {
    return <PdpFallback productId={productId} />;
  }
  return (
    <>
      <h1>Product</h1>
      <p className="lede">
        Save from the product page to keep that context on revisit.
      </p>
      <article className="card">
        <strong>{product.catalog.brand}</strong>
        <div>{product.catalog.title}</div>
        <div className="meta">Size {product.preferred_size}</div>
        <div className="price">
          {formatDisplayPrice(product.catalog.price.amount)}
        </div>
        {alreadySaved ? (
          <p className="meta">On wishlist</p>
        ) : (
          <button
            type="button"
            className="cta"
            onClick={() => {
              runtime.api.addWishlistItem(runtime.sessionUserId, {
                product_id: product.product_id,
                source: "pdp",
                preferred_size: product.preferred_size,
              });
              onRefresh();
            }}
          >
            Save to wishlist
          </button>
        )}
      </article>
    </>
  );
}

function MeasurementPanel() {
  const runtime = useRuntime();
  const snap = unwrap(runtime.api.getMeasurement());
  return (
    <section className="measurement" aria-label="Measurement dashboard">
      <h2>Measurement</h2>
      <p className="meta">
        CTR is diagnostic — not the ship metric. Primary proxy is nudged item
        conversion.
      </p>
      <div className="metrics-grid">
        <article className="metric primary">
          <div className="metric-id">P1 · primary proxy</div>
          <strong>{formatRate(snap.primary_proxy.rate)}</strong>
          <span className="meta">
            Nudged item conversion · {snap.primary_proxy.converted_items}/
            {snap.primary_proxy.sent_items} sent items
          </span>
        </article>
        <article className="metric diagnostic">
          <div className="metric-id">D1 · diagnostic</div>
          <strong>{formatRate(snap.diagnostics.ctr.rate)}</strong>
          <span className="meta">
            Re-engagement CTR · {snap.diagnostics.ctr.clicked}/
            {snap.diagnostics.ctr.sent} clicked/sent
          </span>
        </article>
        <article className="metric diagnostic">
          <div className="metric-id">D2 · diagnostic</div>
          <strong>{formatRate(snap.diagnostics.open_rate.rate)}</strong>
          <span className="meta">Nudge → wishlist open</span>
        </article>
        <article className="metric">
          <div className="metric-id">NS1 · north star</div>
          <strong>{formatRate(snap.north_star.rate)}</strong>
          <span className="meta">30-day wishlist purchaser rate</span>
        </article>
        <article
          className={`metric${snap.guardrails.monetary_leak === 0 ? " guard-ok" : " guard-fail"}`}
        >
          <div className="metric-id">G1 · guardrail</div>
          <strong>{snap.guardrails.monetary_leak}</strong>
          <span className="meta">Monetary leak (must be 0)</span>
        </article>
      </div>
      <p className="meta">
        Funnel: sent {snap.funnel.sent} → clicked {snap.funnel.clicked} → opened{" "}
        {snap.funnel.opened} → bag {snap.funnel.add_to_bag} → purchased{" "}
        {snap.funnel.purchased}
        {snap.funnel.purchased_nudged
          ? ` · nudged_in_last_7d ${snap.funnel.purchased_nudged}`
          : ""}
        {snap.funnel.sent - snap.funnel.clicked > 0
          ? ` · suppressed path visible in event log`
          : ""}
      </p>
      <p className="meta">
        Experiment {snap.experiment.exp_id} · unit {snap.experiment.unit} ·
        variant {snap.experiment.variant ?? "unassigned (prototype)"}
      </p>
    </section>
  );
}

function AnalyticsDock({
  events,
}: {
  events: { name: string; nudged_in_last_7d?: boolean; reason?: string }[];
}) {
  const runtime = useRuntime();
  const snap = unwrap(runtime.api.getMeasurement());
  const csv = unwrap(runtime.api.exportEventsCsv()).csv;
  return (
    <details className="debug">
      <summary>
        Measurement ({events.length} events) · proxy{" "}
        {formatRate(snap.primary_proxy.rate)} · CTR{" "}
        {formatRate(snap.diagnostics.ctr.rate)} · leak{" "}
        {snap.guardrails.monetary_leak}
      </summary>
      <p className="meta">Session event log (warehouse stand-in)</p>
      <ol>
        {events.map((event, index) => (
          <li key={`${event.name}-${index}`}>
            {event.name}
            {event.reason ? ` · ${event.reason}` : ""}
            {event.nudged_in_last_7d ? " · nudged_in_last_7d" : ""}
          </li>
        ))}
      </ol>
      <pre className="csv-export" aria-label="Event CSV">
        {csv}
      </pre>
    </details>
  );
}
