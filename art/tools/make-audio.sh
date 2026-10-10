#!/usr/bin/env bash
# Original SFX + music for Hive Surge, synthesised from math expressions with ffmpeg
# (no samples, no third-party audio). Output: Ogg/Opus mono, 48 kHz.
set -euo pipefail
OUT=public/assets/audio
mkdir -p "$OUT"
enc() { ffmpeg -loglevel error -y -f lavfi -i "aevalsrc=exprs='$2':s=48000:d=$3" -ac 1 -c:a libopus -b:a "${4:-32k}" "$OUT/$1.ogg"; }
# fire: soft "thwup" with falling pitch + breath noise
enc fire "0.5*sin(2*PI*(320*t-900*t*t))*exp(-t*40)+0.08*(random(0)-0.5)*exp(-t*60)" 0.12
# pop: bubbly gate pop (played with playbackRate scaled by swarm size)
enc pop "0.5*sin(2*PI*(600*t+2500*t*t))*exp(-t*35)+0.2*sin(2*PI*1200*t)*exp(-t*60)" 0.12
# thud: nest hit, low body + click
enc thud "0.8*sin(2*PI*(110*t-150*t*t))*exp(-t*18)+0.2*(random(0)-0.5)*exp(-t*80)" 0.25
# hurt: buzzy wasp sting on hive
enc hurt "0.35*(2*mod(170*t-60*t*t,1)-1)*exp(-t*9)*(0.6+0.4*sin(2*PI*30*t))" 0.3
# queen: rising major arpeggio with sparkle
enc queen "0.3*(sin(2*PI*440*t)*between(t,0,0.2)*exp(-(t)*8)+sin(2*PI*554.4*t)*between(t,0.07,0.3)*exp(-(t-0.07)*8)+sin(2*PI*659.3*t)*between(t,0.14,0.5)*exp(-(t-0.14)*6)+0.4*sin(2*PI*1318.5*t)*between(t,0.14,0.5)*exp(-(t-0.14)*9))" 0.5
# win: four-note fanfare
enc win "0.3*(sin(2*PI*523.3*t)*between(t,0,0.3)*exp(-t*5)+sin(2*PI*659.3*t)*between(t,0.11,0.4)*exp(-(t-0.11)*5)+sin(2*PI*784*t)*between(t,0.22,0.6)*exp(-(t-0.22)*4)+sin(2*PI*1046.5*t)*between(t,0.33,1.2)*exp(-(t-0.33)*3))" 1.2
# lose: gentle descending minor
enc lose "0.3*(sin(2*PI*392*t)*between(t,0,0.4)*exp(-t*4)+sin(2*PI*311.1*t)*between(t,0.15,0.6)*exp(-(t-0.15)*4)+sin(2*PI*261.6*t)*between(t,0.3,1.2)*exp(-(t-0.3)*2.5))" 1.2
# hum: seamless 2 s swarm buzz loop (integer cycles: 110 Hz * 2 s, 7 Hz wobble * 2 s)
enc hum "0.25*(2*mod(110*t,1)-1)*(0.7+0.3*sin(2*PI*7*t))+0.1*sin(2*PI*220*t)" 2
# music: 16 s loop, 120 bpm, pentatonic plucks over soft bass (original composition)
# melody: step n = 16th-note index; pentatonic degree k -> semitones floor(k*12/5+0.5) = 0,2,5,7,10
N="floor(mod(t*4,16))"
K="mod($N*3+floor($N/4),5)"
M="0.15*sin(2*PI*t*392*pow(2,floor($K*12/5+0.5)/12))*exp(-mod(t,0.25)*9)+0.12*sin(2*PI*t*98*pow(2,floor(mod(t/2,4))*5/12))*(0.6+0.4*exp(-mod(t,0.5)*4))+0.05*(random(0)-0.5)*exp(-mod(t,0.5)*30)"
enc music "$M" 16 40k
ls -l "$OUT"
