# Pi 5 Power + Sensor HAT — design package

A single HAT-format board (65 × 56 mm) that plugs onto the Raspberry Pi 5 40-pin
header and needs **no cables back to the Pi**. All Pi connections go through the
GPIO header.

| Block | What it does | Pi pin(s) |
|---|---|---|
| 12 V input + protection | Screw terminal, fuse, reverse-polarity FET, TVS | – |
| **INA219** | High-side current/voltage monitor on the 12 V input | I2C1: GPIO2 (pin 3), GPIO3 (pin 5) |
| **5 V / 10 A buck** | 12 V → 5.1 V, feeds the Pi *through the header* | 5 V pins 2 + 4 |
| **MOSFET LED driver** | Low-side N-MOSFET switching a 12 V LED / strip | **GPIO18** (pin 12) |
| **RGB LED (WS2812-type)** | One on-board addressable RGB LED + chain-out header | **GPIO12** (pin 32) |
| **HX711 connector** | 4-pin 2.54 mm header | GPIO5 (pin 29) DT, GPIO6 (pin 31) SCK |
| **GPS (indoor)** | Socket for a high-sensitivity GPS module + U.FL for external antenna | GPIO14/15 (pins 8/10) UART, GPIO17 (pin 11) PPS |

Files:

- [`production_spec.md`](production_spec.md) — **rev B production/reliability spec**: stackup, protection (incl. 5 V OVP eFuse), derating, DFM/DFT, validation plan, and what is still needed to finish the layout
- [`schematic.md`](schematic.md) — block-by-block netlist (what connects to what), values, notes
- [`bom.csv`](bom.csv) — bill of materials with candidate part numbers
- [`floorplan.svg`](floorplan.svg) — board outline, header, mounting holes, block placement
- [`test_hat.py`](test_hat.py) — bring-up script (INA219, LED blink, GPS, HX711)

## Status — read this first

This is a **design specification, not a finished fab-ready PCB**. There is no
KiCad/EDA tooling in this environment, so there are no Gerbers. The next step is
schematic capture + layout from `schematic.md`. Things I could **not** verify
and you must check against datasheets before ordering boards:

1. **Buck IC pinout and passives.** I selected the TI **TPS56C215** (12 A, 18-pin
   3.5 × 3.5 mm HotRod QFN). Search results confirm the part and package, but the
   datasheet itself was not reachable from this session, so the pin table, L/C
   values, MODE-pin options and layout numbers in `schematic.md` are marked
   *"copy from datasheet typical application"* rather than guessed.
   Input range per TI's current page is 3.8–17 V, so 12 V works but a 24 V input would not.
2. **Every MPN in `bom.csv`** is a candidate — confirm footprint, stock and
   electrical limits at order time.
3. **GPS module choice / pin order** — depends on the module you own (see below).

## Decisions I made on your behalf (tell me if any are wrong)

- **"8-bit RGB LED" → WS2812B/SK6812-style addressable RGB LED** (8 bits per colour
  channel). One LED on board plus a 3-pin chain-out header so you can add a strip.
  If you meant a plain common-anode RGB LED or 8 LEDs on board, this block changes.
- **12 V DC input** (regulated, 9–16 V). Same rail feeds the LED MOSFET.
- **INA219 measures the 12 V input** (everything: Pi + LED + accessories), not the 5 V rail.
- **GPS = socket for a commodity breakout** (NEO-M8N/M10, ATGM336H, GY-GPS6MV2 class),
  3.3 V logic, UART at 9600 baud default.
- **HX711 runs from 3.3 V** so DT is 3.3 V logic — no level shifting needed.

## Things that will bite you (important)

