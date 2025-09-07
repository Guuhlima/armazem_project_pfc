# 📦 Sistema de Controle de Estoque
Aplicação completa para gerenciamento de estoque, composta por API backend (Fastify + Prisma) e frontend (Next.js), com autenticação JWT e gerenciamento de permissões.

## 🚀 Tecnologias
**Backend** - Node.js + TypeScript - Fastify - Prisma ORM - PostgreSQL - bcrypt - jsonwebtoken - Jest  
**Frontend** - Next.js + TypeScript - React Hook Form + Zod - Tailwind CSS - Axios

## 📂 Estrutura do projeto
armazem_project_pfc/  
│  
├── Armazem_backend/      # API Fastify  
│   ├── src/  
│   │   ├── controllers/  # Lógica das rotas  
│   │   ├── schemas/      # Schemas TypeBox  
│   │   ├── lib/          # Configs (Prisma, etc.)  
│   │   └── ...  
│   ├── tests/            # Testes Jest  
│   └── package.json  
│  
└── armazem_frontend/     # Frontend Next.js  
    ├── src/app/          # Rotas do App Router  
    ├── components/       # Componentes reutilizáveis  
    ├── services/         # Chamadas à API  
    └── package.json

## ⚙️ Configuração e execução
1. Clonar o repositório:  
   `git clone https://github.com/seu-usuario/seu-repo.git`  
   `cd armazem_project_pfc`  

2. Rodar o docker-compose
   `acesse a pasta Armazem_backend e no CMD/TERMINAL rode o docker-compose up --build`

3. Configurar variáveis de ambiente:  

   **Backend (.env):**  
   `DATABASE_URL="postgresql://user:pass@localhost:5432/estoque_db?schema=public"`  
   `JWT_SECRET="sua_chave_jwt"`  
   `JWT_EXPIRES_IN="24h"`  

   **Frontend (.env.local):**  
   `NEXT_PUBLIC_API_URL="http://localhost:3333"`  

4. Instalar dependências:  
   **Backend:**  
   `cd Armazem_backend`  
   `npm install`  

   **Frontend:**  
   `cd ../armazem_frontend`  
   `npm install`  

5. Criar e migrar o banco de dados:  
   `cd ../Armazem_backend`  
   `npx prisma migrate dev`  

6. Rodar em modo desenvolvimento:  
   **Backend:**  
   `npm run dev` → http://localhost:3333  
   **Frontend:**  
   `cd ../armazem_frontend`  
   `npm run dev` → http://localhost:3000

## 🧪 Testes
**Backend:**  
`cd Armazem_backend`  
`npm test`  
Os testes utilizam Jest e podem rodar com banco de teste (.env.test).

## 📌 Funcionalidades
- Autenticação de usuários (login/cadastro)  
- Gerenciamento de equipamentos e estoque  
- CRUD completo de usuários e permissões  
- Interface web responsiva para controle de estoque  
- Testes unitários e de integração no backend

## 📄 Licença
Este projeto está sob a licença MIT.
