# Documentation Traceability Matrix

> **Purpose:** This document maps relationships between SRS requirements, SDD design elements, and implementation documentation.
> If there's any inconsistency, **SRS.md** is the source of truth for requirements, and **SDD.md** is the source of truth for design.

---

## Document Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      SRS.md                                  │
│         (Source of Truth: Requirements & Goals)            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      SDD.md                                  │
│         (Source of Truth: Design & Architecture)            │
└─────────────────────────────────────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐    ┌─────────────────────────────┐
│   business-rules.md     │    │      ARCHITECTURE.md        │
│ (Business Rules Impl)   │    │   (Technical Implementation) │
└─────────────────────────┘    └─────────────────────────────┘
```

---

## Requirement to Design Mapping

### Functional Requirements (SRS Section 3.2)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-FUNC-01: Master Data Karyawan | LOG-001 (Domain Entity Model) | business-rules.md#1, ARCHITECTURE.md#2 |
| REQ-FUNC-02: Leave/Permission Differentiation | STT-001 (State Machine) | business-rules.md#3 |
| REQ-FUNC-03: Check-in/out Recording | ALG-001 (Attendance Derivation), INT-001 (Check-in Flow) | business-rules.md#2 |
| REQ-FUNC-04: Edge Case Handling | Appendix 5.3 | business-rules.md#4, ARCHITECTURE.md#5 |
| REQ-FUNC-05: Report Efficiency | ALG-002 (Report Aggregation), DEC-002 | business-rules.md#5 |

### Quality of Service Requirements (SRS Section 3.3)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-QOS-01: API Security & Data Protection | SEC-001 (Auth & RBAC) | business-rules.md#6, ARCHITECTURE.md#3 |
| REQ-QOS-02: Inter-service Trust | IFC-002 (Internal API), DEC-001 | business-rules.md#2 |
| REQ-QOS-03: Idempotency | Appendix 5.3 | business-rules.md#4, ARCHITECTURE.md#5 |
| REQ-QOS-04: Logging | - | ARCHITECTURE.md (implicit) |
| REQ-QOS-05: DB Indexing | INF-001, Appendix 5.1 | ARCHITECTURE.md#4 |

### Compliance Requirements (SRS Section 3.4)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-COMP-01: Business Rules Documentation | Multiple | business-rules.md (all sections) |
| REQ-COMP-02: Trade-off Documentation | Section 4 (Decisions) | ARCHITECTURE.md#7 |
| REQ-COMP-03: Documentation Completeness | All sections | All docs |

### Installation & Build Requirements (SRS Section 3.5.1 - 3.5.2)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-INST-01: Environment Configuration | CNF-001, Appendix 5.2 | ARCHITECTURE.md (implicit) |
| REQ-INST-02: Database Isolation | DEC-003, INF-001 | business-rules.md#1, ARCHITECTURE.md#2, #9 |
| REQ-BUILD-01: Monorepo Structure | CMP-001, CMP-002 | ARCHITECTURE.md#1 |
| REQ-BUILD-02: Environment-based Config | CNF-001 | ARCHITECTURE.md (implicit) |

### Distribution Requirements (SRS Section 3.5.3)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-DIST-01: API Gateway | DEC-005, DEP-001 | ARCHITECTURE.md#8, docker-compose.yml (nginx service) |
| REQ-DIST-02: Sync REST Communication | DEC-001, IFC-002 | business-rules.md#2 |

### Maintainability Requirements (SRS Section 3.5.4)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-MAINT-01: Layered Architecture | CMP-002, DEC-004 | ARCHITECTURE.md#1 |
| REQ-MAINT-02: ODM Schema Validation | INF-001 | ARCHITECTURE.md#6 |

### Reusability Requirements (SRS Section 3.5.5)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-REUSE-01: Reusable Middleware | SEC-001 | ARCHITECTURE.md#3 |

### Portability Requirements (SRS Section 3.5.6)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-PORT-01: Server-side Timestamp | ALG-001, DEC-006 | business-rules.md#2, ARCHITECTURE.md#5 |

### Change Management Requirements (SRS Section 3.5.9)

| SRS Requirement | SDD Element | Implementation Doc |
|-----------------|-------------|---------------------|
| REQ-CM-01: Irreversible Status Transition | STT-001 | business-rules.md#3 |
| REQ-CM-02: Work Schedule Change Handling | ALG-001 (snapshot) | business-rules.md#2, ARCHITECTURE.md#5 |
| REQ-CM-03: Trade-off Documentation | Section 4 | ARCHITECTURE.md#7 |

---

## Design Element to Implementation Mapping

| SDD Element | Description | Implementation |
|-------------|-------------|----------------|
| CTX-001 | System Context | ARCHITECTURE.md#1 |
| CMP-001 | Service Composition | business-rules.md#1, ARCHITECTURE.md#1, #2 |
| CMP-002 | Layered Architecture | ARCHITECTURE.md#1 |
| LOG-001 | Domain Entity Model | business-rules.md (implicit) |
| INF-001 | Database Schema | ARCHITECTURE.md#2, #9 |
| IFC-001 | External API | business-rules.md (all), ARCHITECTURE.md (implicit) |
| IFC-002 | Internal API | business-rules.md#2 |
| INT-001 | Check-in Flow | business-rules.md#2 |
| INT-002 | Approval Flow | business-rules.md#3 |
| STT-001 | State Machine | business-rules.md#3 |
| ALG-001 | Attendance Derivation | business-rules.md#2 |
| ALG-002 | Report Aggregation | business-rules.md#5 |
| SEC-001 | Auth & RBAC | business-rules.md#6, ARCHITECTURE.md#3 |
| CNF-001 | Configuration Design | ARCHITECTURE.md (implicit) |
| DEC-001 to DEC-006 | Architectural Decisions | ARCHITECTURE.md#7 |
| DEP-001 | Deployment Topology | ARCHITECTURE.md#8 |

---

## Key References

- **SRS.md**: Source of truth for requirements and acceptance criteria
- **SDD.md**: Source of truth for design decisions and technical architecture
- **business-rules.md**: Business logic implementation derived from SDD
- **ARCHITECTURE.md**: Technical implementation details derived from SDD

---

## Update History

| Date | Changes | Version |
|------|---------|---------|
| 2026-04-05 | Initial creation with traceability matrix | 1.0 |