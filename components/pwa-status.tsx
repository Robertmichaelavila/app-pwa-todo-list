"use client";

import { useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type CacheState = "checking" | "active" | "pending" | "unsupported";

let installPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

let cacheState: CacheState = "checking";
const cacheListeners = new Set<() => void>();

function emitInstall() {
  installListeners.forEach((listener) => listener());
}

function emitCache() {
  cacheListeners.forEach((listener) => listener());
}

function subscribeInstall(listener: () => void) {
  installListeners.add(listener);
  const onPrompt = (event: Event) => {
    event.preventDefault();
    installPrompt = event as BeforeInstallPromptEvent;
    emitInstall();
  };
  const onInstalled = () => {
    installPrompt = null;
    emitInstall();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    installListeners.delete(listener);
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function subscribeDisplay(listener: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function subscribeCache(listener: () => void) {
  cacheListeners.add(listener);
  let cancelled = false;
  let markActive: (() => void) | undefined;

  if (!("serviceWorker" in navigator)) {
    queueMicrotask(() => {
      if (cancelled) return;
      cacheState = "unsupported";
      emitCache();
    });
  } else {
    markActive = () => {
      if (cancelled) return;
      cacheState = "active";
      emitCache();
    };
    navigator.serviceWorker.addEventListener("controllerchange", markActive);
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (cancelled) return;
      cacheState = registration?.active ? "active" : "pending";
      emitCache();
    });
  }

  return () => {
    cancelled = true;
    cacheListeners.delete(listener);
    if (markActive) {
      navigator.serviceWorker.removeEventListener("controllerchange", markActive);
    }
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getStandaloneSnapshot() {
  return isStandaloneDisplay();
}

function getIosSnapshot() {
  return isIosBrowser();
}

function getInstallSnapshot() {
  return installPrompt !== null;
}

function getCacheSnapshot() {
  return cacheState;
}

function subscribeNothing() {
  return () => {};
}

function isStandaloneDisplay(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosBrowser(): boolean {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent);
  const isIpadDesktop =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadDesktop;
}

export function PwaStatus() {
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => true);
  const standalone = useSyncExternalStore(
    subscribeDisplay,
    getStandaloneSnapshot,
    () => false,
  );
  const ios = useSyncExternalStore(subscribeNothing, getIosSnapshot, () => false);
  const canInstall = useSyncExternalStore(
    subscribeInstall,
    getInstallSnapshot,
    () => false,
  );
  const cache = useSyncExternalStore(subscribeCache, getCacheSnapshot, () => "checking");
  const [installError, setInstallError] = useState<string | null>(null);

  async function install() {
    if (!installPrompt) return;
    setInstallError(null);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      emitInstall();
    } catch {
      setInstallError("Não foi possível abrir a instalação.");
    }
  }

  const cacheLabel =
    cache === "active"
      ? "Cache offline ativo"
      : cache === "unsupported"
        ? "Sem service worker"
        : cache === "pending"
          ? "Cache offline ainda não ativo"
          : "Verificando o aplicativo";

  return (
    <section id="tour-status" className="mt-10 space-y-3" aria-label="Instalação e conexão">
      {canInstall && !standalone ? (
        <button
          type="button"
          onClick={() => void install()}
          className="flex h-12 w-full items-center justify-center rounded-full bg-accent px-5 font-medium text-accent-ink"
        >
          Instalar aplicativo
        </button>
      ) : null}
      {ios && !standalone && !canInstall ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted">
          No iPhone ou iPad, abra Compartilhar e toque em Adicionar à Tela de
          Início. O ícone abre sem a barra do navegador.
        </p>
      ) : null}
      {installError ? (
        <p role="alert" className="text-sm text-danger">
          {installError}
        </p>
      ) : null}
      <p className="text-sm text-muted" aria-live="polite">
        {online ? "Online" : "Sem internet"}
        {" · "}
        {standalone ? "Aberto como aplicativo" : "No navegador"}
        {" · "}
        {cacheLabel}
      </p>
    </section>
  );
}
