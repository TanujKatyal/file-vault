-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    quota_used BIGINT DEFAULT 0,
    quota_max BIGINT DEFAULT 10485760,
    storage_saved BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data blocks for deduplication
CREATE TABLE data_blocks (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(64) UNIQUE NOT NULL,
    data BYTEA,
    size BIGINT NOT NULL,
    ref_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trie nodes (your C++ TrieNode hierarchy)
CREATE TABLE trie_nodes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1000) NOT NULL,
    parent_id INTEGER REFERENCES trie_nodes(id),
    owner_id INTEGER REFERENCES users(id) NOT NULL,
    node_type VARCHAR(20) NOT NULL, -- 'file', 'directory', 'symlink'
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File nodes (your C++ FileNode)
CREATE TABLE file_nodes (
    id SERIAL PRIMARY KEY,
    trie_node_id INTEGER REFERENCES trie_nodes(id) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    actual_mime_type VARCHAR(255) NOT NULL,
    data_block_id INTEGER REFERENCES data_blocks(id) NOT NULL,
    ref_count INTEGER DEFAULT 1,
    downloads INTEGER DEFAULT 0,
    tags TEXT,
    is_deduped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Directory nodes (your C++ DirNode)
CREATE TABLE dir_nodes (
    id SERIAL PRIMARY KEY,
    trie_node_id INTEGER REFERENCES trie_nodes(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Symbolic link nodes (your C++ SymLinkNode)
CREATE TABLE sym_link_nodes (
    id SERIAL PRIMARY KEY,
    trie_node_id INTEGER REFERENCES trie_nodes(id) NOT NULL,
    target_path VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File sharing
CREATE TABLE shares (
    id SERIAL PRIMARY KEY,
    file_node_id INTEGER REFERENCES file_nodes(id) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    expires_at TIMESTAMP,
    downloads INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    action VARCHAR(50) NOT NULL,
    trie_node_id INTEGER REFERENCES trie_nodes(id),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_trie_nodes_path ON trie_nodes(path);
CREATE INDEX idx_trie_nodes_parent ON trie_nodes(parent_id);
CREATE INDEX idx_file_nodes_hash ON file_nodes(hash);
CREATE INDEX idx_data_blocks_hash ON data_blocks(hash);
CREATE INDEX idx_shares_token ON shares(token);
