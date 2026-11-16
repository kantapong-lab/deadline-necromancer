# Checkpoint: change-chat-quick-replies
Updated: step 7 · round 1

## Goal
ปรับแก้หน้า player ในส่วนของ chat

* เวลากด enter  ข้อความที่พิมพ์ไปต้องหาย
* เพิ่มปุ่มกดส่ง
* แสดงข้อความ static ที่ใช้กดส่งได้เลย (ลอง research ดูว่าข้อความแบบไหนเหมาะกับเกมแนวนี้)

Scope answer (user, pause:scope): หน้าตาและกฎ — ข้อความสำเร็จรูป นับเป็น 1 ข้อความ; ถ้าโดน NDA silence จะกดเลือกไม่ได้; ถ้าโดน event meeting purge จะเลือกได้เฉพาะข้อความที่ไม่เกิน 30 ตัวอักษร ให้พิจารณาเรื่องนี้ก่อนสร้างข้อความขึ้นมา

## Run profile
lane: change (ui+logic) · skipped 1, 3d

## Status
- route: change (ui+logic) · intake: 3 asked
- base: feat/status-page-down-hide-mana
- onboard skipped by the user (baseline red, code is the only truth)
- announcement: no
- extra: researcher L0 added at user request (quick-reply phrases for social deduction, <=30 chars)
- gate 2b: passed (23 phrases)
- canvas: http://localhost:5173/.worktrees/feature-change-chat-quick-replies/.team/change-chat-quick-replies/canvas/chatbar-mockup.html (local)
- gate 3d: skipped (no smoke trigger)
- next: 4 · frontend-dev ∥ backend-dev · build
gate 2b passed · user: "อนุมัติ (Recommended) — 23 phrases" · 2026-11-16
gate 2b passed · user: "อนุมัติ (Recommended) — 23 phrases" · 2026-11-16
gate 3c passed · user: "อนุมัติ (Recommended); server: ไม่ต้อง ใช้เส้นทางเดิม (Recommended); mockup: ใช้ไฟล์ local (Recommended)" · 2026-11-16

## Decisions in force

## Loop counters
7:qa-tester 1/3

## Open blockers
- B-1 · - · FE · rounds open 1

## History
- step 7 r1: QA fail: AC 14/14 pass, B-1 chatBusy stuck on lost ack (FE) [7-r1]

[7-r1]: rounds/7-r1.md
