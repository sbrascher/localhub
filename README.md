# LocalHub

> Gerenciador desktop de projetos e POCs locais para você nunca mais se perder nos diretórios da sua máquina e saber, em segundos, o que já está versionado no **Git local** e no **Git remoto**.

---

## Principais Recursos (v0)

- **Visão em Cards na Home:** visualize seus projetos com capa opcional (ou monograma automático), descrição, caminho do diretório e status imediato de **Git Local** e **Git Remoto**.
- **Detecção Automática de Git:** ao associar uma pasta local, o LocalHub verifica automaticamente se existe repositório `.git`, qual a *branch* atual e se há *remote* configurado.
- **Filtros & Busca Instantânea:** filtre por *Todos*, *Git Remoto*, *Só Local* ou *Sem Git*, além de buscar por nome, descrição, branch ou caminho.
- **Ações Rápidas no Card:** abra a pasta no Windows Explorer, abra direto no VS Code, re-escaneie o status Git, edite ou exclua com confirmação.
- **Banco SQLite Configurável:** armazene seus dados localmente em `projects.db` e altere a pasta ou arquivo do banco a qualquer momento pelas configurações.
- **Visual Dark Tátil:** interface escura em grafite/carvão com tipografia técnica (`JetBrains Mono` + `Inter`) e ícones `Material Symbols Rounded`.

---

## Stack Tecnológica

- **Desktop:** Electron
- **Frontend:** Angular 21 (Standalone Components, Signals, `@if`/`@for`, Reactive Forms) + Angular CDK (`@angular/cdk/dialog`, `@angular/cdk/a11y`)
- **Persistência:** SQLite (`sql.js` em WebAssembly, sem necessidade de compilação nativa)
- **Empacotamento:** `electron-builder` (NSIS + Portable para Windows)

---

## Estrutura do Repositório

```text
.
├── rodar.bat             # Compila e inicia o LocalHub no Windows
├── gerar-release.bat     # Gera o build de produção e o release em release/
└── src/                  # Código-fonte da aplicação (Angular + Electron)
    ├── electron/         # Main process, Preload, SQLite (DbService) e Git (GitService)
    └── src/              # Aplicação Angular (Store, Home, Cards e Modais)
```

---

## Como Executar

### Pelo script `.bat` (Windows)
Dê um duplo clique ou execute no terminal:
```powershell
.\rodar.bat
```

### Via terminal (`src/`)
```powershell
cd src
npm install

# Desenvolvimento (Angular dev server + Electron)
npm run electron:dev

# Ou build de produção + Electron
npm run electron:preview
```

---

## Como Gerar o Release (Windows)

Execute na raiz do projeto:
```powershell
.\gerar-release.bat
```
Os artefatos (instalador NSIS e executável portátil) serão gerados na pasta `release/`.

---

## Repositório

```powershell
git clone https://github.com/sbrascher/localhub.git
```
