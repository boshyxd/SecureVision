erDiagram
Domain ||--o{ URL : "hosts"
Domain }|--|| DomainMetadata : "has"
Domain }o--o{ IP : "resolves_to"
IP ||--o{ URL : "hosts"
URL ||--|| Port : "uses"
URL }o--o{ Application : "runs"
URL }o--o{ Account : "associated_with"
Account ||--o{ AccountMetadata : "has"
Domain }o--o{ Tag : "tagged_with"
URL }o--o{ Tag : "tagged_with"

    Domain {
        bigint id PK
        string name
        boolean is_parked
        timestamp last_checked
    }

    DomainMetadata {
        bigint id PK
        bigint domain_id FK
        boolean was_breached
        boolean was_ransomed
        json metadata
    }

    IP {
        bigint id PK
        string address
        boolean is_routable
        timestamp last_seen
    }

    URL {
        bigint id PK
        bigint domain_id FK
        bigint ip_id FK
        string full_path
        string title
        timestamp last_checked
        float risk_score
    }

    Port {
        int number PK
        string service_type
    }

    Application {
        bigint id PK
        string name
        string type
    }

    Account {
        bigint id PK
        string username
        string password_hash
        float risk_score
        timestamp discovered_at
        string sample_filename
        int sample_line
    }

    AccountMetadata {
        bigint id PK
        bigint account_id FK
        string pattern_type
        json risk_factors
    }

    Tag {
        bigint id PK
        string type
        string value
        timestamp created_at
    }
