"""Vector store using Qdrant + sentence-transformers embeddings.

Replaces the local TF-IDF vectorizer with a full semantic search backend.
Uses Qdrant Cloud (if URL/Key provided in .env) or falls back to in-memory Qdrant.
Credentials loaded from .env file via python-dotenv.

Supports document chunking: documents are split into ~300-token chunks
with 15% overlap before embedding. This prevents long documents from diluting
retrieval precision.
"""
import os
import uuid
import re
# pyrefly: ignore [missing-import]
from qdrant_client import QdrantClient
# pyrefly: ignore [missing-import]
from qdrant_client.http.models import Distance, VectorParams, PointStruct
# pyrefly: ignore [missing-import]
from sentence_transformers import SentenceTransformer

# Load .env file from project root
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
QDRANT_COLLECTION = os.environ.get("QDRANT_COLLECTION", "suryanagar_docs")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


def _chunk_text(text: str, chunk_size: int = 300, overlap: float = 0.15) -> list:
    """Split text into chunks of approximately chunk_size words with overlap.

    Returns list of (chunk_text, chunk_index) tuples.
    """
    words = text.split()
    if len(words) <= chunk_size:
        return [(text, 0)]

    overlap_words = int(chunk_size * overlap)
    step = chunk_size - overlap_words
    chunks = []

    for i in range(0, len(words), step):
        chunk_words = words[i:i + chunk_size]
        if not chunk_words:
            break
        chunks.append((" ".join(chunk_words), len(chunks)))
        if i + chunk_size >= len(words):
            break

    return chunks


