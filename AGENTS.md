# Samien project instructions

## Goal
Build a polished Thai-language frontend prototype for Design Thinking
empathy testing with a female English lecturer at Chulalongkorn University.
The lecturer is อาจารย์ ดร.สอนดี ใจดี, a fictional persona.

## Source of truth
- references/documents contains the authoritative nine mock documents.
- references/ui contains visual references only.
- PDF content overrides screenshot text, counts, dates, rooms and names.
- There are 9 documents: 3 signature requests, 3 appointments, 3 FYI.
- Attachments are part of their parent document, not separate documents.
- Do not invent additional incoming documents.
- Preserve original PDFs.

## Scope
- Frontend only; no backend, authentication, real OCR or AI API.
- Simulate scanning using the supplied document fixtures.
- Assume extraction and classification are correct.
- Do not add an OCR review or classification confirmation step.
- Signature, calendar acceptance and outgoing actions are simulations.
- Persist demo state in localStorage and provide a reset-demo action.

## UI consistency
- Use one shared AppShell, Sidebar, Topbar and design-token system.
- Reuse components across pages; do not independently redesign each screen.
- Background #F7F6F2, text #24322E, accent #27675D.
- White surfaces, subtle borders, restrained shadows and 6–8px radius.
- Use a readable Thai sans-serif such as Sarabun.
- Dense but readable document lists, not oversized dashboard cards.
- No decorative gradients, glassmorphism or generic AI chat interface.
- Primary navigation: รอลงนาม, นัดหมาย, แจ้งเพื่อทราบ, จัดเก็บแล้ว.
- Counts must derive from current application state.
- Use semantic HTML, keyboard access and visible focus states.

## Data and behavior
- Keep fixture data and state transitions outside presentation components.
- Store dates in Gregorian ISO format; display Thai Buddhist years.
- Use Asia/Bangkok time semantics.
- Dates mentioned in FYI documents do not automatically create meetings.
- Handle rescheduled meetings as updates, not duplicate appointments.
- Keep checkbox selection separate from opening document details.
- Clearly distinguish selected, pending, completed and conflicting states.

## Workflow
- Inspect reference files before implementation.
- If a source cannot be read, report the specific limitation; do not invent it.
- Check official docs for the installed dependency versions.
- Continue through implementation and verification, not just a plan.
- Run type checking and production build.
- Verify the core user flows and report what was actually tested.
- Explain progress and final results in Thai.