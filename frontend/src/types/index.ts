export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  quota_used: number;
  quota_max: number;
  storage_saved: number;
  created_at: string;
}

export interface FileNode {
  id: number;
  original_name: string;
  hash: string;
  size: number;
  mime_type: string;
  actual_mime_type: string;
  downloads: number;
  tags: string;
  is_deduped: boolean;
  created_at: string;
  trie_node: {
    id: number;
    name: string;
    path: string;
    owner_id: number;
    is_public: boolean;
  };
  data_block: {
    id: number;
    size: number;
    ref_count: number;
  };
}

export interface Directory {
  id: number;
  name: string;
  path: string;
  is_public: boolean;
  created_at: string;
}

export interface Share {
  id: number;
  token: string;
  expires_at?: string;
  downloads: number;
  created_at: string;
}

export interface StorageStats {
  total_files: number;
  unique_blocks: number;
  logical_size: number;
  physical_size: number;
  space_saved: number;
  deduplication_ratio: number;
  efficiency: string;
}

export interface SearchFilters {
  name?: string;
  mime_type?: string;
  size_min?: number;
  size_max?: number;
  date_from?: string;
  date_to?: string;
  tags?: string;
  uploader?: string;
}
