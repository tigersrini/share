# Schematic specification

Net names are in `UPPER_CASE`. Pin numbers for catalogue parts are from memory of
the datasheets and **must be checked against the datasheet at capture time**, except
where marked *(unverified — copy from datasheet)*.

## 0. Pi header (J_PI, 2×20 female, bottom side)

| Pin | Name | Net | Pin | Name | Net |
|---|---|---|---|---|---|
| 1 | 3V3 | `+3V3` | 2 | 5V | `+5V` |
| 3 | GPIO2 SDA1 | `I2C_SDA` | 4 | 5V | `+5V` |
| 5 | GPIO3 SCL1 | `I2C_SCL` | 6 | GND | `GND` |
| 7 | GPIO4 | NC (spare) | 8 | GPIO14 TXD0 | `GPS_RX_IN` (Pi→GPS RX) |
| 9 | GND | `GND` | 10 | GPIO15 RXD0 | `GPS_TX_OUT` (GPS TX→Pi) |
| 11 | GPIO17 | `GPS_PPS` | 12 | **GPIO18** | `LED_GATE_DRV` |
| 14, 20, 25, 30, 34, 39 | GND | `GND` | 17 | 3V3 | `+3V3_GPS` |
| 27 | ID_SD | `ID_SD` (EEPROM, optional) | 28 | ID_SC | `ID_SC` |
| 29 | GPIO5 | `HX_DT` | 31 | GPIO6 | `HX_SCK` |
| 32 | **GPIO12** | `RGB_DATA_3V3` | all others | | NC |

Notes: use all eight GND pins; tie pins 2 and 4 together on a wide pour. `+3V3_GPS` is
split from `+3V3` with a 0 Ω/ferrite so GPS noise can be isolated.

## 1. Input and protection

```
J1 (12V IN, 2-pos 5.08 mm screw, ≥10 A)
  pin1 ─ F1 (7 A fast SMD fuse, 32 V) ─ Q1 (P-MOSFET reverse-protection) ─ VIN_PROT_RAW
  pin2 ─ GND
D1  TVS across VIN_PROT_RAW–GND (see note)
```

- **Q1:** P-channel, ≥30 V, ≤10 mΩ, source toward the load side (body diode oriented
  so reverse voltage is blocked); gate to GND through R (10 kΩ) with a 15 V zener
  gate clamp from gate to source. Typical high-side P-FET ideal-diode topology.
- **D1 (TVS):** stand-off ≥13 V (12 V rail with margin). The clamp voltage must stay
  **below the buck's absolute-max VIN** (*unverified* — read it from the datasheet) and
  below the INA219's 26 V bus limit. Pick the TVS to satisfy both.
- Bulk input capacitance: 2× 22 µF/25 V ceramic + 1× 220 µF/25 V electrolytic or polymer.

## 2. INA219 (U2) — current monitor

Package SOT-23-8 (INA219AIDCN). Pins (verify): 1 IN+, 2 IN−, 3 GND, 4 VS, 5 SCL, 6 SDA,
7 A0, 8 A1.

```
VIN_PROT_RAW ──┬─ R_SH 10 mΩ (2512, Kelvin) ─┬── VIN_SENSED  (to buck + LED branch)
               │                               │
          Kelvin sense                      Kelvin sense
               └─ R 10 Ω ── IN+  (U2.1)        └─ R 10 Ω ── IN− (U2.2)
                         C 0.1 µF across IN+ and IN−  (optional filter per datasheet)
U2.3 GND = GND        U2.4 VS = +3V3 (0.1 µF to GND)
U2.5 SCL = I2C_SCL    U2.6 SDA = I2C_SDA
U2.7 A0  = GND (SJ: GND/VS/SDA/SCL)   U2.8 A1 = GND (SJ)    → address 0x40
```

- No extra I2C pull-ups: the Pi already has 1.8 kΩ on GPIO2/3.
- Run the two sense traces as a differential pair directly to the shunt pads, not from the
  power copper.
