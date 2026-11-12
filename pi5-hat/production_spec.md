# Production & reliability specification (rev B)

Supersedes the "board" assumptions in `schematic.md` §9 and adds the protection,
derating, DFM, test and validation requirements a production run needs.

## 0. Status — what is and isn't done

| Item | State |
|---|---|
| Architecture, protection, derating, stackup, DFM/DFT, validation plan | **Specified here** |
| KiCad 7.0.11 + `kicad-cli` | Installed in this session, ready to run ERC/DRC |
| Schematic capture, PCB layout, Gerbers | **Not done — blocked (below)** |

**Blocker: the buck IC's official data.** A production layout of the TPS56C215 needs
the datasheet's RNN0018A (18-pin HotRod QFN) *land pattern*, pin table, absolute-max
ratings and the typical-application component values. `ti.com`, Mouser, Digi-Key and
Octopart are not reachable from this session, KiCad's reviewed libraries have no
10 A-class buck, and the community footprints/symbols I found on GitHub are
unreviewed third-party files — not an acceptable basis for a 0.5 mm-pitch QFN on a
high-reliability board. I am deliberately **not** inventing these. See §11 for exactly what I need.

Search-result snippets suggest this pin mapping for the TPS56C215 (**unverified —
two sources disagree on EN/PG/SS numbering; confirm against the datasheet**):
1 BOOT · 2, 11 VIN · 3-5, 8-10 PGND · 6-7 SW · 12 AGND · 13 FB · 14 SS · 15 EN · 16 PGOOD · 17 VREG5 · 18 MODE.

## 1. Reliability targets

| Parameter | Target |
|---|---|
| Ambient | 0 – 50 °C (Pi 5 rating); design margin to 60 °C inside an enclosure |
| Board temperature limit | ≤ 105 °C anywhere under worst-case load; ≤ 85 °C on electrolytic/polymer caps |
| Input | 12 V nominal, 9 – 16 V operating (the TPS56C215 is rated 3.8 – 17 V, so there is little headroom); mark "12 V DC MAX 16 V" on the silkscreen. A 24 V requirement needs a different buck |
| Output | 5.1 V ±2 %, ≤ 10 A peak, **≤ 5 A through the Pi header** |
| Fab / assembly class | IPC-6012 Class 2 minimum (Class 3 optional, cost ↑); IPC-A-610 Class 2 |
| Laminate | FR-4, **Tg ≥ 150 °C** (Tg 170 preferred), halogen-free optional, RoHS |
| Claims not made | No MTBF figure, no FCC/CE/UL compliance — those need testing (§9) |

## 2. Stackup and copper

**4 layers, 1.6 mm, ENIG** (ENIG for flat pads on the 0.5 mm QFN and for contact/
test-point durability).

| Layer | Use |
|---|---|
| L1 (top) | Components, buck power loop, short signals |
| L2 | **Solid GND**, unbroken under the buck and the GPS |
| L3 | 12 V / 5 V / 3.3 V pours + routing; GND where free |
| L4 (bottom) | Header, test points, pours, thermal spreading |

IPC-2221 trace widths (computed): required width in mm for a 10 °C rise.

| Current | Outer 1 oz | Outer 2 oz | Inner 1 oz |
|---|---|---|---|
| 10 A | 7.2 | 3.6 | 18.7 |
| 5 A (Pi header path) | 2.8 | 1.4 | 7.2 |
| 4.6 A (12 V input at full load) | 2.5 | 1.2 | 6.4 |
| 2 A (LED branch) | 0.8 | 0.4 | 2.0 |

Consequences: carry 10 A as **pours stacked on L1 + L3 + L4 and stitched with vias**, not
as traces; use **2 oz outer** if the fab's 2 oz rules still meet the QFN breakout
(typically ≥ 0.2 mm trace/space), otherwise 1 oz outer with pours on all four layers.
Treat IPC-2221 as a floor — verify temperature rise on the first article (§8).

## 3. Reliability architecture — changes versus rev A

