#!/bin/bash

src="icon_512x512.png"
sizes=(16 24 32 48 64 128 192 256 512)

for s in "${sizes[@]}"; do
    convert "$src" -resize "${s}x${s}" "icon_${s}x${s}.png"
done

