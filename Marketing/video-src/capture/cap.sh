#!/bin/bash
# cap.sh NAME  -> host-side emulator screenshot saved as shots/NAME.png
mkdir -p $(dirname $0)/../tmpcap $(dirname $0)/../shots
A=~/.cache/hic-android/sdk/platform-tools/adb; T=$(dirname $0)/../tmpcap
rm -f "${T:?}"/*.png; $A emu screenrecord screenshot $T >/dev/null
for i in $(seq 50); do f=$(ls $T/*.png 2>/dev/null | head -1); [ -n "$f" ] && break; sleep 0.1; done
sleep 0.3; mv "$f" $(dirname $0)/../shots/$1.png && echo saved $1
