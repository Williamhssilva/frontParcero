# Parcero Imóveis - Frontend

Este é o frontend do sistema Parcero Imóveis, uma plataforma para gerenciamento de propriedades imobiliárias.

## Pré-requisitos

- Node.js (versão 14.x ou superior)
- npm (normalmente vem com o Node.js)

## Instalação

1. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/parcero-frontend.git
   cd parcero-frontend
   ```

2. Instale as dependências:
   ```
   npm install
   ```

## Configuração

1. Crie um arquivo `.env` na raiz do projeto e adicione as seguintes variáveis:
   ```
   API_BASE_URL=http://localhost:5000/api
   ```
   Ajuste a URL conforme necessário para apontar para o seu backend.

## Executando o projeto

Para iniciar o servidor de desenvolvimento:

npm start

O aplicativo estará disponível em `http://localhost:5000`.

## Build para produção

Para criar uma versão otimizada para produção:

npm run build


Os arquivos de build estarão na pasta `dist/`.

## Estrutura do projeto

- `src/`: Contém o código-fonte do aplicativo
- `public/`: Arquivos públicos como index.html
- `js/`: Scripts JavaScript
- `css/`: Arquivos de estilo CSS

## Contribuindo

Por favor, leia CONTRIBUTING.md para detalhes sobre nosso código de conduta e o processo para enviar pull requests.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE.md para detalhes.