### 1. pigpio does not work on the Pi 5
You said "pigpio 18". `pigpio`/`pigpiod`/`RPi.GPIO` rely on the old SoC GPIO
registers; on the Pi 5 the header is on the RP1 chip and they don't work. Use
**`gpiozero` (lgpio backend)**, **`lgpio`**, or the kernel hardware-PWM overlay.
GPIO18 itself is fine — on the Pi 5 the RP1 exposes four PWM0 channels on GPIO12/13/18/19,
so GPIO12 and GPIO18 should be separate channels and the MOSFET (GPIO18) and the RGB LED
(GPIO12) shouldn't fight over one the way they would on a Pi 4. (Sources agree on the
pin list; check the exact channel mapping on your kernel with `pinctrl get 12,18`.) `test_hat.py` uses gpiozero.
([Pi 5 pigpio status](https://discourse.nodered.org/t/migrating-to-pi-5-trouble-with-pigpiod/88762),
[Pi 5 hardware PWM](https://industrialmonitordirect.com/blogs/knowledgebase/raspberry-pi-5-hardware-pwm-4-channel-configuration-guide))

### 2. The WS2812 needs a Pi-5-specific driver
`rpi_ws281x` (PWM/DMA) doesn't work on the Pi 5. Adafruit's PIO-based
`Adafruit-Blinka-Raspberry-Pi5-Neopixel` is the usual route, and it was a release
candidate when I checked. **I could not confirm GPIO12 is on its supported-pin list** —
check its README before committing to GPIO12 (you picked it, so I routed it there; the
schematic has a solder-jumper option to move DIN to GPIO10/SPI MOSI if needed).
Hardware-wise the board adds a 74AHCT1G125 level shifter because 3.3 V data is
marginal for a 5 V WS2812 (VIH = 0.7 × VDD = 3.5 V).

### 3. Powering the Pi 5 from the GPIO pins
- It bypasses the Pi's PMIC/USB-PD negotiation: the Pi won't see a 5 A supply, so
  set `usb_max_current_enable=1` in `config.txt` (and/or `PSU_MAX_CURRENT=5000`
  in the EEPROM) or USB ports are limited. You'll also see a power-supply warning.
- **Never connect USB-C power at the same time** as 12 V on this HAT.
- The Pi 5 tops out around 5 V / 5 A, and the header's 5 V pins (2 + 4) are
  ordinary 2.54 mm pins (~3 A each). So the **10 A buck is oversized for the Pi
  path**; I added a 5 V AUX screw terminal so the remaining capacity is usable
  without going through the header.
- Set the buck to **5.1 V** to offset the header/connector drop.
- Pi 5 undervoltage detection and `vcgencmd` can't see current drawn this way —
  that's partly why the INA219 is useful.
([Pi 5 power notes](https://pip-assets.raspberrypi.com/categories/685-app-notes-guides-whitepapers/documents/RP-009856-WP-1-USB%20Power%20delivery%20on%20Raspberry%20Pi%205.pdf))

### 4. 10 A on a 65 × 56 mm HAT is a thermal problem
50 W out at ~90 % efficiency is ~5.5 W of loss. Plan for a 4-layer board, 2 oz
outer copper if the QFN breakout rules allow (see `production_spec.md` §2), big thermal pours/vias under the buck IC and
inductor, and airflow. Realistically expect to run **5–6 A continuous** without a
fan; 10 A is a peak/short-duration figure unless you validate thermals.

### 5. Indoor GPS on top of a Pi 5 will be weak
GPS signals are already marginal indoors, and the Pi 5 (RP1, USB 3, HDMI) radiates
noise in the 1.575 GHz band. Placement in the floorplan is the corner farthest from
the USB-3/Ethernet side, and the board has a **U.FL for an external active antenna**
on a window or a short cable. Don't expect a good fix from a patch antenna sitting
right on the Pi.

### 6. Pi 5 UART
GPIO14/15 need to be enabled as a UART and the serial login console turned off. On
the Pi 5 that is `dtparam=uart0=on` in `config.txt` plus `raspi-config` → Serial →
console off, login shell **no** — verify against your OS release.

## Power budget

| Rail | Source | Loads | Estimated max |
|---|---|---|---|
| 12 V in | Your supply | buck + LED strip + INA219 shunt | ~4.6 A at 10 A on 5 V + LED current |
| 5.1 V | TPS56C215 buck | Pi 5 (via pins 2 + 4), WS2812s, AUX terminal | Pi ≤ 5 A; total ≤ 10 A (thermals!) |
| 3.3 V | Pi pins 1 and 17 | INA219, HX711, GPS, level logic | ~100–150 mA |
| 12 V LED | 12 V input via fuse | LED strip via MOSFET | ≤ 2 A (AO3400A, PTC fuse) |

Choose a **≥ 6 A** 12 V supply if you intend to use the full 10 A buck.

## INA219 configuration

- Address 0x40 (A0 = A1 = GND). Solder jumpers allow 0x41/0x44/0x45.
- Shunt 10 mΩ, 1 %, ≥ 3 W, 2512, Kelvin-sensed: 46 mV at 4.6 A, 0.21 W dissipated.
- PGA ÷2 (±80 mV → ±8 A), BRNG = 32 V range, 12-bit ADCs → config `0x299F`.
- Current LSB 0.25 mA → calibration register `0x4000`; power LSB 5 mW.
- INA219 bus-voltage range is 0–26 V, so the 12 V rail is fine, but the input TVS must
  clamp below the INA219's 26 V limit.

## Config / OS setup

```
# /boot/firmware/config.txt
dtparam=i2c_arm=on
dtparam=uart0=on                 # GPS on GPIO14/15 (verify for your OS release)
usb_max_current_enable=1         # powered via GPIO 5 V, not USB-PD
# optional: GPS PPS on GPIO17
dtoverlay=pps-gpio,gpiopin=17
```

Then:

```
python3 test_hat.py ina     # voltage / current / power
python3 test_hat.py led     # blink 12 V LED on GPIO18
python3 test_hat.py gps     # print NMEA
python3 test_hat.py hx711   # raw HX711 reading
```

## Bring-up order (do this, don't power everything at once)

1. With no Pi attached, apply 12 V through a current-limited bench supply (0.5 A limit).
   Check input current, then check 5.1 V at the header 5 V pins with a meter.
2. Confirm the 5 V output is stable and unloaded ripple is sane before plugging in a Pi.
3. Check polarity of pins 2/4 vs GND on the header with a meter before mating.
4. Mate to the Pi. Boot. `i2cdetect -y 1` should show `40`.
5. Test LED MOSFET with a resistor/LED before a strip; test WS2812; then GPS; then HX711.

## Next steps I can take

- Capture the schematic and layout in KiCad (needs KiCad installed, or you run it).
- Once the TPS56C215 datasheet is available (paste the pin table / typical application),
  fill in the buck's pin-level netlist and passive values.
- Re-spin for a different GPS module, different RGB LED interpretation, or 24 V input.
