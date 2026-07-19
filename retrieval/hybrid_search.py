"""Hybrid retrieval: combine graph-based entity lookup with vector similarity
search, merge and rank results.

3-stage GraphRAG strategy:
1. Detect entities in the query → graph lookup (precise hits)
2. Vector similarity search over the full corpus (semantic hits)
3. Extract entities from top vector hits → second graph traversal
   (catches queries like "tell me about the corrosion issue" where no
   equipment tag is mentioned but the relevant chunks contain tags)
4. Merge all three result sets, dedupe by doc_id, rank by source quality
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.entity_extraction import extract_entities


def hybrid_search(query: str, kg, vs, top_k: int = 8, graph_hops: int = 1) -> list:
    query_entities = extract_entities(query)
    all_query_entities = (
        query_entities["equipment"] + query_entities["personnel"] + query_entities["document_refs"]
    )

    # --- Stage 1: Graph lookup from query entities ---
    graph_doc_ids = set()
    for entity in all_query_entities:
        # Documents that directly mention the entity
        graph_doc_ids.update(kg.documents_mentioning(entity))
        # Documents reachable via the entity's graph neighbourhood (catches
        # cross-referenced docs even if they don't mention the entity by name)
        graph_doc_ids.update(kg.documents_near(entity, hops=graph_hops))

    # --- Stage 2: Vector similarity search ---
    vector_hits = vs.search(query, top_k=top_k, dedupe_by_parent=True)

    # --- Stage 3: Extract entities from top vector hits → second graph traversal ---
    stage3_doc_ids = set()
    for hit in vector_hits[:5]:  # top 5 vector hits for entity extraction
        chunk_entities = extract_entities(hit["text"])
        chunk_entity_ids = (
            chunk_entities["equipment"] + chunk_entities["personnel"] + chunk_entities["document_refs"]
        )
        for entity in chunk_entity_ids:
            # Only traverse for entities NOT already in the query
            # (avoids redundant work with stage 1)
            if entity not in all_query_entities:
                stage3_doc_ids.update(kg.documents_mentioning(entity))
                stage3_doc_ids.update(kg.documents_near(entity, hops=graph_hops))

    # Remove docs already found by stages 1 and 2 to track provenance
    stage3_doc_ids -= graph_doc_ids

    # --- Stage 4: Merge all results ---
    merged = {}

    # Stage 1 hits: graph-from-query (highest confidence)
    for doc_id in graph_doc_ids:
        text = vs.get_full_text(doc_id)
        meta = vs.get_metadata(doc_id)
        merged[doc_id] = {
            "doc_id": doc_id,
            "text": text,
            "metadata": meta,
            "source": "graph",
            "score": 1.0,  # graph hits are exact-match, ranked highest
        }

    # Stage 2 hits: vector search
    for hit in vector_hits:
        doc_id = hit["doc_id"]
        if doc_id in merged:
            merged[doc_id]["source"] = "graph+vector"
        else:
            merged[doc_id] = {
                "doc_id": doc_id,
                "text": hit["text"],
                "metadata": hit["metadata"],
                "source": "vector",
                "score": hit["score"],
            }

    # Stage 3 hits: graph-from-chunks (medium confidence, discovered entities)
    for doc_id in stage3_doc_ids:
        if doc_id in merged:
            # Already found by another stage, boost it
            if merged[doc_id]["source"] == "vector":
                merged[doc_id]["source"] = "graph_discovered+vector"
        else:
            text = vs.get_full_text(doc_id)
            meta = vs.get_metadata(doc_id)
            merged[doc_id] = {
                "doc_id": doc_id,
                "text": text,
                "metadata": meta,
                "source": "graph_discovered",
                "score": 0.8,  # discovered via chunk entities, slightly lower than direct graph
            }

    # Rank: graph+vector > graph > graph_discovered+vector > graph_discovered > vector
    source_priority = {
        "graph+vector": 0,
        "graph": 1,
        "graph_discovered+vector": 2,
        "graph_discovered": 3,
        "vector": 4,
    }

    ranked = sorted(
        merged.values(),
        key=lambda r: (source_priority.get(r["source"], 5), -r["score"]),
    )

    return ranked[:top_k], query_entities