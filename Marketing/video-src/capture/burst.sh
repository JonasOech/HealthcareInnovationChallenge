#!/bin/bash
# burst.sh NAME SECONDS -> shots/NAME/NNNN.png captured as fast as possible
mkdir -p $(dirname $0)/../shots
A=~/.cache/hic-android/sdk/platform-tools/adb; O=$(dirname $0)/../shots/$1; mkdir -p $O/raw; end=$(($(date +%s)+$2)); i=0
while [ $(date +%s) -lt $end ]; do d=$O/raw/$(printf %04d $i); mkdir -p $d; $A emu screenrecord screenshot $d >/dev/null; echo "$i $(date +%s.%N)" >> $O/times.txt; i=$((i+1)); sleep 0.15; done
sleep 1; for d in $O/raw/*; do f=$(ls $d/*.png 2>/dev/null | head -1); [ -n "$f" ] && mv "$f" $O/$(basename $d).png; done; rm -r "${O:?}/raw"; ls $O | wc -l
