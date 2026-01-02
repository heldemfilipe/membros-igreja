# Sistema de Gerenciamento de Membros da Igreja

Sistema completo para gerenciar membros, congregados e visitantes da Assembleia de Deus de Rio Claro.

## Funcionalidades

### Dashboard
- Total de membros, congregados e total geral
- Gráficos de distribuição por sexo e tipo de participante
- Estatísticas em tempo real

### Painel de Aniversariantes
- Visualização de aniversariantes por mês
- Filtro por mês específico
- Informações de contato dos aniversariantes

### Cadastro de Membros
Sistema completo de cadastro com:

#### Identificação
- Nome completo (obrigatório)
- Conhecido como
- Igreja
- Cargo
- Sexo
- Data de nascimento
- Tipo de participante (Membro, Congregado, Visitante, Frequentador)

#### Endereço
- CEP, Logradouro, Número, Complemento
- Bairro, Cidade, Estado

#### Contato
- Telefone principal e secundário
- E-mail

#### Dados Complementares
- CPF, Estado Civil, Profissão
- Identidade, Órgão Expedidor, Data de Expedição
- Grau de Instrução
- Título de Eleitor (número, zona, seção)
- Tipo Sanguíneo
- Certidão de Nascimento/Casamento
- Reservista, Carteira de Motorista
- Chefe Familiar
- Data de Casamento
- Naturalidade, UF, Nacionalidade
- Origem Religiosa

#### Históricos da Pessoa
Sistema para registrar eventos importantes:
- Conversão
- Batismo nas Águas
- Batismo no Espírito Santo
- Consagração a Diácono(isa)
- Consagração a Presbítero
- Ordenação a Evangelista
- Ordenação a Pastor(a)

Cada histórico registra: tipo, data e localidade

#### Familiares
Cadastro de familiares com:
- Parentesco (Pai, Mãe, Cônjuge, Filho(a), Outro)
- Nome
- Data de nascimento

### Lista de Membros
- Visualização completa de todos os membros
- Filtro por tipo de participante
- Busca por nome
- Editar e excluir membros

## Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Design**: Tema escuro moderno e responsivo

## Instalação

### Pré-requisitos
- Node.js instalado (versão 14 ou superior)
- npm (geralmente vem com Node.js)

### Passo a Passo

1. Instale as dependências:
```bash
npm install
```

2. Inicialize o banco de dados:
```bash
npm run init-db
```

3. Inicie o servidor:
```bash
npm start
```

4. Acesse o sistema no navegador:
```
http://localhost:3000
```

## Modo de Desenvolvimento

Para desenvolvimento com reload automático:
```bash
npm run dev
```

## Estrutura do Projeto

```
membros-igreja/
├── database/
│   ├── schema.sql          # Schema do banco de dados
│   └── membros.db          # Banco de dados (criado após init-db)
├── public/
│   ├── index.html          # Interface principal
│   ├── styles.css          # Estilos com tema escuro
│   └── app.js              # Lógica da aplicação
├── scripts/
│   └── init-db.js          # Script de inicialização do BD
├── server.js               # Servidor Express + API REST
├── package.json            # Dependências do projeto
└── README.md               # Este arquivo
```

## API REST

### Endpoints Disponíveis

#### Membros
- `GET /api/membros` - Listar membros (com filtros: ?tipo=Membro&search=nome)
- `GET /api/membros/:id` - Buscar membro específico
- `POST /api/membros` - Criar novo membro
- `PUT /api/membros/:id` - Atualizar membro
- `DELETE /api/membros/:id` - Deletar membro

#### Dashboard
- `GET /api/dashboard` - Estatísticas gerais

#### Aniversariantes
- `GET /api/aniversariantes?mes=1` - Aniversariantes do mês

## Características do Sistema

### Tema Escuro
Interface moderna com fundo escuro para reduzir cansaço visual durante uso prolongado.

### Responsivo
Funciona perfeitamente em desktop, tablet e smartphone.

### Validação
Campos obrigatórios marcados com asterisco (*).

### Backup
O banco de dados SQLite está em um único arquivo (`database/membros.db`), facilitando backups.

## Dicas de Uso

1. **Primeiro Acesso**: Cadastre alguns membros de teste para familiarizar-se com o sistema
2. **Backup Regular**: Faça cópias do arquivo `database/membros.db` regularmente
3. **Filtros**: Use os filtros na lista de membros para encontrar pessoas rapidamente
4. **Aniversariantes**: Configure lembretes baseados no painel de aniversariantes
5. **Históricos**: Registre eventos importantes na vida eclesiástica dos membros

## Suporte

Para dúvidas ou problemas:
1. Verifique se o servidor está rodando (`npm start`)
2. Confirme se o banco foi inicializado (`npm run init-db`)
3. Verifique o console do navegador para erros JavaScript
4. Verifique o terminal do servidor para erros de backend

## Próximas Melhorias Sugeridas

- [ ] Sistema de autenticação de usuários
- [ ] Relatórios em PDF
- [ ] Exportação para Excel
- [ ] Upload de fotos dos membros
- [ ] Sistema de presença em cultos
- [ ] Gestão de dizimos e ofertas
- [ ] Envio de e-mails em massa
- [ ] SMS para aniversariantes

## Licença

MIT License - Livre para uso e modificação.
