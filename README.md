# Tarefas

Lista de tarefas instalável. Os dados ficam no IndexedDB do aparelho. O service worker guarda a página e os arquivos para abrir sem internet.

## Rodar

O cache offline só existe no build de produção. O `next dev` não registra o service worker.

```bash
npm test
npm run lint
npm run build
npm start
```

Abra `http://localhost:3000`.

No celular, o service worker exige HTTPS. `http://192.168.x.x` não instala. Use um túnel HTTPS ou um host publicado, no mesmo endereço em que a página foi aberta pela primeira vez.

## Ciclo

1. Abra a página online e espere **Cache offline ativo**.
2. Crie algumas tarefas.
3. Instale: no Android, **Instalar aplicativo**; no iPhone, Compartilhar → Adicionar à Tela de Início.
4. Ative o modo avião, feche o navegador e abra o ícone.
5. Crie, conclua e exclua tarefas. Elas continuam no aparelho quando a rede volta.
