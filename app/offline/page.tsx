export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-16">
      <p className="font-display text-5xl tracking-tight">Sem conexão</p>
      <p className="mt-4 max-w-sm text-lg leading-7 text-muted">
        Esta visita ainda não estava salva no aparelho. Abra a lista uma vez
        com internet para continuar usando sem rede.
      </p>
      {/* Full page load so the service worker can serve the precached document. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-accent px-5 font-medium text-accent-ink"
      >
        Abrir a lista
      </a>
    </main>
  );
}
