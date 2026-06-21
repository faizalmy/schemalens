# SchemaLens Architecture Diagram

```mermaid
graph TB
    subgraph User["👤 User"]
        Browser["Web Browser"]
    end

    subgraph Vercel["Vercel — Next.js 16 App Router"]
        direction TB
        
        subgraph Pages["Frontend Pages"]
            Landing["Landing Page<br/>(static)"]
            Auth["Sign In / Sign Up<br/>(auth pages)"]
            Dashboard["Dashboard<br/>(my schemas)"]
            Connect["Connect DB<br/>(introspection)"]
            Explore["ERD Explorer<br/>(React Flow)"]
            Share["Share Page<br/>(ISR static)"]
            Demo["Demo Page<br/>(static)"]
        end

        subgraph API["API Routes (Lambda)"]
            AuthAPI["/api/auth/[...auth]<br/>better-auth"]
            Introspect["/api/introspect<br/>connection + discovery"]
            Schemas["/api/schemas<br/>/api/schema/[id]"]
            AIDocs["/api/generate-docs<br/>AI documentation"]
            ShareAPI["/api/schema/[id]/share<br/>/api/share/[shareToken]"]
        end

        Middleware["Middleware<br/>auth redirects"]
    end

    subgraph AWS["AWS Cloud — us-east-1"]
        Aurora["Aurora PostgreSQL 16.6<br/>Serverless v2 (0.5–2 ACU)"]
        SubData["System Catalog<br/>User's DB introspection"]
        SubApp["Application Tables<br/>users · saved_schemas<br/>accounts · sessions · verifications"]
    end

    subgraph External["External Services"]
        DeepSeek["DeepSeek API<br/>(AI documentation)"]
    end

    %% Connections
    Browser --> Middleware
    Middleware --> Landing
    Middleware --> Auth
    Middleware --> Dashboard
    Middleware --> Connect
    Middleware --> Explore
    Middleware --> Share
    Middleware --> Demo

    Dashboard --> Schemas
    Connect --> Introspect
    Explore --> Schemas
    Explore --> Introspect
    Auth --> AuthAPI
    Share --> ShareAPI
    AIDocs --> DeepSeek

    Introspect -->|"introspection queries"| Aurora
    Schemas -->|"CRUD operations"| Aurora
    AuthAPI -->|"user data"| Aurora
    ShareAPI -->|"read schema"| Aurora
    AIDocs -->|"table metadata"| Aurora

    %% Styling
    classDef vercel fill:#1a1a2e,stroke:#22d3ee,color:#fff
    classDef aws fill:#3b1d0a,stroke:#fbbf24,color:#fff
    classDef external fill:#1e293b,stroke:#94a3b8,color:#fff
    classDef user fill:#0f172a,stroke:#a78bfa,color:#fff
    classDef page fill:#083344,stroke:#22d3ee,color:#e2e8f0
    classDef api fill:#064e3b,stroke:#34d399,color:#e2e8f0
    classDef db fill:#4c1d95,stroke:#a78bfa,color:#e2e8f0

    class Vercel vercel
    class AWS aws
    class External external
    class User user
    class Landing,Auth,Dashboard,Connect,Explore,Share,Demo page
    class AuthAPI,Introspect,Schemas,AIDocs,ShareAPI api
    class Aurora,SubData,SubApp db
```

## Data Flow

1. **Landing / Auth** → Static pages render fast, no DB needed
2. **Connect DB** → User pastes PostgreSQL connection string → server-side introspection queries Aurora system catalog → table/column/FK data returned as JSON
3. **ERD Explorer** → React Flow canvas renders tables as nodes, foreign keys as edges → click table for column details
4. **AI Docs** → Table metadata sent to DeepSeek API → natural language documentation generated → stored in Aurora
5. **Share** → Generates unique token → schema rendered as ISR static page → publicly accessible without auth