| # | Addition | Why |
|---|---|---|
| 1 | **5 V output overvoltage protection / eFuse** between the buck and header pins 2/4 + AUX: OVP clamp ≈ 5.7 V, current limit ≈ 5.5–6 A, latch-off or auto-retry | A shorted high-side FET in a buck passes 12 V straight to the Pi 5. This is the single most important protection on the board. Candidate class: TI TPS259xx / TPS25947-type eFuse with OVP — **verify ratings and pinout before use** |
| 2 | **Digital temperature sensor** (TMP117 class, I2C 0x48) beside the buck inductor | Lets software throttle/alarm before the board overheats; INA219 can't see temperature |
| 3 | **Input hot-plug damping:** polymer/electrolytic bulk cap in parallel with ceramics (ESR damps LC ringing) + TVS | Ceramic-only input rings to ~2× Vin on a hot-plugged 12 V cable and can exceed the buck's absolute max |
| 4 | **Buck UVLO set ≈ 9 V** (EN divider) | Prevents brown-out chatter on a sagging supply |
| 5 | **ESD/transient clamp** (TVS array) + series resistors on every off-board signal: HX711 (DT/SCK), RGB chain data, GPS UART/PPS, LED gate | Off-board cables are where ESD enters |
| 6 | **Gate protection** on Q2: 100 Ω series, 100 kΩ pull-down, 12 V zener or TVS gate-source clamp | GPIO never sees the LED supply; LED stays off during boot/reset |
| 7 | **Reverse-polarity P-FET** (ideal diode) with gate clamp, not a Schottky | A Schottky would burn ~1.5 W at 3 A |
| 8 | **Fuses:** F1 7 A fast on 12 V in; PTC on the LED branch; PTC/fuse on the AUX 5 V | Contain faults; each rated for the available fault current and the 32 V rail |
| 9 | **Power-good → GPIO4** (buck PGOOD, through a level-safe resistor) and eFuse fault → spare GPIO | Software-visible health |
| 10 | **Test points** (§7) on every rail and critical signal | DFT/DFM |

Also keep from rev A: INA219 with Kelvin-sensed 10 mΩ shunt, 3.3 V HX711, AHCT level
shifter for the WS2812, GPS with U.FL, solder jumpers for alternates.

## 4. Component derating rules

| Part | Rule |
|---|---|
| MLCC (X7R/X5R) | Voltage rating ≥ 2× working voltage (12 V rail → 35 V or 50 V; 5 V rail → 16 V or 25 V); count only ~40–60 % of nominal capacitance at DC bias; X7R/X7S/X6S only, no Y5V/Z5U |
| Bulk caps | Polymer/hybrid, 105–125 °C, ≥ 2000 h class; ripple current ≥ 1.5× calculated; voltage ≥ 1.5–2× |
| Inductor | Shielded, Isat ≥ 1.3× peak (I_out + ΔI/2) at 105 °C, Irms ≥ 1.2× I_out |
| Resistors | 1 % / 100 ppm thin-film for dividers (0.1 % for the FB divider); 0603 or larger except where 0402 is needed for density; ≤ 50 % rated power |
| Shunt | 4-terminal Kelvin, ≤ 50 ppm/°C, ≤ 50 % rated power (0.2 W on a 3 W part is fine) |
| MOSFETs | VDS ≥ 2× rail; Rds(on) specified at the actual gate drive (Q2: Vgs ≤ 3.3 V) |
| TVS | Stand-off ≥ max operating Vin; **clamp ≤ 80 % of the buck's absolute-max VIN** and < 26 V (INA219 bus limit) — set once the buck datasheet's abs-max is known |
| Connectors | Terminal blocks ≥ 2× current; header pins 2 and 4 carry ≤ ~2.5 A each (2.54 mm pins are ~3 A) |
| Temperature grade | All ICs ≥ −40…+85 °C; passives ≥ 105 °C; prefer AEC-Q200 caps/inductors if sourced |

## 5. Layout rules (production)

**Power stage**
- Input caps adjacent to VIN/PGND; smallest MLCC closest; hot loop (VIN-caps-IC-PGND) < 5 mm² and fully on L1 over solid L2.
- SW node copper minimal; **nothing routed on L1–L3 under it**; no vias carrying signals nearby.
- ≥ 8 thermal vias under the exposed/PGND pads (filled/capped or tented per fab capability), connecting to L2/L3/L4 copper.
- FB trace short, shielded by GND, away from the inductor and SW; AGND joined to PGND at one point per datasheet.
- Output caps + eFuse placed near the header pins; pins 2 and 4 tied by a wide pour; use all 8 GND header pins.

**Sense and precision**
- INA219 Kelvin pair routed as a differential pair straight from the shunt pads; shunt isolated from other high-current copper.
- HX711 line: keep away from the buck and the switching loop; guard with GND.

**RF / GPS**
- GPS in the corner farthest from the Pi 5's USB-3/Ethernet side and RP1; solid GND under it, keep-out for switchers; U.FL near the board edge; separate ferrite-filtered 3.3 V.

**Digital**
- I2C/UART short, over solid L2; no splits in the L2 return path.

**DFM-oriented**
- Min trace/space 0.15/0.15 mm (0.2/0.2 mm on 2 oz); min via 0.3/0.6 mm (drill/pad) with ≥ 0.15 mm annular ring; **no via-in-pad** except under the thermal pad (and then filled/capped); solder-mask dams between 0.5 mm-pitch pads; 0.5 mm copper-to-edge clearance, 1 mm for mounting-hole keep-out.
- 3 global fiducials (1 mm dot, 2 mm mask opening) + local fiducials near the QFN; 3 mm panel rails.
- Panelize with V-score or tabs outside high-stress components; heavy parts (inductor, bulk caps, terminals) oriented so board flex doesn't load their joints.
- Silkscreen: polarity, pin 1, rail names, 12 V input polarity/range, "NOT TO BE POWERED FROM USB-C AND 12 V AT ONCE".

