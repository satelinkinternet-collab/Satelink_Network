#!/usr/bin/env python3
"""Generate Satelink Backend Production Readiness Audit Report PDF"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime

# ── Styles ──
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', fontSize=28, leading=34, alignment=TA_CENTER,
                          textColor=HexColor('#1a1a2e'), spaceAfter=12, fontName='Helvetica-Bold'))
styles.add(ParagraphStyle(name='CoverSub', fontSize=14, leading=18, alignment=TA_CENTER,
                          textColor=HexColor('#555'), spaceAfter=6))
styles.add(ParagraphStyle(name='SectionHead', fontSize=18, leading=22, spaceAfter=10, spaceBefore=20,
                          textColor=HexColor('#1a1a2e'), fontName='Helvetica-Bold'))
styles.add(ParagraphStyle(name='SubHead', fontSize=13, leading=16, spaceAfter=6, spaceBefore=12,
                          textColor=HexColor('#333'), fontName='Helvetica-Bold'))
styles.add(ParagraphStyle(name='BodyText2', fontSize=10, leading=14, spaceAfter=6,
                          textColor=HexColor('#222')))
styles.add(ParagraphStyle(name='CodeBlock', fontSize=8.5, leading=11, spaceAfter=6,
                          fontName='Courier', backColor=HexColor('#f5f5f5'),
                          leftIndent=12, rightIndent=12))
styles.add(ParagraphStyle(name='BulletItem', fontSize=10, leading=14, spaceAfter=3,
                          leftIndent=20, bulletIndent=10))

def hr():
    return HRFlowable(width="100%", thickness=1, color=HexColor('#ddd'), spaceBefore=8, spaceAfter=8)

def build_report():
    doc = SimpleDocTemplate(
        "/Users/pradeepjakuraa/satelink-mvp/backend_audit_report.pdf",
        pagesize=letter,
        rightMargin=60, leftMargin=60, topMargin=60, bottomMargin=60
    )
    story = []
    W = letter[0] - 120  # usable width

    # ═══════════════════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════════════════
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("SATELINK", styles['CoverTitle']))
    story.append(Paragraph("Backend Production Readiness Audit", styles['CoverTitle']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", styles['CoverSub']))
    story.append(Paragraph("Classification: INTERNAL / ENGINEERING", styles['CoverSub']))
    story.append(Paragraph("Scope: Infrastructure, Database, Revenue Engine, Security, API", styles['CoverSub']))
    story.append(Spacer(1, 1*inch))

    score_data = [
        ['Production Readiness Score', '52 / 100'],
        ['Critical Blockers', '4'],
        ['High Risk Issues', '6'],
        ['Medium Issues', '7'],
        ['Low Issues', '3'],
    ]
    score_table = Table(score_data, colWidths=[W*0.6, W*0.4])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 11),
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#ccc')),
        ('BACKGROUND', (0,1), (-1,1), HexColor('#ff4444')),
        ('TEXTCOLOR', (0,1), (-1,1), white),
        ('BACKGROUND', (0,2), (-1,2), HexColor('#ff8800')),
        ('BACKGROUND', (0,3), (-1,3), HexColor('#ffcc00')),
        ('BACKGROUND', (0,4), (-1,4), HexColor('#88cc00')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#f9f9f9'), white]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(score_table)
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 1. SYSTEM OVERVIEW
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("1. System Overview", styles['SectionHead']))
    story.append(hr())
    overview = """
    Satelink is a DePIN (Decentralized Physical Infrastructure Network) platform providing
    decentralized RPC, AI, scraping, automation, and bandwidth workloads. The backend is a
    Node.js/Express API server backed by PostgreSQL and Redis, with a Next.js 16 dashboard frontend.
    Settlement is planned on Fuse Network using USDT with a 50/30/20 revenue split
    (Nodes / Platform / Distribution).
    """
    story.append(Paragraph(overview.strip(), styles['BodyText2']))

    arch_data = [
        ['Component', 'Technology', 'Status'],
        ['Backend API', 'Node.js 20 / Express', 'Running (Docker)'],
        ['Database', 'PostgreSQL 15', 'Running (Docker)'],
        ['Cache / Queue', 'Redis 7', 'Running (Docker)'],
        ['Frontend', 'Next.js 16 (Turbopack)', 'Running (Docker)'],
        ['Worker', 'Node.js (job consumer)', 'Running (Docker)'],
        ['Settlement', 'Fuse EVM (SIMULATED)', 'Not Active'],
        ['Auth', 'JWT (HS256, 24h TTL)', 'Working'],
    ]
    t = Table(arch_data, colWidths=[W*0.3, W*0.35, W*0.35])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#ccc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f5f5f5')]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(Spacer(1, 8))
    story.append(t)

    # ═══════════════════════════════════════════════════════
    # 2. CURRENT FAILURE ANALYSIS
    # ═══════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("2. Current Failure Analysis", styles['SectionHead']))
    story.append(hr())

    story.append(Paragraph("Observed Symptoms", styles['SubHead']))
    symptoms = [
        "ECONNREFUSED 127.0.0.1:5432 when running API locally via npm run dev",
        "FINAL_DB_URL shows postgres://&lt;credentials&gt;@... (masked, not a bug)",
        "PostgreSQL container running in Docker but API cannot connect",
        "Credential mismatch: .env uses postgres:postgres, Docker uses satelink:satelinkpass",
    ]
    for s in symptoms:
        story.append(Paragraph(f"\u2022 {s}", styles['BulletItem']))

    # ═══════════════════════════════════════════════════════
    # 3. ROOT CAUSE BREAKDOWN
    # ═══════════════════════════════════════════════════════
    story.append(Spacer(1, 12))
    story.append(Paragraph("3. Root Cause Breakdown", styles['SectionHead']))
    story.append(hr())

    rc_data = [
        ['#', 'Root Cause', 'Severity', 'Status'],
        ['RC-1', 'Credential mismatch: .env has postgres:postgres\nbut Docker uses satelink:satelinkpass', 'BLOCKER', 'FIXED'],
        ['RC-2', 'app_factory.mjs re-imports dotenv/config,\nclobbering .env.local overrides', 'HIGH', 'FIXED'],
        ['RC-3', '.env.local uses localhost (resolves to ::1 IPv6)\ninstead of 127.0.0.1 (IPv4)', 'MEDIUM', 'FIXED'],
        ['RC-4', 'No centralized DB config resolver;\nDocker vs local mode not auto-detected', 'MEDIUM', 'FIXED'],
        ['RC-5', 'Boot failure message is cryptic;\nno troubleshooting guidance', 'LOW', 'FIXED'],
    ]
    t = Table(rc_data, colWidths=[W*0.06, W*0.50, W*0.18, W*0.12])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8.5),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#ccc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f5f5f5')]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TEXTCOLOR', (3,1), (3,1), HexColor('#ff4444')),
        ('FONTNAME', (2,1), (2,-1), 'Helvetica-Bold'),
    ]))
    story.append(t)

    # ═══════════════════════════════════════════════════════
    # 4. INFRASTRUCTURE AUDIT
    # ═══════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("4. Infrastructure Audit", styles['SectionHead']))
    story.append(hr())

    infra_items = [
        ("Docker Compose", "PASS", "5 services (core, dashboard, worker, database, redis) with health checks and dependency ordering."),
        ("Port Mappings", "PASS", "8080:8080 (API), 3000:3000 (dashboard), 5432:5432 (PG), 6379:6379 (Redis)."),
        ("Health Checks", "PASS", "PG: pg_isready, Redis: redis-cli ping, API: wget /health."),
        ("Env Consistency", "FIXED", "Credentials now synchronized. .env = Docker defaults, .env.local = local dev overrides."),
        ("Graceful Shutdown", "PASS", "SIGTERM/SIGINT handlers with 10s drain timeout."),
    ]
    for name, status, desc in infra_items:
        color = '#22aa44' if status == 'PASS' else '#ff8800'
        story.append(Paragraph(f"<b>{name}</b> [<font color='{color}'>{status}</font>]: {desc}", styles['BodyText2']))

    # ═══════════════════════════════════════════════════════
    # 5. DATABASE AUDIT
    # ═══════════════════════════════════════════════════════
    story.append(Spacer(1, 12))
    story.append(Paragraph("5. Database Audit", styles['SectionHead']))
    story.append(hr())

    story.append(Paragraph("Schema Completeness: 13/13 required tables present", styles['SubHead']))

    db_issues = [
        ['ID', 'Issue', 'Severity'],
        ['DB-1', 'node_registry table only created in service init(), not in SQL migrations', 'CRITICAL'],
        ['DB-2', 'payout_queue defined twice with incompatible schemas', 'HIGH'],
        ['DB-3', 'epochs defined 3 times with incompatible columns; bare ALTER TABLE crashes', 'HIGH'],
        ['DB-4', 'Bare ALTER TABLE ADD COLUMN without IF NOT EXISTS in 5 SQL files', 'HIGH'],
        ['DB-5', 'SQLite-only rowid in 005_fix_dupes.sql will fail on PostgreSQL', 'MEDIUM'],
        ['DB-6', '38 INSERT OR IGNORE in SQL files bypass _convertSql() via db.exec()', 'MEDIUM'],
        ['DB-7', 'PRAGMA statements in 4 SQL files invalid for PostgreSQL', 'MEDIUM'],
        ['DB-8', 'Concurrent transactions on shared PgDatabase corrupt _txClient ref', 'MEDIUM'],
    ]
    t = Table(db_issues, colWidths=[W*0.08, W*0.70, W*0.22])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8.5),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#ccc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f5f5f5')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t)

    story.append(Paragraph("Connection Pool: max=20, idle=30s, connect=5s. Reasonable for current scale.", styles['BodyText2']))
    story.append(Paragraph("Transaction Safety: Correct BEGIN/COMMIT/ROLLBACK with client isolation. "
                           "Medium risk: _txClient is instance-level, not per-call scoped.", styles['BodyText2']))

    # ═══════════════════════════════════════════════════════
    # 6. REVENUE ENGINE AUDIT
    # ═══════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("6. Revenue Engine Audit", styles['SectionHead']))
    story.append(hr())

    story.append(Paragraph("Pipeline Flow", styles['SubHead']))
    pipeline = """
    executeOp() -> revenue_events_v2 (with idempotency key) -> epoch_scheduler (60s interval)
    -> closeEpoch(): 50% node pool / 30% platform / 20% distribution -> epoch_earnings
    -> claim() [wallet signature verified] -> withdrawals [PENDING/SIMULATED]
    -> payout_queue -> settlement adapter (EVM/shadow/simulated)
    """
    story.append(Paragraph(pipeline.strip(), styles['CodeBlock']))

    rev_items = [
        ("Idempotency", "PASS", "Duplicate check via client_id + op_type + request_id before insert."),
        ("Rate Limiting", "PASS", "Per-client and per-node rate limits enforced in executeOp()."),
        ("50/30/20 Split", "PASS", "Hardcoded in epoch_scheduler.js; proportional node distribution by contribution weight."),
        ("Dynamic Pricing", "PASS", "Surge multiplier from pricing_rules table when load exceeds threshold."),
        ("Accounting Integrity", "PASS", "Atomic transactions for epoch finalization; epoch_earnings + balances in single tx."),
        ("Claim Security", "PASS", "ECDSA wallet signature verification via ethers.verifyMessage()."),
        ("Epoch Scheduler", "PASS", "60s interval with mutex flag; idempotency check prevents double-finalization."),
    ]
    for name, status, desc in rev_items:
        story.append(Paragraph(f"<b>{name}</b> [<font color='#22aa44'>{status}</font>]: {desc}", styles['BodyText2']))

    # ═══════════════════════════════════════════════════════
    # 7. SECURITY AUDIT
    # ═══════════════════════════════════════════════════════
    story.append(Spacer(1, 12))
    story.append(Paragraph("7. Security Audit", styles['SectionHead']))
    story.append(hr())

    sec_data = [
        ['ID', 'Issue', 'Severity', 'Status'],
        ['B-1', '/dev/token endpoint unguarded in production, hardcoded fallback secret', 'BLOCKER', 'FIXED'],
        ['B-2', '/debug/* routes (db-check, pipeline-status, run-epoch) unguarded', 'BLOCKER', 'FIXED'],
        ['B-3', '/dev/seed-job unguarded - can inject fake jobs', 'BLOCKER', 'FIXED'],
        ['B-4', 'Synthetic activity active unless opt-out flag set', 'BLOCKER', 'FIXED'],
        ['H-1', 'Dev login POST /auth/login guarded by opt-out, not NODE_ENV', 'HIGH', 'OPEN'],
        ['H-2', 'admin_control_room missing internal requireJWT', 'HIGH', 'FIXED'],
        ['H-3', '/api/demand metrics unauthenticated with wildcard CORS', 'HIGH', 'OPEN'],
        ['H-4', 'Password hashing falls back to JWT_SECRET or hardcoded salt', 'HIGH', 'OPEN'],
        ['H-5', '/v1/jobs and /v1/node/register accept unauthenticated requests', 'HIGH', 'OPEN'],
        ['H-6', '/v1/control routes (test, load) unprotected', 'HIGH', 'OPEN'],
        ['M-1', 'CORS fail-open when CORS_ORIGINS env var empty', 'MEDIUM', 'OPEN'],
        ['M-2', 'IP hash salt has hardcoded fallback in 3 files', 'MEDIUM', 'OPEN'],
        ['M-3', 'requireJWT called next() when req/res undefined', 'MEDIUM', 'FIXED'],
        ['M-4', 'Debug telemetry POSTs to localhost:7363 in production code', 'MEDIUM', 'OPEN'],
    ]
    t = Table(sec_data, colWidths=[W*0.07, W*0.53, W*0.15, W*0.10])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#ccc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f5f5f5')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t)

    # ═══════════════════════════════════════════════════════
    # 8. RISK ASSESSMENT
    # ═══════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("8. Risk Assessment", styles['SectionHead']))
    story.append(hr())

    risk_data = [
        ['Category', 'Risk Level', 'Notes'],
        ['DB Connection', 'LOW (was BLOCKER)', 'Fixed: single source of truth, IPv4, retry logic'],
        ['Auth Bypass', 'LOW (was BLOCKER)', 'Fixed: /dev/token, /debug/* guarded; requireJWT fail-closed'],
        ['Revenue Integrity', 'LOW', 'Pipeline has idempotency, atomic tx, signature verification'],
        ['Data Exposure', 'MEDIUM', '/api/demand, /system/status, /metrics still unauthenticated'],
        ['Dev Route Leakage', 'MEDIUM', '/auth/login dev path needs NODE_ENV guard'],
        ['Schema Migrations', 'HIGH', 'SQLite remnants, bare ALTER TABLE, duplicate table definitions'],
        ['Concurrent Tx Safety', 'MEDIUM', '_txClient race condition under heavy concurrent load'],
    ]
    t = Table(risk_data, colWidths=[W*0.25, W*0.25, W*0.50])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#ccc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f5f5f5')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)

    # ═══════════════════════════════════════════════════════
    # 9. FIX PLAN
    # ═══════════════════════════════════════════════════════
    story.append(Spacer(1, 12))
    story.append(Paragraph("9. Fix Plan (Applied)", styles['SectionHead']))
    story.append(hr())

    fixes = [
        ("db_config.js (NEW)", "Centralized DB URL resolver supporting Docker vs local dev mode. IPv4 enforcement. No hardcoded URLs."),
        (".env + .env.local", "Credentials synchronized with docker-compose.yml (satelink:satelinkpass). IPv4 explicit (127.0.0.1)."),
        ("app_factory.mjs", "Removed duplicate dotenv/config import that clobbered .env.local overrides."),
        ("pg_adapter.js", "Integrated db_config.js resolver. Improved retry logging (attempt N/M). Clear failure diagnostics."),
        ("server.js", "Uses RESOLVED_DB_URL. Logs boot mode (Docker/Local). Structured failure message with troubleshooting steps."),
        ("routes.js", "Guarded /dev/token (NODE_ENV != production). Guarded /debug/* (requireAdmin). Guarded /dev/seed-job. Synthetic activity gated on NODE_ENV."),
        ("auth_middleware.js", "requireJWT now throws on undefined req/res instead of calling next() (fail-closed)."),
        ("admin_control_room_api.js", "Added internal requireJWT guard (defense-in-depth, not relying on mount-level only)."),
    ]
    for fname, desc in fixes:
        story.append(Paragraph(f"<b>{fname}</b>", styles['SubHead']))
        story.append(Paragraph(desc, styles['BodyText2']))

    # ═══════════════════════════════════════════════════════
    # 10. PRODUCTION READINESS SCORE
    # ═══════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("10. Production Readiness Score", styles['SectionHead']))
    story.append(hr())

    score_detail = [
        ['Category', 'Weight', 'Score', 'Max', 'Notes'],
        ['Infrastructure', '15%', '14', '15', 'Docker healthy, ports correct, health checks present'],
        ['DB Connection', '15%', '15', '15', 'FIXED: retry, IPv4, single source of truth'],
        ['Schema Quality', '10%', '4', '10', 'SQLite remnants, bare ALTERs, duplicate schemas'],
        ['Revenue Engine', '15%', '14', '15', 'Idempotent, atomic, proportional split correct'],
        ['Auth / Security', '20%', '12', '20', '4 blockers FIXED; 6 HIGH items remain open'],
        ['API Correctness', '10%', '8', '10', 'Endpoint mismatches FIXED; stub endpoints added'],
        ['Monitoring', '5%', '4', '5', 'Health endpoints, Prometheus metrics, self-test on boot'],
        ['Error Handling', '5%', '4', '5', 'Global error handler, graceful shutdown, retry logic'],
        ['Documentation', '5%', '2', '5', 'Inline comments present; no runbook or API docs'],
        ['', '', '', '', ''],
        ['TOTAL', '100%', '77', '100', 'Post-fix score (was ~52 before this audit)'],
    ]
    t = Table(score_detail, colWidths=[W*0.22, W*0.10, W*0.08, W*0.08, W*0.52])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#ccc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f5f5f5')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('BACKGROUND', (0,-1), (-1,-1), HexColor('#e8f5e9')),
    ]))
    story.append(t)

    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>Verdict:</b> System is ready for <b>staging revenue testing</b> after applying the fixes in this audit. "
                           "The 6 remaining HIGH security items should be resolved before any production deployment with real user funds.",
                           styles['BodyText2']))

    story.append(Spacer(1, 30))
    story.append(Paragraph("Remaining Items for Production", styles['SubHead']))
    remaining = [
        "Guard /auth/login dev endpoint with NODE_ENV check",
        "Add authentication to /api/demand, /system/status, /metrics endpoints",
        "Remove debug telemetry POSTs (localhost:7363) from production code",
        "Consolidate duplicate payout_queue and epochs table definitions",
        "Add IF NOT EXISTS to all ALTER TABLE statements in SQL migrations",
        "Remove SQLite-only syntax from migration files (rowid, PRAGMA, AUTOINCREMENT)",
        "Require PASSWORD_SALT and IP_HASH_SALT as mandatory env vars",
    ]
    for item in remaining:
        story.append(Paragraph(f"\u2022 {item}", styles['BulletItem']))

    # Build
    doc.build(story)
    print("PDF generated: backend_audit_report.pdf")

if __name__ == '__main__':
    build_report()
