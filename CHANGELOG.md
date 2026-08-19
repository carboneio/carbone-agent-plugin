# Changelog

## 1.6.1
- Updated for Carbone v5.14.0 (tracked version 5.13.0 → 5.14.0)
- `in-template-options.md`: the `{o.converter=...}` row now names Chromium correctly and adds the v5.14.0 engine `I` (Carbone ICE, DOCX to PDF only) — the four accepted values are `L`, `O`, `C` and `I`
- `in-template-options.md` intro: an in-template option takes precedence over the same option in the API call, works in headers, footers and spreadsheet cells, ignores whitespace inside the tag, and an unknown option name is removed silently with no error — a misspelled or invented `{o.}` option just does nothing
- No templating changes in v5.13.1 (Chrome converter concurrency fix, job balancer hardening) or v5.14.0 (Carbone ICE converter, Node 24, `GET /templates` 400 on malformed URI, batch report filenames, Studio converter reset, `:html` DOCX list-rendering optimisation). Converter engine behaviour, performance and limitations stay out of the skill — they are runtime/API concerns, not template design

## 1.6.0
- Updated for Carbone v5.13.0 (tracked version 5.9.1 → 5.13.0)
- Frontmatter: `when_to_use` merged into `description` — the two were already concatenated in the skill listing, and the merge keeps the frontmatter closer to the six-field Agent Skills spec for non-Claude-Code distribution
- `description` rewritten (694 chars, cap is 1,536): dropped five paraphrases of "generate a document from JSON", the duplicated format list and the redundant "Carbone tag"/"Carbone placeholder" quotes; added trigger phrases for template errors (missing `[i+1]`), format-feature questions, `:formatter` chains, and charts/barcodes/dynamic images
- `SKILL.md` trimmed back under the 500-line limit (506 → 490) by removing content duplicated in reference files: the PDF form-filling methods (now only in `pdf-templates.md`), the `:html` element enumeration (now only in `advanced-features.md`), and the second statement of the format-agnostic rule in §9
- `:html` (`advanced-features.md`): new elements behind `{o.preReleaseFeatureIn=5011000}` — `<sup>` `<sub>` `<mark>` `<code>` `<kbd>` `<samp>` `<pre>` (v5.11.0), `<hr>` `<blockquote>` and task-list checkboxes `<input type="checkbox">` (v5.13.0), with their browser-like spacing (`0.5em` around a rule, `40px` per quote level) and the rule that other `<input>` types are ignored
- New `:html` option `quotetheme:Name` (v5.13.0) — applies a template paragraph style to `<blockquote>` (`Quote`, or `Intense_20_Quote` in ODT); updated the element lists of `inline` and `nospace`
- Checkbox behaviour: ticked by `checked` in any form, clickable in Word (DOCX) and rendered `☑`/`☐` elsewhere, task-item bullet not rendered
- ODT `<h1>`–`<h6>` now use the built-in `Heading_20_1`…`Heading_20_6` styles when no `headingtheme` is set; added the authoring rule that uppercase element names and single-quoted/unquoted attributes are only read with `5011000`
- Markdown templates: dynamic barcodes and charts via `<img src="{d.x:barcode(qrcode)}"/>` / `<img src="{d.x:chart}"/>` (ENTERPRISE, v5.13.0); `:html` and `<img>` sizing documented; stale "coming soon" rows removed from the limitations table
- `in-template-options.md`: new section on `preReleaseFeatureIn` version codes — threshold semantics, common values, `CARBONE_PRE_RELEASE_FEATURE_IN`, and v4 compatibility mode (a code below `5000000` disables v5's missing-`[i+1]` detection, v5.13.0); cross-linked from `upgrade-guide.md` and `SKILL.md` checklist item 8
- `formatters.md`: `:barcode` / `:chart` rows state where the tag goes per template format; `:html` row lists the required pre-release codes
- New reference file `pdf-templates.md`: a fillable PDF (AcroForm) is a supported **input** template (ENTERPRISE, v5+, not in Embedded Carbone JS) — the three tag-placement methods, supported field types, the features that do **not** exist in a PDF template (pictures, colors, `:html`, charts, barcodes, hyperlinks, `:transform`, file operations, signatures), Studio/macOS Preview gotchas, and the API call without `convertTo`
- New reference file `format-support.md`: the 15 known input formats with their enterprise-feature matrix and output formats, the previously undocumented CSV/TXT/XML and IDML templates, XLSX sheet-name and PPTX slide-creation limits, and a format-choice guide
- New block in `SKILL.md` next to the anti-hallucination guard: the design principles that change how an agent answers — adapt the template to the data (never ask the user to reshape their JSON), format-agnostic, and backward compatible (never warn that existing tags will break on upgrade)
- New `SKILL.md` validation checklist item 26: no control-flow statements — `{if}`, `{#if}`, `{% for %}`, `{/if}`, `{endfor}` and their variants do not exist; repetition is `[i]`/`[i+1]` and conditions are formatters
- New rule (`format-support.md`, echoed in `SKILL.md` §9): Carbone is **format-agnostic** — it injects data into the file's own markup, so both XML-based formats and text files work as templates and the 15 listed formats are not a closed list — **JSON is a working template format** despite not being listed; only the enterprise features are format-specific
- New section (`xlsx-tips.md`): one sheet per array item — an **ODS** template generates sheets dynamically by naming the tabs with aliases (`{#sheet1 = d.fruits[i].name}` → tab `{$sheet1}`, `{#sheet2 = d.fruits[i+1].name}` → tab `{$sheet2}`); aliases are the only way to do it and it does not work in XLSX. Echoed in `SKILL.md` §9 and `format-support.md`
- `:color` now states its compatible templates (DOCX, ODT, ODS, ODP, PPTX, HTML — never a PDF template, and not in Embedded Carbone JS) in both `SKILL.md` §8c and `advanced-features.md`; PPTX colors confirmed working since v5.6.0
- Fixed a wrong claim in `advanced-features.md`: PDF *is* a Carbone template format (it was described as conversion-output only); the `:html` line now states where the formatter really works
- No templating changes in v5.9.2, v5.10.0-beta and v5.12.0 (job balancer, cluster peers, Chrome converter, PDF encryption, Studio)

## 1.5.0
- New section (`loops-advanced.md`): horizontal loop — grow a table sideways (one column per array item) by placing `[i]` in one column and its `[i+1]` end-marker in the column immediately to its right; format-agnostic (DOCX, ODT, XLSX, ODS, PPTX, HTML, Markdown). Key rule: unlike a vertical loop (a single `[i+1]` row closes the whole block), a horizontal loop is detected per row, so every row containing an `[i]` tag needs its own `[i+1]` marker — otherwise Carbone throws `has no corresponding [i+1]`
- `SKILL.md` validation checklist item 8 (loop end-marker): now distinguishes the vertical rule (one `[i+1]` row closes the block) from the horizontal rule (one `[i+1]` per `[i]` tag), with pointers to §4a and the new horizontal-loop section
- Fixed cross-file contradiction (`docx-tips.md`): the newspaper-column section no longer claims "there is no horizontal loop tag" — it is now scoped to its page-layout use case (a flat list flowing down page columns) and cross-links both the real horizontal-loop tag pattern and the bidirectional loop
- `loops-advanced.md` trigger line updated to route "horizontal loops" questions to the file
- Updated tracked Carbone version to v5.9.1 (no new templating features)
- Terminology: renamed "runtime options" → "in-template options" across the skill (`SKILL.md`, `formatters.md`, `README.md`) and renamed the reference file `references/runtime-options.md` → `references/in-template-options.md`

## 1.4.1
- New section (`docx-tips.md`): dynamic page break inside a loop without a trailing blank page — drop the page-break paragraph on the last iteration with `{d.list[i]..list:len:sub(1):ifEQ(.i):drop(p)}` (or the filtered-loop short form `{d.list[i, i=-1]:ifNEM:drop(p)}`); plus the no-tag "Page break before" alternative
- New section (`docx-tips.md`): keep merged cells inside a table loop — no Carbone tag exists, so nest the looped rows in an inner table while the merged cell stays in the outer table; zero out inner-table cell margins (Word) / padding (LibreOffice)
- New section (`docx-tips.md`): horizontal (newspaper-column) repetition in a LibreOffice table — a normal vertical loop placed in a multi-column Section with a non-splitting table flows left-to-right; cross-reference to the native bidirectional loop (`loops-advanced.md`) for true 2-D grids in DOCX/HTML/Markdown
- New example (`formatters.md`): `{d.names:arrayJoin('\n'):convCRLF}` to print an array of strings one per line in DOCX/PPTX/ODT (join alone prints a literal `\n`; `:convCRLF` renders real line breaks)
- `docx-tips.md` trigger line and `SKILL.md` reference-list entry updated with the new page-break / merged-cell / horizontal-repetition topics

## 1.4.0
- New reference file `docx-tips.md`: DOCX/ODT header/body/footer section rules. Header, body, and footer are independent sections — a Carbone loop must be fully contained within one section; spanning `[i]` and `[i+1]` across sections triggers a "missing i+1" error
- New recipe (`docx-tips.md`): three patterns for displaying a body-loop value in a header or footer — direct aggregator in the target section, `:set(c.X)` round-trip read globally, or floating-text-box hack (officially recommended by Carbone) with the anchor staying in the loop's section and only the visual position moved over the target section
- New rule (`set-patterns.md`): relative `:set` dot ladder — `.X` writes inside the value's direct container, each extra dot climbs one container level up (up to the root); a non-partitioned aggregator + relative `:set` writes the same value onto every item at the target level; recommendation to prefer absolute `:set(c.X)` for clarity and cross-section reads
- New section (`xlsx-tips.md`): cell number formats only apply to native numeric cells; `:formatN` is the only way to force native-number output in XLSX/ODS (arithmetic like `:mul(1)` / `:add(0)` does not change the output type); the `:formatN` precision argument is ignored in XLSX/ODS — the cell format controls decimal display
- Split percentage patterns in `practical-examples.md` into two cases: native XLSX/ODS `%`-formatted cell (`{d.value:formatN}` only — do NOT pre-multiply) vs all other template formats (`:mul(100):append('%')`)
- `SKILL.md` §9 Spreadsheets bullet: cross-reference to `xlsx-tips.md` so percentage/currency/date cell-format behavior is discoverable from the main page
- `SKILL.md` reference list: added `docx-tips.md` entry with trigger phrases for Word/LibreOffice header/footer questions and "missing i+1" errors
- Updated for Carbone v5.8.0: bumped `carbone_version`; documented new runtime option `{o.styleSource=templateOrVersionId}` (apply style from another DOCX/ODT template to a Markdown template); noted loose-equality behavior in array search and lookup since v5.7.0 (`[year=1999]` matches both numeric and string)
- `:appendTemplate` corrections (cross-check vs official docs): added "PDF output only" constraint (silently ignored otherwise); replaced inaccurate "all render options forwarded" with the actual six (`lang`, `currency`, `enum`, `converter`, `translations`, complement); added no-recursion rule; expanded signature to `(templateIdOrVersionId, position?)`; fixed example to the official inline loop form
- Consolidated all `:html` formatter content into a single canonical location (`advanced-features.md` "`:html` Formatter — Full Reference"): merged the duplicate "Full Reference" section that lived in `formatters.md`, absorbed the wrap/conditional/`:convCRLF:html`/`:defaultURL:html` examples from `practical-examples.md` and `html-templates.md`, and replaced the originals with short pointers. Corrected "ODT/DOCX/HTML/PDF" framing — PDF is not a Carbone template format, only a conversion output
- `SKILL.md` footer: added three official-docs URLs (HTML page, `llms.txt` index, `llms-full.txt` single-file source for verification & diffs)
- `CLAUDE.md` publishing checklist: expanded with cross-file consistency, official-docs cross-check (with `llms-full.txt` pointer), and concrete "optimised for AI agents" criteria

## 1.3.3
- New rule (`formatters.md`): fallthrough behavior of `:show` without `:elseShow` — a single conditional returns the original input ("initial marker") on false; chains render nothing on no-match
- New rule (`SKILL.md` item 25): an alias cannot reference another alias, neither as the right-hand side (`{#x = $y}`) nor inside a formatter argument (`{#x = d.value:ifEM:show($y)}`); echoed in `aliases.md` fundamentals
- New recommendation (`practical-examples.md`): prefer relative paths (`..field` / `.field`) over nesting `{$alias}` or `{d...}` inside `:show()` arguments

## 1.3.2
- New patterns: extended `:and`/`:or` argument forms (`.prop`, absolute `d.`/`c.`, `$alias.field`); alias array aggregation (`{$alias[].field:aggSum}`); alias arrays inside native DOCX chart cells
- `SKILL.md` item 22: acknowledged filter-expression alias exception (bare field name allowed when alias body is a filter expression)
- `:transform`: added `in` unit (v5.4.0+ for PPTX/ODP)
- `:html` compatibility: added HTML to the format list
- `:drop`/`:keep` elements: unified element list and per-format support across `SKILL.md`, `formatters.md`, `html-templates.md`; clarified the `N` argument applies to `p` and `row` only
- `:ellipsis`: clarified `maximum` is the truncation point, not the total output length
- UNRECOMMENDED number formatters now ship inline replacement guidance: `:int` → `:add(0)` / `:abs`; `:toFixed` → `:round`; `:toEN`/`:toFR` → `:formatN` with `lang`
- ECharts: recommended `echarts@v5a` as default, `echarts@v5` as legacy
- Removed deprecated `:convDate` from the main Date Formatters table
- Audit fixes: corrected invalid `d[i=0]invoice[i=0]` alias-shorthand claim; corrected `:barcode` options syntax (comma-separated `key:value`, not semicolon-separated string); switched address-block country example to `:ifEQ` for correct equality semantics; removed stray spaces around `=` in array-filter example; fixed two broken markdown table separators in `formatters.md`

## 1.3.1
- New patterns in reference files: `:t:aggStrD`, post-aggregation arithmetic, datetime normalization in-place (`:startOfD:formatD:set` and `:substr:set`), chart from indexed array with `:imageFit`
- Added `{o.preReleaseFeatureIn=4025011}` to `references/runtime-options.md`
- `SKILL.md`: universal formatter argument quoting rule (item 6), loop iterator casing best practice (§9), `user-invocable: true`
- `extract-carbone-tags.py`: added `:image(width=N,height=N)` to `INVALID_FORMATTERS`

## 1.3.0
- Added `references/upgrade-guide.md` — Carbone upgrade guide covering v4→v5 migration and v5.0→v5.1.1 Studio Web Component breaking changes
- Added `references/aliases.md` — production alias patterns: filter aliases, object-pick, frozen-index, loop shorthand, alias with fallback/arithmetic, looping over alias arrays
- Added `references/practical-examples.md` — practical examples: date/time formatting combinations, optional address blocks, checkbox patterns, `:ifEQ(NaN)` guard, range checks with `:and`, invoice aggregation chains, complement data `{c.}` patterns, `..` relative path inside formatter arguments
- Expanded Day.js token table in `references/formatters.md` to all 40 tokens organized by category; added weekday-conditional block pattern (`{c.now:formatD(d):ifEQ(N):showBegin/showEnd}`)
- Extended `references/practical-examples.md` with new patterns: `:add(0)` coercion before aggregation for string-encoded numbers; `abs():set()` / `div(-1):set()` for debit/credit display branching; `:aggMax` with a filter referencing a previously `:set` value via `..`; chained `:add` for summing sibling fields; `:prepend():append():html` order-of-operations
- Updated `SKILL.md` validation checklist: merged double-quote rules (item 18), added spaces-in-tags rule (item 23), added double-colon `::` invalidity rule (item 24)
- Updated `SKILL.md` frontmatter: added `when_to_use` trigger phrases, set `user-invocable: false` (background knowledge — Claude loads automatically, not a slash command)
- Added prominent anti-hallucination warning to `SKILL.md`: Carbone is not JSONPath, Mustache, Handlebars, or Jinja2 — only documented syntax is valid

## 1.2.2
- Added HH:mm pattern for `:formatI` with ISO 8601 durations in `references/formatters.md`

## 1.2.1
- Added `.claude-plugin/plugin.json` manifest required by the marketplace CI scanner
- Added `skills: "./carbone"` path in `plugin.json` for direct plugin installation
- Improved `marketplace.json`: added `$schema`, `category`, `homepage`, `repository`, `license`; removed `strict: false` (no longer needed now that `plugin.json` exists)

## 1.2.0
- Updated for Carbone v5.5.0
- Added `col` element to drop/keep (Section 6c) with updated format limits for XLSX, PPTX, HTML, ODS
- Added `div` and `span` drop/keep elements for HTML templates
- Added HTML entities support in `:html` formatter (`references/advanced-features.md`)
- Added `{o.hardRefresh=true}` runtime option (v5.4.4+)
- Added `carbone_version` field to metadata

## 1.1.1
- Improved description: imperative phrasing, added "even without Carbone by name" trigger
- Added HTML and Markdown to the document format list in the description trigger

## 1.1.0
- Split SKILL.md into reference files (`loops-advanced.md`, `set-patterns.md`, `advanced-features.md`, `xlsx-tips.md`, `runtime-options.md`) for progressive disclosure
- Fixed frontmatter: `description` block scalar `|` → `>`, removed `compatibility` field, added `version` to metadata

## 1.0.0
- Initial release