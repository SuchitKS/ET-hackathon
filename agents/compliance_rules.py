"""Regulatory compliance requirements for Suryanagar Refinery.

These requirements are derived from the regulations referenced in the
corpus documents: OISD-105, PESO Explosives Rules, and the Factories Act.
Each requirement is checked against the ingested corpus to determine
coverage status (covered / partial / not_covered).
"""

REGULATORY_REQUIREMENTS = [
    # OISD-105: Standard on Taxing & De-taxing of Pressure Vessels
    {
        "regulation": "OISD-105",
        "clause": "6.3",
        "requirement": "Corrosion monitoring records for pressure vessels maintained and reviewed periodically",
        "category": "inspection",
    },
    {
        "regulation": "OISD-105",
        "clause": "6.5",
        "requirement": "Thickness measurement surveys conducted per schedule with documented results",
        "category": "inspection",
    },
    {
        "regulation": "OISD-105",
        "clause": "7.1",
        "requirement": "Hot work permits issued with documented safety precautions before any welding or cutting on process equipment",
        "category": "permits",
    },
    {
        "regulation": "OISD-105",
        "clause": "8.2",
        "requirement": "All pressure vessel repairs documented with work orders including scope, materials, and testing records",
        "category": "maintenance",
    },
    {
        "regulation": "OISD-105",
        "clause": "9.1",
        "requirement": "Near-miss incidents involving pressure vessels investigated and documented",
        "category": "incidents",
    },

    # PESO — Petroleum and Explosives Safety Organisation
    {
        "regulation": "PESO",
        "clause": "12.1",
        "requirement": "Valid explosives handling license with current renewal documentation",
        "category": "licensing",
    },
    {
        "regulation": "PESO",
        "clause": "15.3",
        "requirement": "Quarterly safety inspection records maintained for explosive storage areas",
        "category": "inspection",
    },
    {
        "regulation": "PESO",
        "clause": "18.2",
        "requirement": "Emergency response procedures documented and drills conducted periodically",
        "category": "safety",
    },

    # Factories Act 1948
    {
        "regulation": "Factory Act",
        "clause": "40-A",
        "requirement": "Quarterly safety checklist completed and filed for all operational units",
        "category": "compliance",
    },
    {
        "regulation": "Factory Act",
        "clause": "41-B",
        "requirement": "PPE requirements documented in SOPs and enforced for all maintenance activities",
        "category": "safety",
    },
    {
        "regulation": "Factory Act",
        "clause": "41-C",
        "requirement": "Confined space entry procedures documented with permit-to-work system",
        "category": "permits",
    },
    {
        "regulation": "Factory Act",
        "clause": "88-A",
        "requirement": "All workplace incidents reported, investigated, and corrective actions documented",
        "category": "incidents",
    },
]