class VectorStore:
    def __init__(self):
        # Local state to support get_full_text() reassembly and backward compatibility
        self.doc_ids = []          # chunk-level IDs (e.g. "file.docx__chunk_0")
        self.texts = []            # chunk texts
        self.metadatas = []        # chunk-level metadata
        self.parent_doc_ids = []   # original document IDs (for dedup)

        # O(1) lookup dicts — avoid linear scans in hybrid_search
        self._parent_metadata = {}   # parent_doc_id -> metadata dict
        self._parent_full_text = {}  # parent_doc_id -> original full text

        # Init Qdrant Client
        if QDRANT_URL and QDRANT_API_KEY:
            self.client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
            print(f"Connected to Qdrant Cloud at {QDRANT_URL}")
        elif QDRANT_URL:
            self.client = QdrantClient(url=QDRANT_URL)
            print(f"Connected to local Qdrant at {QDRANT_URL}")
        else:
            self.client = QdrantClient(location=":memory:") # Fallback
            print("Using in-memory Qdrant (no QDRANT_URL provided in .env)")
        
        # Lazy-load the embedding model on first use to avoid
        # MemoryError / paging-file crashes at startup on low-RAM machines.
        self._encoder = None
        self._vector_size = None

    @property
    def encoder(self):
        if self._encoder is None:
            print(f"Loading embedding model: {EMBEDDING_MODEL}")
            self._encoder = SentenceTransformer(EMBEDDING_MODEL)
        return self._encoder

    @property
    def vector_size(self):
        if self._vector_size is None:
            self._vector_size = self.encoder.get_sentence_embedding_dimension()
        return self._vector_size

    def add(self, doc_id: str, text: str, metadata: dict):
        """Add a whole document (no chunking). Backward compatible."""
        self.doc_ids.append(doc_id)
        self.texts.append(text)
        self.metadatas.append(metadata)
        self.parent_doc_ids.append(doc_id)
        self._parent_metadata[doc_id] = metadata
        self._parent_full_text[doc_id] = text

    def add_chunked(self, doc_id: str, text: str, metadata: dict,
                     chunk_size: int = 300, overlap: float = 0.15):
        """Add a document with chunking. Each chunk is stored separately but
        linked back to the parent doc_id for deduplication during search.
        """
        # Store original full text and metadata for O(1) lookup
        self._parent_metadata[doc_id] = metadata
        self._parent_full_text[doc_id] = text

        chunks = _chunk_text(text, chunk_size=chunk_size, overlap=overlap)

        for chunk_text, chunk_idx in chunks:
            if len(chunks) == 1:
                chunk_id = doc_id  # single-chunk docs keep their original ID
            else:
                chunk_id = f"{doc_id}__chunk_{chunk_idx}"

            chunk_metadata = dict(metadata)
            chunk_metadata["parent_doc_id"] = doc_id
            chunk_metadata["chunk_index"] = chunk_idx
            chunk_metadata["total_chunks"] = len(chunks)

            self.doc_ids.append(chunk_id)
            self.texts.append(chunk_text)
            self.metadatas.append(chunk_metadata)
            self.parent_doc_ids.append(doc_id)

    def add_single_document(self, doc_id: str, text: str, metadata: dict,
                            chunk_size: int = 300, overlap: float = 0.15):
        """Add a single document to local state and upload its vectors to Qdrant immediately."""
        start_idx = len(self.doc_ids)
        self.add_chunked(doc_id, text, metadata, chunk_size, overlap)
        
        new_texts = self.texts[start_idx:]
        new_chunk_ids = self.doc_ids[start_idx:]
        new_metadatas = self.metadatas[start_idx:]
        new_parent_ids = self.parent_doc_ids[start_idx:]
        
        if not new_texts:
            return
            
        embeddings = self.encoder.encode(new_texts)
        points = []
        for idx, (chunk_id, txt, meta, parent_id) in enumerate(zip(new_chunk_ids, new_texts, new_metadatas, new_parent_ids)):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, chunk_id))
            payload = {
                "chunk_id": chunk_id,
                "text": txt,
                "parent_doc_id": parent_id,
                "metadata": meta
            }
            points.append(PointStruct(id=point_id, vector=embeddings[idx].tolist(), payload=payload))
            
        self.client.upsert(
            collection_name=QDRANT_COLLECTION,
            points=points
        )

    def build(self):
        """Call once after all documents have been added to batch embed and upload."""
        # Recreate collection to ensure a clean slate on /ingest
        if self.client.collection_exists(QDRANT_COLLECTION):
            self.client.delete_collection(QDRANT_COLLECTION)
            
        self.client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
        )
        
        if not self.texts:
            return
            
        print("Encoding documents into vectors...")
        embeddings = self.encoder.encode(self.texts)
        
        points = []
        for idx, (chunk_id, text, metadata, parent_id) in enumerate(zip(self.doc_ids, self.texts, self.metadatas, self.parent_doc_ids)):
            # Qdrant requires UUID or integer ID. We use uuid5 based on chunk_id string.
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, chunk_id))
            payload = {
                "chunk_id": chunk_id,
                "text": text,
                "parent_doc_id": parent_id,
                "metadata": metadata
            }
            points.append(PointStruct(id=point_id, vector=embeddings[idx].tolist(), payload=payload))
            
        # Upload in batches
        print(f"Uploading {len(points)} vectors to Qdrant collection '{QDRANT_COLLECTION}'...")
        batch_size = 100
        for i in range(0, len(points), batch_size):
            self.client.upsert(
                collection_name=QDRANT_COLLECTION,
                points=points[i:i+batch_size]
            )

    def search(self, query: str, top_k: int = 5, dedupe_by_parent: bool = True) -> list:
        """Search for the most relevant chunks/documents.

        Args:
            query: Search query
            top_k: Number of results to return
            dedupe_by_parent: If True, returns only the best chunk per parent
                              document. This ensures each document appears at
                              most once in the results.
        """
        # Guard against querying a collection that doesn't exist yet. This is
        # the normal state right after a server restart when using the
        # in-memory Qdrant fallback (no QDRANT_URL set): the index lives only
        # in process memory, so `uvicorn --reload` — or any restart — wipes
        # it, and the next query would otherwise crash the whole endpoint
        # instead of just coming back empty. Fail soft; answer_query() already
        # handles an empty result set by returning "No relevant documents
        # found", which is the correct behavior until POST /ingest is re-run.
        try:
            if not self.client.collection_exists(QDRANT_COLLECTION):
                print(
                    f"[VectorStore.search] Collection '{QDRANT_COLLECTION}' does not "
                    f"exist yet — returning no results. POST /ingest to build it."
                )
                return []
        except Exception as e:
            print(f"[VectorStore.search] collection_exists() check failed ({e}); returning no results.")
            return []

        query_vector = self.encoder.encode(query).tolist()

        # Fetch more to allow for deduplication without losing results
        limit = top_k * 3 if dedupe_by_parent else top_k

        try:
            search_result = self.client.query_points(
                collection_name=QDRANT_COLLECTION,
                query=query_vector,
                limit=limit,
            ).points
        except Exception as e:
            print(f"[VectorStore.search] query_points() failed ({e}); returning no results.")
            return []
        
        results = []
        seen_parents = set()
        
        for hit in search_result:
            parent_id = hit.payload["parent_doc_id"]
            if dedupe_by_parent:
                if parent_id in seen_parents:
                    continue
                seen_parents.add(parent_id)
                
            results.append({
                "doc_id": parent_id,
                "chunk_id": hit.payload["chunk_id"],
                "score": float(hit.score),
                "text": hit.payload["text"],
                "metadata": hit.payload["metadata"],
            })
            
            if len(results) >= top_k:
                break
                
        return results

    def get_full_text(self, parent_doc_id: str) -> str:
        """Retrieve the full text of a document.

        Uses the stored original text (O(1) lookup) instead of reassembling
        from overlapping chunks, which would duplicate text at boundaries.
        """
        # Fast path: use stored original text
        if parent_doc_id in self._parent_full_text:
            return self._parent_full_text[parent_doc_id]

        # Fallback: reassemble from chunks (for backward compatibility)
        chunks = []
        for doc_id, text, parent_id in zip(self.doc_ids, self.texts, self.parent_doc_ids):
            if parent_id == parent_doc_id:
                chunks.append((doc_id, text))

        if not chunks:
            return ""

        if len(chunks) == 1:
            return chunks[0][1]

        chunks.sort(key=lambda c: c[0])
        return " ".join(text for _, text in chunks)

    def get_metadata(self, parent_doc_id: str) -> dict:
        """Retrieve metadata for a parent document in O(1)."""
        return self._parent_metadata.get(parent_doc_id, {})
