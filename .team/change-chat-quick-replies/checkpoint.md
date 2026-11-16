# Checkpoint: change-chat-quick-replies
Updated: step 0 · round 0

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
- next: 3 · designer ∥ architect · design.md + contract.md
gate 2b passed · user: "อนุมัติ (Recommended) — 23 phrases" · 2026-11-16
gate 2b passed · user: "อนุมัติ (Recommended) — 23 phrases" · 2026-11-16
paused at pause:design-review · resume when the user answers

## Decisions in force

## Loop counters

## Open blockers

## History
