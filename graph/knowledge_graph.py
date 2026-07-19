import os
# pyrefly: ignore [missing-import]
from neo4j import GraphDatabase


class KnowledgeGraph:
    def __init__(self):
        uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        user = os.environ.get("NEO4J_USER", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD", "password")
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def add_document(self, doc_id: str, doc_type: str, filename: str, official_id: str | None):
        query = """
        MERGE (d:Document {id: $doc_id})
        SET d.kind = 'document',
            d.doc_type = $doc_type,
            d.filename = $filename,
            d.official_id = $official_id
        """
        with self.driver.session() as session:
            session.run(query, doc_id=doc_id, doc_type=doc_type, filename=filename, official_id=official_id)

    def add_equipment(self, tag: str):
        query = """
        MERGE (e:Equipment {id: $tag})
        SET e.kind = 'equipment'
        """
        with self.driver.session() as session:
            session.run(query, tag=tag)

    def add_person(self, name: str):
        query = """
        MERGE (p:Person {id: $name})
        SET p.kind = 'person'
        """
        with self.driver.session() as session:
            session.run(query, name=name)

    def link_mentions(self, doc_id: str, entity_id: str, relation: str = "mentions"):
        query = f"""
        MATCH (d:Document {{id: $doc_id}})
        MATCH (e {{id: $entity_id}})
        MERGE (d)-[r:`{relation}`]->(e)
        """
        with self.driver.session() as session:
            session.run(query, doc_id=doc_id, entity_id=entity_id)

    def link_documents(self, doc_id: str, other_doc_id: str, relation: str = "references"):
        query = f"""
        MATCH (d1:Document {{id: $doc_id}})
        MATCH (d2:Document {{id: $other_doc_id}})
        MERGE (d1)-[r:`{relation}`]->(d2)
        """
        with self.driver.session() as session:
            session.run(query, doc_id=doc_id, other_doc_id=other_doc_id)

    def neighbors_of(self, entity_id: str, hops: int = 1) -> set:
        query = f"""
        MATCH (n {{id: $entity_id}})-[*1..{hops}]-(m)
        RETURN DISTINCT m.id AS neighbor_id
        """
        with self.driver.session() as session:
            result = session.run(query, entity_id=entity_id)
            return {record["neighbor_id"] for record in result}

    def documents_near(self, entity_id: str, hops: int = 1) -> set:
        """Document nodes reachable from entity_id within `hops` hops.

        Used by hybrid_search's graph-traversal stages to catch documents
        that are connected to an entity in the graph without mentioning it
        directly. Filters by the Document label in Cypher itself, rather
        than fetching all neighbors and inspecting them client-side —
        there's no in-memory graph object to inspect since this class is
        Neo4j-backed end to end.
        """
        query = f"""
        MATCH (n {{id: $entity_id}})-[*1..{hops}]-(m:Document)
        RETURN DISTINCT m.id AS doc_id
        """
        with self.driver.session() as session:
            result = session.run(query, entity_id=entity_id)
            return {record["doc_id"] for record in result}

    def documents_mentioning(self, entity_id: str) -> list:
        query = """
        MATCH (d:Document)-[]->(e {id: $entity_id})
        RETURN DISTINCT d.id AS doc_id
        ORDER BY d.id
        """
        with self.driver.session() as session:
            result = session.run(query, entity_id=entity_id)
            return [record["doc_id"] for record in result]

    def add_failure_event(self, equipment_tag: str, doc_id: str,
                          failure_mode: str | None = None,
                          severity: str | None = None,
                          root_cause_category: str | None = None,
                          action_taken: str | None = None,
                          recommended_action: str | None = None,
                          labour_hours: float | None = None,
                          downtime_hours: float | None = None,
                          cost_estimate: float | None = None,
                          risk_level: str | None = None,
                          date: str | None = None):
        event_id = f"FAIL_{equipment_tag}_{doc_id}"
        query = """
        MATCH (eq:Equipment {id: $equipment_tag})
        MATCH (doc:Document {id: $doc_id})
        MERGE (f:FailureEvent {id: $event_id})
        SET f.kind = 'failure_event',
            f.failure_mode = $failure_mode,
            f.severity = $severity,
            f.root_cause_category = $root_cause_category,
            f.action_taken = $action_taken,
            f.recommended_action = $recommended_action,
            f.labour_hours = $labour_hours,
            f.downtime_hours = $downtime_hours,
            f.cost_estimate = $cost_estimate,
            f.risk_level = $risk_level,
            f.date = $date
        MERGE (eq)-[:HAS_FAILURE]->(f)
        MERGE (f)-[:DOCUMENTED_IN]->(doc)
        """
        with self.driver.session() as session:
            session.run(query, equipment_tag=equipment_tag, doc_id=doc_id, event_id=event_id,
                        failure_mode=failure_mode, severity=severity, root_cause_category=root_cause_category,
                        action_taken=action_taken, recommended_action=recommended_action,
                        labour_hours=labour_hours, downtime_hours=downtime_hours,
                        cost_estimate=cost_estimate, risk_level=risk_level, date=date)

    def get_failure_history(self, equipment_tag: str) -> list:
        query = """
        MATCH (eq:Equipment {id: $equipment_tag})-[:HAS_FAILURE]->(f:FailureEvent)-[:DOCUMENTED_IN]->(doc:Document)
        RETURN f, doc.id AS source_doc
        """
        with self.driver.session() as session:
            result = session.run(query, equipment_tag=equipment_tag)
            events = []
            for record in result:
                f_node = dict(record["f"])
                events.append({
                    "event_id": f_node.get("id"),
                    "source_doc": record["source_doc"],
                    "failure_mode": f_node.get("failure_mode"),
                    "severity": f_node.get("severity"),
                    "root_cause_category": f_node.get("root_cause_category"),
                    "action_taken": f_node.get("action_taken"),
                    "recommended_action": f_node.get("recommended_action"),
                    "labour_hours": f_node.get("labour_hours"),
                    "downtime_hours": f_node.get("downtime_hours"),
                    "cost_estimate": f_node.get("cost_estimate"),
                    "risk_level": f_node.get("risk_level"),
                    "date": f_node.get("date"),
                })
            
            events.sort(key=lambda e: e.get("date") or "9999-99-99")
            return events

    def summary(self) -> dict:
        nodes_query = "MATCH (n) RETURN n.kind AS kind, count(n) AS c"
        edges_query = "MATCH ()-[r]->() RETURN count(r) AS c"
        
        with self.driver.session() as session:
            nodes_res = session.run(nodes_query)
            kinds = {}
            total_nodes = 0
            for record in nodes_res:
                kind = record["kind"] or "unknown"
                count = record["c"]
                kinds[kind] = count
                total_nodes += count
                
            edges_res = session.run(edges_query)
            # handle case where graph is completely empty
            edge_record = edges_res.single()
            total_edges = edge_record["c"] if edge_record else 0
            
        return {
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "node_counts_by_kind": kinds,
        }

    def to_graph_data(self) -> dict:
        nodes_query = "MATCH (n) RETURN n"
        # use elementId for neo4j >= 5.x
        edges_query = "MATCH ()-[r]->() RETURN startNode(r).id AS source, endNode(r).id AS target, type(r) AS relation, elementId(r) AS id"
        
        frontend_nodes = []
        edges_list = []
        
        with self.driver.session() as session:
            nodes_res = session.run(nodes_query)
            for record in nodes_res:
                data = dict(record["n"])
                node_id = data.get("id")
                if not node_id:
                    continue
                
                kind = data.get("kind", "unknown")
                doc_type = data.get("doc_type", "")
                
                node_type = "document"
                if kind == "equipment":
                    node_type = "equipment"
                elif kind == "person":
                    node_type = "person"
                elif kind == "failure_event":
                    node_type = "failure"
                elif kind == "document":
                    if doc_type == "sop_permit":
                        node_type = "procedure"
                    else:
                        node_type = "document"
                        
                label = node_id
                sublabel = ""
                
                if kind == "document":
                    label = data.get("filename", node_id)
                    sublabel = doc_type
                elif kind == "equipment":
                    sublabel = "Equipment"
                elif kind == "person":
                    sublabel = "Personnel"
                elif kind == "failure_event":
                    label = data.get("failure_mode") or "Failure Event"
                    sublabel = data.get("date") or ""
                    
                frontend_nodes.append({
                    "id": node_id,
                    "type": node_type,
                    "label": label,
                    "sublabel": sublabel,
                    "detail": data
                })
                
            edges_res = session.run(edges_query)
            for record in edges_res:
                edges_list.append({
                    "id": str(record["id"]),
                    "source": record["source"],
                    "target": record["target"],
                    "relation": record["relation"]
                })
                
        return {"nodes": frontend_nodes, "edges": edges_list}

    def get_all_documents(self) -> list:
        query = "MATCH (d:Document) RETURN d"
        docs = []
        with self.driver.session() as session:
            result = session.run(query)
            for record in result:
                data = dict(record["d"])
                docs.append({
                    "id": data.get("id"),
                    **data
                })
        return docs

    def get_dashboard_metrics(self) -> dict:
        """Run real-time analytics queries against the Neo4j graph for the dashboard."""
        metrics = {
            "equipment_at_risk": 0,
            "avg_downtime": 0,
            "dangling_refs": 0,
            "most_impacted_equipment": {"tag": "None", "downtime": 0},
            "compliance_score": 85 # Mocked for demo if we don't have a structured checklist node
        }
        
        with self.driver.session() as session:
            # Equipment with >1 failure event
            res1 = session.run("MATCH (e:Equipment)-[:HAS_FAILURE]->(f:FailureEvent) WITH e, count(f) AS failures WHERE failures > 1 RETURN count(e) AS count")
            if rec := res1.single():
                metrics["equipment_at_risk"] = rec["count"]
                
            # Avg downtime per incident
            res2 = session.run("MATCH (f:FailureEvent) WHERE f.downtime_hours IS NOT NULL RETURN avg(f.downtime_hours) AS avg_dt")
            if rec := res2.single():
                metrics["avg_downtime"] = round(rec["avg_dt"] or 0, 1)
                
            # Open documentation gaps (dangling references)
            res3 = session.run("MATCH (d1:Document)-[:references]->(d2:Document) WHERE d2.kind IS NULL RETURN count(d2) AS gaps")
            # In our schema, dangling references are node creations without properties or just edges.
            # Actually, `link_documents` MERGEs (d2:Document {id: other_doc_id}), so it exists but has no kind if it wasn't ingested.
            res3 = session.run("MATCH (d:Document) WHERE d.kind IS NULL RETURN count(d) AS gaps")
            if rec := res3.single():
                metrics["dangling_refs"] = rec["gaps"]
                
            # Most impacted equipment
            res4 = session.run("""
                MATCH (e:Equipment)-[:HAS_FAILURE]->(f:FailureEvent)
                RETURN e.id AS tag, sum(f.downtime_hours) AS total_downtime
                ORDER BY total_downtime DESC LIMIT 1
            """)
            if rec := res4.single():
                metrics["most_impacted_equipment"] = {"tag": rec["tag"], "downtime": rec["total_downtime"] or 0}
                
        return metrics