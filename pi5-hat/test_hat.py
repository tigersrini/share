#!/usr/bin/env python3
"""Bring-up script for the Pi 5 HAT.

    python3 test_hat.py ina      # INA219 voltage / current / power
    python3 test_hat.py led      # blink the 12 V LED on GPIO18 (MOSFET gate)
    python3 test_hat.py gps      # print raw NMEA from the UART on GPIO14/15
    python3 test_hat.py hx711    # raw HX711 24-bit readings (DT=GPIO5, SCK=GPIO6)

pigpio does NOT work on the Pi 5. This uses gpiozero (lgpio backend), smbus2, pyserial:
    sudo apt install python3-gpiozero python3-lgpio python3-smbus2 python3-serial
"""
import sys
import time

# ---- pin map (BCM numbers) --------------------------------------------------
PIN_LED_GATE = 18
PIN_HX_DT = 5
PIN_HX_SCK = 6
PIN_PPS = 17
UART_DEV = "/dev/ttyAMA0"

# ---- INA219 -----------------------------------------------------------------
INA_ADDR = 0x40
R_SHUNT = 0.010           # ohms
CURRENT_LSB = 0.00025     # 0.25 mA -> full scale ~8.19 A
CAL = int(0.04096 / (CURRENT_LSB * R_SHUNT))   # = 16384 (0x4000)
CONFIG = 0x299F           # 32 V bus range, PGA /2 (+-80 mV), 12-bit ADCs, continuous


def ina_decode(shunt_raw, bus_raw, current_raw):
    """Convert raw register words to (bus_volts, shunt_mV, current_A, power_W)."""
    if shunt_raw & 0x8000:
        shunt_raw -= 0x10000
    if current_raw & 0x8000:
        current_raw -= 0x10000
    bus_v = (bus_raw >> 3) * 0.004
    shunt_mv = shunt_raw * 0.01
    current_a = current_raw * CURRENT_LSB
    return bus_v, shunt_mv, current_a, bus_v * current_a


def ina():
    from smbus2 import SMBus

    def rd(bus, reg):
        w = bus.read_word_data(INA_ADDR, reg)
        return ((w & 0xFF) << 8) | (w >> 8)       # INA219 is big-endian

    def wr(bus, reg, val):
        bus.write_word_data(INA_ADDR, reg, ((val & 0xFF) << 8) | (val >> 8))

    with SMBus(1) as bus:
        wr(bus, 0x00, CONFIG)
        wr(bus, 0x05, CAL)
        while True:
            v, mv, a, w = ina_decode(rd(bus, 0x01), rd(bus, 0x02), rd(bus, 0x04))
            print(f"{v:6.3f} V   shunt {mv:6.2f} mV   {a:6.3f} A   {w:6.2f} W")
            time.sleep(0.5)


def led():
    from gpiozero import PWMLED
    d = PWMLED(PIN_LED_GATE)
    print("Blinking GPIO18 (Ctrl-C to stop)")
    d.blink(on_time=0.5, off_time=0.5)
    try:
        while True:
            time.sleep(1)
    finally:
        d.off()


def gps():
    import serial
    with serial.Serial(UART_DEV, 9600, timeout=2) as s:
        while True:
            line = s.readline().decode("ascii", "replace").strip()
            if line:
                print(line)


def hx711():
    from gpiozero import DigitalInputDevice, DigitalOutputDevice
    dt = DigitalInputDevice(PIN_HX_DT)
    sck = DigitalOutputDevice(PIN_HX_SCK, initial_value=False)
    while True:
        t0 = time.time()
        while dt.value:                       # DT low = conversion ready
            if time.time() - t0 > 1.0:
                print("HX711 not ready (check wiring / 3.3 V)")
                break
            time.sleep(0.001)
        else:
            val = 0
            for _ in range(24):
                sck.on(); sck.off()
                val = (val << 1) | dt.value
            sck.on(); sck.off()               # 25th pulse -> channel A, gain 128
            if val & 0x800000:
                val -= 0x1000000
            print(val)
        time.sleep(0.2)


if __name__ == "__main__":
    cmds = {"ina": ina, "led": led, "gps": gps, "hx711": hx711}
    if len(sys.argv) != 2 or sys.argv[1] not in cmds:
        sys.exit(__doc__)
    cmds[sys.argv[1]]()