- Everything that draws current from the 12 V input — buck and LED branch — must be
  **downstream** of `VIN_SENSED` or the reading will be incomplete.

## 3. 5 V / 10 A buck (U1, TPS56C215 or equivalent)

12 V (`VIN_SENSED`) → **+5V** at 5.1 V.

**Pin-level netlist: *unverified — copy from the datasheet typical application circuit*.**
The datasheet was not reachable from the design session. What I can state:

- Device: TI TPS56C215, 18-pin HotRod QFN 3.5 × 3.5 mm, 0.5 mm pitch, 12 A, Vin 3.8–17 V,
  Vout 0.6–5.5 V.
- Feedback: `Vout = Vref × (1 + R_top / R_bot)`. If Vref = 0.6 V (consistent with the
  0.6 V minimum output), use **R_top 75 kΩ / R_bot 10 kΩ → 5.10 V** (0.1 %–1 % parts). Confirm Vref first.
- Take from the datasheet: inductor value and saturation current for 10–12 A, output and input
  capacitor count/values, bootstrap capacitor, VCC capacitor, MODE resistor (switching
  frequency / light-load mode), EN/UVLO divider (set start threshold ≈ 9 V so the buck
  doesn't run on a sagging supply), soft-start.
- Power-good (if provided): optionally route to a spare GPIO (e.g. GPIO4, pin 7) so software can see it.

Layout rules (general, apply regardless of the specific IC):

- Input caps hugging VIN/PGND pins, smallest cap closest.
- Switch node copper as small as possible; no signals under it.
- Continuous GND plane directly below on layer 2; stitching vias around the power loop.
- FB trace short, away from SW/inductor, referenced to quiet GND.
- Many vias (≥ 8) under the thermal pad, to inner/bottom copper.
- Output: ≥ 100 µF bulk + ceramics near the header 5 V pins; pins 2 and 4 on a wide pour.

Outputs from the 5 V rail:

| Net | Goes to | Notes |
|---|---|---|
| `+5V` → J_PI pins 2, 4 | Pi 5 | ≤ 5 A (header pin rating) |
| `+5V` → LED chain (§6) | WS2812 + level shifter | ~60 mA per LED |
| `+5V` → J5 (AUX 5V, 2-pos screw) | external 5 V loads | adds up to the buck's remaining capacity; fuse it (F3) |

## 4. 12 V LED driver — MOSFET on GPIO18

```
+12V_LED = VIN_SENSED ─ F2 (PTC 2 A) ─ J_LED.1 (LED +)
J_LED.2 (LED −) ──────────── Q2 drain
Q2 source ─ GND
Q2 gate ─ R_G 100 Ω ─ LED_GATE_DRV (GPIO18 pin 12)
Q2 gate ─ R_PD 100 kΩ ─ GND                (keeps LED off while GPIO is floating at boot)
D_FW (SS14 Schottky, DNP default) across J_LED (cathode to +12V) — populate only for inductive loads
```

- **Q2:** AO3400A (SOT-23: 1 gate, 2 source, 3 drain), 30 V / 5.7 A, logic-level —
  or any N-MOSFET with Rds(on) specified at Vgs ≤ 2.5–3.3 V.
- For a bare LED (not a strip with built-in resistors) add a series resistor or
  constant-current driver; the MOSFET does not limit current.
- GPIO18 is PWM0 ch 2 on the Pi 5 — usable for dimming.
- Keep the LED current loop short; thick traces for 2 A.

## 5. RGB LED (WS2812B-type) on GPIO12

```
RGB_DATA_3V3 (GPIO12 pin 32) ─ U3.2 (A)
U3 = SN74AHCT1G125DBV (SOT-23-5):  1 OE̅ → GND,  2 A,  3 GND,  4 Y,  5 VCC → +5V (0.1 µF)
U3.4 (Y) ─ R 330 Ω ─ RGB_DIN
RGB_DIN ─ LED1.DIN (WS2812B 5050: 1 VDD, 2 DOUT, 3 VSS, 4 DIN)
LED1.VDD = +5V (0.1 µF), LED1.VSS = GND
LED1.DOUT ─ J_CHAIN.2
J_CHAIN (1×3, 2.54 mm): 1 = +5V, 2 = DATA (DOUT of LED1), 3 = GND
C 220–470 µF / 10 V electrolytic at J_CHAIN for strip inrush
```

- Solder-jumper option SJ_RGB: `RGB_DATA_3V3` from GPIO12 (default) or from GPIO10
  (SPI0 MOSI, pin 19), in case the Pi 5 NeoPixel driver you use doesn't support GPIO12.
- Powering from `+5V` means the LED is on whenever the buck is up. If the AHCT buffer
  is unpowered but the Pi drives GPIO12, AHCT inputs tolerate it.

## 6. HX711 connector (J4, 1×4, 2.54 mm)

| Pin | Net | Notes |
|---|---|---|
| 1 | `GND` | |
| 2 | `HX_DT` ← GPIO5 (pin 29) | 330 Ω series; HX711 DOUT |
| 3 | `HX_SCK` → GPIO6 (pin 31) | 330 Ω series; **10 kΩ pull-down to GND** (SCK high > 60 µs powers the HX711 down) |
| 4 | `+3V3` | HX711 module runs on 3.3 V → 3.3 V logic |

Pin order matches the common green HX711 breakout (GND, DT, SCK, VCC) so a straight 4-way
cable works — **verify against your module's silkscreen**. Add 0.1 µF + 10 µF at the
connector.

Bit-banging on a non-realtime Linux can occasionally miss timing; use a retry/validity check.

## 7. GPS (indoor) — J_GPS

Socket 1×5 (2.54 mm) for a commodity breakout, plus a U.FL for an external antenna.

| Pin | Net |
|---|---|
| 1 | `+3V3_GPS` |
| 2 | `GND` |
| 3 | `GPS_TX_OUT` (module TX → GPIO15 / pin 10) |
| 4 | `GPS_RX_IN` (module RX ← GPIO14 / pin 8) |
| 5 | `GPS_PPS` → GPIO17 (pin 11) |

- **Confirm pin order for your module**; breakouts differ. Easy fix is to reorder the socket.
- Add 100 Ω series resistors on TX/RX; ferrite + 10 µF + 0.1 µF at `+3V3_GPS`.
- If you want the GPS chip *on* the board instead of a socket, this block is re-done around
  one module (MAX-M10S / ATGM336H class) with its own LDO and RF layout.
- Placement: the corner farthest from USB-3/Ethernet, ground pour under the antenna keep-out
  as the module vendor recommends, U.FL on the board edge.

## 8. HAT ID EEPROM (optional)

CAT24C32 (or equivalent) on `ID_SD` / `ID_SC` (pins 27/28), 3.9 kΩ pull-ups to `+3V3`,
A0–A2 = GND, WP jumper. Not needed for function; required by the official HAT+ spec.

## 9. Mechanical

- Outline 65 × 56 mm, 3 mm corner radius, M2.5 holes at (3.5, 3.5), (61.5, 3.5), (3.5, 52.5), (61.5, 52.5).
- 2×20 female header on the **bottom** side, centered on x = 32.5 mm, rows at y = 2.23 / 4.77 mm
  from the top edge (see `floorplan.svg`).
- The official Active Cooler sits under the HAT — use a tall header / standoffs and check clearance.
- Keep out / avoid tall parts over the Pi's FFC connectors per the HAT+ mechanical spec.
- Stackup, copper weights and protection additions (5 V OVP eFuse, temperature sensor, ESD clamps)
  are specified in [`production_spec.md`](production_spec.md) and supersede this section.
