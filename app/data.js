// ข้อมูลบทบาท/การ์ด ใช้ร่วมกันทั้ง server และ client (ดึงมาจาก POC)
const IMG = '/docs/deadline_necromancer_role_cards/';
const DAYS = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์'];
const FNAME = {light:'Team Deliver', dark:'Cult of Burnout', indie:'Severance Seekers'};

// t = จำนวนเป้าหมายสกิล, pool = ใครเลือกได้, once = 1 ครั้ง/เกม
const ROLES = {
  senior_dev:        {n:'Senior Dev', sub:'จอมขมังเวทย์', f:'light', img:'team_deliver/01_senior_dev.jpg', skill:'Code Review', t:1, pool:'others', d:'ส่อง Log เพื่อน 1 คนว่า "ส่งงานจริง" หรือ "แอบวางบั๊ก"'},
  oracle_pm:         {n:'Oracle PM', sub:'ผู้หยั่งรู้', f:'light', img:'team_deliver/02_oracle_pm.jpg', skill:'Stand-up Shield', t:1, pool:'others', d:'กางบาเรียกันเพื่อน 1 คนจาก Burnout (กันโดนฝ่ายมืด = บาเรียสะท้อนใส่ตัวเอง)'},
  qa_hunter:         {n:'QA Hunter', sub:'นักล่าปีศาจ', f:'light', img:'team_deliver/03_qa_hunter.jpg', skill:'Bug Bounties', t:2, pool:'others', d:'ส่อง 2 คน ระบบบอกว่า "มีฝ่ายมืดอย่างน้อย 1 คนหรือไม่"'},
  rune_ux:           {n:'Rune UX/UI', sub:'นักวาดรูน', f:'light', img:'team_deliver/04_rune_ux_ui.jpg', skill:'Wireframe Trap', t:1, pool:'others', d:'วางรูนที่เพื่อน 1 คน เช้าถัดไปรู้ชื่อทุกคนที่ใช้สกิลใส่คนนี้'},
  data_oracle:       {n:'Data Oracle', sub:'หมอดู', f:'light', img:'team_deliver/05_data_oracle.jpg', skill:'KPI Forecast', t:0, d:'รู้ว่าเมื่อคืนมีงานเสร็จจริงกี่ชิ้น vs บั๊กแฝงกี่ชิ้น'},
  chrono_tech_lead:  {n:'Chrono Tech Lead', sub:'กาลเวลา', f:'light', img:'team_deliver/06_chrono_tech_lead.jpg', skill:'Hotfix Rollback', t:0, once:true, d:'(1 ครั้ง/เกม) ยกเลิกคำสาปและบั๊กทั้งหมดของคืนนั้น'},
  coffee_admin:      {n:'Coffee Admin', sub:'สายชงกาแฟ', f:'light', img:'team_deliver/07_coffee_admin.jpg', skill:'Espresso Elixir', t:1, pool:'any', d:'ฮีลเพื่อน 1 คนไม่ให้ Burnout และเพิ่มพลังโหวตเป็น 2 เท่าเช้าวันถัดไป'},
  shadow_hr:         {n:'Shadow HR', sub:'แห่งเงามืด', f:'dark', img:'cult_of_burnout/01_shadow_hr.jpg', skill:'PIP Curse', t:1, pool:'nondark', d:'สาป 1 คนให้คะแนนโหวตวันถัดไปเหลือ 0 และแอบเห็นบทบาทจริง'},
  mystery_intern:    {n:'Mystery Intern', sub:'ปริศนา', f:'dark', img:'cult_of_burnout/02_mystery_intern.jpg', skill:'Copy-Paste Illusion', t:-1, d:'ก๊อปสกิลของฝ่ายแสงที่อยู่ถัดไปทางขวามาใช้คืนนี้'},
  illusionist_sales: {n:'Illusionist Sales', sub:'มนต์มายา', f:'dark', img:'cult_of_burnout/03_illusionist_sales.jpg', skill:'Overpromise', t:1, pool:'nondark', d:'ทำให้ Log ของเป้าหมายคืนนี้ดูเหมือน "วางบั๊ก"'},
  chaos_scrum:       {n:'Chaos Scrum', sub:'แห่งความโกลาหล', f:'dark', img:'cult_of_burnout/04_chaos_scrum.jpg', skill:'Scope Creep', t:2, pool:'any', d:'เลือก 2 คน แล้วสลับเป้าหมายสกิลของทั้งคู่ในคืนนั้น'},
  shadow_legal:      {n:'Shadow Legal', sub:'ผู้พิพากษาเงา', f:'dark', img:'cult_of_burnout/05_shadow_legal.jpg', skill:'NDA Silence', t:1, pool:'nondark', d:'ปิดปาก 1 คน เช้าถัดไปพิมพ์แชทและโหวตไม่ได้ (ส่งได้แค่อีโมจิ)'},
  chaos_devops:      {n:'Chaos DevOps', sub:'จอมทำลายล้าง', f:'dark', img:'cult_of_burnout/06_chaos_devops.jpg', skill:'Deploy on Friday', t:0, once:true, d:'(1 ครั้ง/เกม) ปิดบาเรียและฮีลของฝ่ายแสงทั้งหมดในคืนนั้น'},
  severance_seeker:  {n:'Severance Seeker', sub:'จอมเวทล่าซองขาว', f:'indie', img:'severance_seekers/01_severance_seeker.jpg', skill:'Fake Bug Trace', t:0, win:'ชนะทันทีถ้าโดนโหวตไล่ออกตอนกลางวัน (ตายกลางคืน = แพ้)', d:'ทิ้งรอยบั๊กปลอมใน Log ตัวเองคืนนี้ และแอบเพิ่มคะแนนโหวต +1 ใส่ตัวเองในวันรุ่งขึ้น'},
  soul_recruiter:    {n:'Soul Recruiter', sub:'Headhunter ยมโลก', f:'indie', img:'severance_seekers/02_soul_recruiter.jpg', skill:'Poach Offer', t:0, win:'ปั่นให้ "เป้าหมายลับ" โดนโหวตไล่ออกก่อนเกมจบ (ถ้าเป้าหมายตายกลางคืน ระบบสุ่มเป้าหมายใหม่ให้)', d:'เลือกอย่างใดอย่างหนึ่ง: แอบส่องว่าเป้าหมายโดนใครโหวตรอบล่าสุด หรือแอบยัดคะแนนโหวต +1 ใส่เป้าหมายพรุ่งนี้ (1 ครั้ง/เกม)'},
  glory_thief:       {n:'Glory Thief', sub:'จอมโจรเคลมงาน', f:'indie', img:'severance_seekers/03_glory_thief.jpg', skill:'Take Credit', t:1, pool:'others', win:'ฝ่ายแสงต้องชนะ และตัวเองต้องรอดจนจบเกม + เก็บครบ 2 Credit', d:'เกาะติดเพื่อน 1 คน ถ้าเป็นฝ่ายแสงที่ใช้สกิลสำเร็จ คุณได้ +1 Credit และขโมยแจ้งเตือนลับของเขาแทน (เจ้าของจะไม่ได้รับคืนนั้น)'},
  chaos_intern:      {n:'Chaos Intern', sub:'สายป่วน', f:'indie', img:'severance_seekers/04_chaos_intern.jpg', skill:'Reply All', t:0, win:'ยื้อเกมถึงศุกร์โดยไม่มีฝั่งไหนปิดเกมได้ (และต้องยังไม่โดนไล่ออก)', d:'สุ่มดึงแจ้งเตือนส่วนตัวของใครสักคนไปป่าวประกาศในแชทกลางแบบไม่ระบุชื่อ และได้พลังโหวต 2 เท่าในวันพฤหัสบดี–ศุกร์'},
};
const LIGHT = Object.keys(ROLES).filter(k => ROLES[k].f==='light');
const DARK  = Object.keys(ROLES).filter(k => ROLES[k].f==='dark');
const INDIE = Object.keys(ROLES).filter(k => ROLES[k].f==='indie');
// Client Events: สุ่ม 1 ใบต่อเช้า (วันอังคาร–ศุกร์) — now = ปรับ Mana ทันที, choice = ทีมโหวตรับ/ปฏิเสธ
const EVENTS = {
  approve:  {n:1,  img:'01_fast_approval.jpg',      t:'👍 ลูกค้าอนุมัติเร็ว',        d:'หลอด Mana +1 ทันที', now:1},
  angry:    {n:2,  img:'02_angry_client.jpg',       t:'😤 ลูกค้าไม่พอใจ',            d:'หลอด Mana −1 ทันที (ต่ำสุด 0)', now:-1},
  down:     {n:3,  img:'03_server_down.jpg',        t:'🔥 เซิร์ฟเวอร์ล่ม',           d:'คืนนี้บาเรียและฮีลของฝ่ายแสงใช้ไม่ได้'},
  restart:  {n:4,  img:'04_scope_pivot.jpg',        t:'🔁 เปลี่ยน Requirement',      d:'คืนนี้ปั่นงานพื้นฐานได้ +0 Mana'},
  watch:    {n:5,  img:'05_client_watching.jpg',    t:'👀 ลูกค้านั่งเฝ้าทีม',         d:'คืนนี้ฝ่ายมืดสาป Burnout ไม่ได้'},
  blackout: {n:6,  img:'06_power_outage.jpg',       t:'🔌 ไฟดับ/เน็ตหลุด',           d:'สกิลสืบ 4 ตัว (Senior Dev, QA, UX/UI, Data Oracle) ได้แค่ "ไม่ได้ข้อมูล"'},
  audit:    {n:7,  img:'07_log_audit.jpg',          t:'🔍 ลูกค้าขอตรวจ Log',         d:'Code Review ได้ Log เพิ่มอีก 1 คนแบบสุ่มคืนนี้'},
  scope:    {n:8,  img:'08_extra_scope.jpg',        t:'📝 ขอเพิ่ม Scope',            choice:true, yes:'รับงานเพิ่ม', no:'ปฏิเสธ', d:'รับ: คืนนี้ปั่นงานพื้นฐาน +2 แต่โดนวางบั๊กหักได้ถึง −2 · ปฏิเสธ: ไม่เปลี่ยน'},
  ot:       {n:9,  img:'09_overtime_call.jpg',      t:'⏰ ขอให้ทำโอที',              choice:true, yes:'รับโอที', no:'ปฏิเสธ', d:'รับ: Mana +1 ทันที แต่คืนนี้บาเรียและฮีลใช้ไม่ได้ · ปฏิเสธ: ไม่เปลี่ยน'},
  marathon: {n:10, img:'10_marathon_meeting.jpg',   t:'🕰️ ประชุมมาราธอน',            d:'เวลาคุยครึ่งเดียว (บอทพูดน้อยลง) และวันนี้ห้ามกด Skip ในรอบโหวต'},
  snack:    {n:11, img:'11_free_snack_budget.jpg',  t:'🍩 งบเลี้ยงขนมฟรี',           d:'คืนนี้ใครเลือก "พักกินขนม" (ไม่ใช้สกิล) จะถูกคุ้มกันจากคำสาป Burnout อัตโนมัติ — ทุกคนเลือกพักได้คืนนี้'},
  leak:     {n:12, img:'12_reply_all_leak.jpg',     t:'📧 เมลหลุดทั้งบริษัท',        d:'ระบบสุ่ม 2 คน ประกาศว่าเมื่อคืนทั้งคู่ทำแอ็กชัน "เหมือนกัน" หรือ "ต่างกัน"'},
  prod:     {n:13, img:'13_prod_crisis.jpg',        t:'🚨 บั๊กหลุดขึ้น Production',  choice:true, yes:'รับมือร่วมกัน', no:'ปฏิเสธ', d:'รับ: คืนนี้ทุกคนห้ามใช้สกิล · Mana +0 · ฝ่ายแสง 1 คน (สุ่ม) ได้รับคุ้มกันจากคำสาป Burnout คืนนี้ / ปฏิเสธ: Mana −2 ทันที และคืนนี้มีผู้เล่น 1 คน (สุ่มจากฝ่ายแสงหรือฝ่ายอิสระ ไม่รวมฝ่ายมืด) ถูกสาป Burnout'},
  hotdesk:  {n:14, img:'14_hot_desking.jpg',        t:'🪑 สลับโต๊ะทำงาน',            d:'คืนนี้สุ่มสลับเป้าหมายสกิลของผู้เล่น 1 คู่แบบลับๆ เฉลยเช้าวันถัดไป'},
  bonus:    {n:15, img:'15_bonus_tease.jpg',        t:'💰 ลุ้นโบนัสกลางปี',          choice:true, yes:'ลุ้นโบนัส', no:'ปฏิเสธ', d:'รับ: คืนนี้ปั่นงานพื้นฐาน +2 แต่ถ้ามีฝ่ายมืดวางบั๊กสำเร็จ (แม้ 1 คน) โดนหัก −2 · ปฏิเสธ: ไม่เปลี่ยน'},
};
// Trap Card ของฝ่ายมืด (ใช้แทน side action) / Sprint Booster (โหวตสาธารณะตอนเช้า)
const TRAPS = {
  blame:     {img:'01_blame_shifting.jpg', n:'Blame Shifting',    need:null,      d:'ถ้าฝ่ายมืดถูกโหวตไล่ออกอันดับ 1 วันถัดไป → ยกเลิกและบังคับผลเป็น Skip'},
  honeypot:  {img:'02_honeypot_bug.jpg', n:'Honeypot Bug',      need:'any',     d:'หมอบที่ผู้เล่น 1 คน — สายสืบ (Senior Dev/QA/UX) ที่ส่องคนนี้คืนนี้จะได้ข้อมูลปลอม'},
  alibi:     {img:'03_alibi_mirror.jpg', n:'Alibi Mirror',      need:'dark',    d:'หมอบที่ฝ่ายมืด 1 คน — โดนสกิลฝ่ายแสงคืนนี้จะดูเป็นฝ่ายแสงปกติ และไม่ทำให้บาเรียของ PM แตก'},
  hijack:    {img:'04_meeting_hijack.jpg', n:'Meeting Hijack',    need:null,      d:'เช้าวันถัดไปเวลาคุยลด 30% และสุ่มผู้เล่น 1 คนให้ Skip อัตโนมัติ'},
  insurance: {img:'05_sabotage_insurance.jpg', n:'Sabotage Insurance',need:null,      d:'ถ้า Chrono ใช้ Hotfix Rollback คืนนี้ → ยกเลิก Burnout ตามปกติ แต่ไม่คืน Mana จากบั๊ก'},
  exit:      {img:'06_exit_scam.jpg', n:'Exit Scam',         need:'nondark', d:'หมอบที่คนไม่ใช่ฝ่ายมืด — ถ้าถูกโหวตไล่ออกวันถัดไป Mana −1 และบล็อกแจ้งเตือนลับฝ่ายแสง 1 คน'},
};
const BOOSTERS = {
  scanner: {img:'01_debug_scanner.jpg', n:'Debug Scanner',    d:'ตรวจว่าเมื่อคืนมี Trap ถูกหมอบหรือไม่ และยกเลิกผล Honeypot/Alibi ของคืนที่ผ่านมา (ได้ข้อมูลจริง)'},
  retro:   {img:'02_retrospective.jpg', n:'Retrospective',    d:'ยกเลิกโทษ Skip ในรอบโหวตวันนี้ (โหวตแบบเปิดชื่ออยู่แล้ว)'},
  freeze:  {img:'03_emergency_freeze.jpg', n:'Emergency Freeze', d:'คืนนี้ Server Down / Overtime Call ล็อกบาเรียและฮีลไม่ได้'},
};

const EVIMG = '/docs/event_cards/';
const TRAPIMG = '/docs/deadline_necromancer_trap_cards/';
const BOOSTERIMG = '/docs/booster_cards/';
const BOOSTERTHUMB = '/thumbs/boosters/';
const TRAPTHUMB = '/thumbs/traps/';
const EVTHUMB = '/thumbs/events/';
const ROLETHUMB = '/thumbs/roles/';        // 300px
const ROLETHUMB_MD = '/thumbs/roles-md/';  // 600px   // ภาพย่อ 300px สร้างด้วย tools/make_thumbs.py
if (typeof module !== 'undefined') module.exports = { IMG, EVIMG, TRAPIMG, TRAPTHUMB, BOOSTERIMG, BOOSTERTHUMB, EVTHUMB, ROLETHUMB, ROLETHUMB_MD, DAYS, FNAME, ROLES, LIGHT, DARK, INDIE, EVENTS, TRAPS, BOOSTERS };
