/*
 * /plugin-demo-v2 — Seel Review Agent · Demo
 *
 * Uses seel-demo-widget-v2.js — all users see both Trustpilot invite AND
 * private feedback in parallel after AI resolves the issue. No CSAT gate.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import {
  Search, Truck, Package, MapPin, ChevronRight,
  Bell, User, CheckCircle2, Shield, ArrowLeft, Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_ORDER_ID, DEMO_CUSTOMER_NAME, MERCHANT_NAME } from "@/lib/reviewData";

const DEMO_WIDGET_SRC = "/seel-demo-widget-v2.js";

function useDemoWidgetV2() {
  useEffect(() => {
    (window as any).SeelDemoV2Config = {
      merchantName: MERCHANT_NAME,
      orderId: DEMO_ORDER_ID,
      customerName: DEMO_CUSTOMER_NAME,
    };
    if (!document.querySelector(`script[src="${DEMO_WIDGET_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = DEMO_WIDGET_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);
}

function MockStorefront() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-11 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-[13px]">A</div>
            <span className="font-bold text-[16px] text-gray-900">{MERCHANT_NAME}</span>
          </div>
          <nav className="hidden md:flex items-center gap-5 ml-4">
            {["Home", "Products", "Orders", "Support"].map(item => (
              <a key={item} href="#" onClick={e => e.preventDefault()}
                className={cn("text-[13px] transition-colors",
                  item === "Orders" ? "text-violet-600 font-semibold" : "text-gray-500 hover:text-gray-900"
                )}>{item}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"><Search size={16} /></button>
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 relative">
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">1</span>
            </button>
            <button className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700"><User size={15} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-6">
          <a href="#" onClick={e => e.preventDefault()} className="hover:text-gray-600">My Orders</a>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium">Order #{DEMO_ORDER_ID}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Order</p>
                  <p className="text-[18px] font-bold text-gray-900">#{DEMO_ORDER_ID}</p>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-3.5 py-1.5 text-[12px] font-semibold">
                  <Truck size={13} /> Out for Delivery
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="flex gap-4 mb-6">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center shrink-0">
                    <Package size={32} className="text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-[15px] mb-1">Premium Wireless Headphones</p>
                    <p className="text-[12px] text-gray-500">Color: Midnight Black · Qty: 1</p>
                    <p className="text-[13px] font-bold text-gray-800 mt-1.5">$149.99</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 w-fit font-medium">
                      <Shield size={10} /> Protected by Seel
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex justify-between">
                    {["Ordered", "Processed", "Shipped", "Out for Delivery", "Delivered"].map((step, i) => (
                      <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold z-10 relative",
                          i < 3 ? "bg-violet-600 text-white" :
                          i === 3 ? "bg-orange-500 text-white ring-2 ring-orange-200" :
                          "bg-gray-200 text-gray-400"
                        )}>
                          {i < 3 ? "✓" : i === 3 ? "●" : "○"}
                        </div>
                        <span className={cn("text-[9px] font-medium text-center leading-tight", i < 4 ? "text-gray-700" : "text-gray-400")}>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-3.5 left-[10%] right-[10%] h-0.5 bg-gray-200 -z-0">
                    <div className="h-full bg-violet-500 w-[65%]" />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-orange-50 border-t border-orange-100 flex items-center gap-3">
                <MapPin size={14} className="text-orange-600 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-orange-900">Estimated Delivery: Today by 8:00 PM</p>
                  <p className="text-[11px] text-orange-700">Last update: 11:43 AM — At local distribution center</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-[13px] font-semibold text-gray-800 mb-3">Shipping Details</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Recipient", value: DEMO_CUSTOMER_NAME },
                  { label: "Tracking No.", value: "1Z999AA10123456784" },
                  { label: "Carrier", value: "UPS Ground" },
                  { label: "Ship Date", value: "May 5, 2026" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">{label}</p>
                    <p className="text-[13px] text-gray-800 font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-[13px] font-semibold text-gray-800 mb-3">Order Summary</p>
              {[
                { label: "Subtotal", value: "$149.99" },
                { label: "Shipping", value: "Free" },
                { label: "Seel Protection", value: "$4.99" },
                { label: "Tax", value: "$13.50" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 text-[12px]">
                  <span className="text-gray-500">{label}</span>
                  <span className={cn("font-medium", label === "Shipping" ? "text-green-600" : "text-gray-800")}>{value}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between text-[13px] font-bold">
                <span className="text-gray-800">Total</span>
                <span className="text-gray-900">$168.48</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-[#6c47ff] flex items-center justify-center">
                  <Shield size={13} className="text-white" />
                </div>
                <span className="text-[12px] font-bold text-violet-900">Seel Protection Active</span>
              </div>
              <p className="text-[11px] text-violet-700 leading-relaxed mb-3">
                Your order is covered against loss, damage, and delivery failures.
              </p>
              {["Package loss", "Delivery damage", "Failed delivery"].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-[11px] text-violet-800 mb-1">
                  <CheckCircle2 size={12} className="text-violet-500 shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DemoControls() {
  const line2 = `<script src="seel-demo-widget-v2.js" async></script>`;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-5xl mx-auto px-6 h-11 flex items-center gap-3">
        <Link href="/"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground shrink-0">
          <ArrowLeft size={12} /> Back
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 shrink-0">
          <div className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center text-white text-[8px] font-bold">S</div>
          Seel Review Agent · Demo
        </div>
        <span className="text-border shrink-0">·</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <Code2 size={12} className="text-emerald-600 shrink-0" />
          <code className="text-[10px] font-mono text-emerald-700 truncate block">{line2}</code>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Widget live ↙
        </div>
      </div>
    </div>
  );
}

export default function PluginDemoV2Page() {
  useDemoWidgetV2();
  return (
    <div className="pt-11">
      <DemoControls />
      <MockStorefront />
    </div>
  );
}