## 6. Thermal budget (to be verified, not assumed)

| Load | Output power | Buck loss @ ~90 % | Note |
|---|---|---|---|
| Pi 5 + peripherals, 5 A | 25.5 W | ~2.8 W | normal use |
| 10 A peak (AUX + Pi) | 51 W | ~5.7 W | limit duration; needs airflow |

Spread the loss over L1–L4 copper under the IC and inductor; keep the INA219, TMP117,
HX711 connector and GPS out of the buck's hot zone. Measure with a thermocouple/IR camera
on the first article at 25 °C and 50 °C ambient.

## 7. Test points and DFT

1.0 mm round pads, 2.54 mm-grid where possible, top side: `+12V_IN`, `VIN_SENSED`, `+5V`, `+5V_PI`
(after eFuse), `+3V3`, `GND` ×3, `SW` (scope only), `PGOOD`, `EFUSE_FLT`, `I2C_SDA`, `I2C_SCL`,
`LED_GATE`, `RGB_DATA`, `GPS_TX`, `GPS_PPS`, `HX_DT`, `HX_SCK`. Plus a 2×3 pogo/Tag-Connect
footprint for functional test and a pad pair for the buck FB divider (tuning/measurement).

Deliver an IPC-D-356 netlist so the fab can run electrical test on 100 % of boards.

## 8. Validation plan (first-article → production)

1. **Bench:** current-limited bring-up (0.5 A), then full-load; verify 5.10 V ±2 %, ripple < 50 mVpp, INA219 vs. a DMM/shunt reference, TMP117 vs. a thermocouple.
2. **Load transient:** 0 ↔ 5 A step, Pi 5 must not brown out or log undervoltage (capture the 5 V droop at the header and keep it well above the Pi's undervoltage threshold — confirm that threshold in Raspberry Pi's documentation).
3. **Protection:** reverse polarity, 24 V input pulse (within spec), hot-plug 12 V through 1 m of cable (scope Vin overshoot — must stay under the buck's abs-max), output short, **forced OVP trip** (verify the eFuse clamps before the Pi sees > 5.7 V), LED output short.
4. **Thermal:** 1 h at 5 A and 10 A, 25 °C and 50 °C; log temperatures via TMP117; cap/inductor/IC within the §1 limits.
5. **EMC pre-compliance:** conducted emissions on the 12 V input and radiated near-field scan; check GPS C/N0 with the buck on vs. off (desense check).
6. **ESD:** IEC 61000-4-2, ±4 kV contact / ±8 kV air on the connectors, function check after.
7. **Reliability screening (sampling):** thermal cycling (−20 ↔ +70 °C), power cycling, 48–168 h burn-in at 60 °C and rated load.
8. **Production test:** ICT/flying-probe + functional jig: rails, I2C ID of INA219/TMP117, LED gate toggle, GPS NMEA presence, HX711 ready line.

## 9. Compliance notes

Not a certified product. Selling it implies FCC Part 15 / CE EMC (and RoHS) evidence;
a HAT that powers a Pi from its GPIO is also outside the Pi's own certification.
Document the supported use (12 V only, no simultaneous USB-C).

## 10. Release package (what "production-ready" files means)

Fab: Gerber X2 (RS-274X) + Excellon drill + IPC-D-356, fab drawing with stackup/notes (IPC class, Tg, ENIG,
copper weights, tolerance, impedance not required), board/panel outline.
Assembly: BOM with MPN + approved alternates + lifecycle status, pick-and-place, assembly drawing, 3D STEP.
Docs: schematic PDF, layout PDF, test procedure, revision log/ECO. All reproducible from the repo via `kicad-cli`.

## 11. What I need to finish the layout

1. The **TPS56C215 datasheet PDF** (or the pin table, RNN0018A land-pattern/stencil page, abs-max table, and the typical-application design table for 12 V → 5 V). Easiest: commit the PDF to this repo (e.g. `pi5-hat/datasheets/`) or paste the sections. *Alternative:* pick a different buck for which you can provide the datasheet.
2. **Fab / assembly target** (JLCPCB, PCBWay, other?) and **quantity** — drives rules, finish, stackup and the parts I can pick for availability.
3. **Input requirement:** strictly 12 V, or up to 24 V / automotive? A 24 V requirement changes the buck choice (the TPS56C215 maxes at 17 V).
4. **Environment:** enclosed? ambient? fan? vibration? — sets derating and coating.
5. **GPS module** and **LED interpretation** (still open from rev A).
